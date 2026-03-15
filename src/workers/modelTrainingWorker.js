import * as tf from 'https://esm.sh/@tensorflow/tfjs@4.22.0';
import { workerEvents } from '../events/constants.js';
import { QdrantService } from '../service/QdrantService.js';

const WEIGHTS = {
    year: 0.1,
    rating: 0.2,
    duration: 0.1,
    audienceAge: 0.15,
    genres: 0.3,
    language: 0.15
};

const QDRANT = new QdrantService();

let _context = null;
let _model = null;

function normalize(value, min, max) {
    return (value - min) / ((max - min) || 1);
}

function averageVectors(vectors) {
    if (!vectors.length) {
        return [];
    }

    const totals = new Array(vectors[0].length).fill(0);
    vectors.forEach((vector) => {
        vector.forEach((value, index) => {
            totals[index] += value;
        });
    });

    return totals.map((value) => value / vectors.length);
}

function buildContext(movies, users) {
    const years = movies.map((movie) => movie.year);
    const ratings = movies.map((movie) => movie.rating);
    const durations = movies.map((movie) => movie.duration);
    const ages = users.map((user) => user.age);
    const genres = [...new Set(movies.flatMap((movie) => movie.genres))];
    const languages = [...new Set(movies.map((movie) => movie.language))];

    const ageSums = {};
    const ageCounts = {};

    users.forEach((user) => {
        (user.watchHistory || []).forEach((movie) => {
            ageSums[movie.id] = (ageSums[movie.id] || 0) + user.age;
            ageCounts[movie.id] = (ageCounts[movie.id] || 0) + 1;
        });
    });

    return {
        movies,
        users,
        genres,
        languages,
        minYear: Math.min(...years),
        maxYear: Math.max(...years),
        minRating: Math.min(...ratings),
        maxRating: Math.max(...ratings),
        minDuration: Math.min(...durations),
        maxDuration: Math.max(...durations),
        minAge: Math.min(...ages),
        maxAge: Math.max(...ages),
        ageSums,
        ageCounts
    };
}

function encodeMovie(movie, context) {
    const averageAudienceAge = context.ageCounts[movie.id]
        ? context.ageSums[movie.id] / context.ageCounts[movie.id]
        : (context.minAge + context.maxAge) / 2;

    const genreVector = context.genres.map((genre) => (
        movie.genres.includes(genre)
            ? WEIGHTS.genres / context.genres.length
            : 0
    ));

    const languageVector = context.languages.map((language) => (
        movie.language === language
            ? WEIGHTS.language
            : 0
    ));

    return [
        normalize(movie.year, context.minYear, context.maxYear) * WEIGHTS.year,
        normalize(movie.rating, context.minRating, context.maxRating) * WEIGHTS.rating,
        normalize(movie.duration, context.minDuration, context.maxDuration) * WEIGHTS.duration,
        normalize(averageAudienceAge, context.minAge, context.maxAge) * WEIGHTS.audienceAge,
        ...genreVector,
        ...languageVector
    ];
}

function encodeUser(user, context) {
    const watched = user.watchHistory || [];
    if (!watched.length) {
        const averageMovieVector = averageVectors(context.movieEntries.map((entry) => entry.vector));
        averageMovieVector[3] = normalize(user.age, context.minAge, context.maxAge) * WEIGHTS.audienceAge;
        return averageMovieVector;
    }

    const vectors = watched.map((movie) => encodeMovie(movie, context));
    const averaged = averageVectors(vectors);
    averaged[3] = normalize(user.age, context.minAge, context.maxAge) * WEIGHTS.audienceAge;
    return averaged;
}

function createTrainingData(context) {
    const inputs = [];
    const labels = [];

    context.users
        .filter((user) => (user.watchHistory || []).length)
        .forEach((user) => {
            const userVector = encodeUser(user, context);
            const watchedIds = new Set(user.watchHistory.map((movie) => movie.id));

            context.movieEntries.forEach((entry) => {
                inputs.push([...userVector, ...entry.vector]);
                labels.push(watchedIds.has(entry.id) ? 1 : 0);
            });
        });

    return {
        xs: tf.tensor2d(inputs),
        ys: tf.tensor2d(labels, [labels.length, 1]),
        inputDimension: context.movieEntries[0].vector.length * 2
    };
}

async function trainRankingModel(trainData) {
    const model = tf.sequential();

    model.add(tf.layers.dense({
        inputShape: [trainData.inputDimension],
        units: 64,
        activation: 'relu'
    }));

    model.add(tf.layers.dense({
        units: 32,
        activation: 'relu'
    }));

    model.add(tf.layers.dense({
        units: 1,
        activation: 'sigmoid'
    }));

    model.compile({
        optimizer: tf.train.adam(0.01),
        loss: 'binaryCrossentropy',
        metrics: ['accuracy']
    });

    postMessage({
        type: workerEvents.trainingLog,
        epoch: -1,
        loss: 0,
        accuracy: 0
    });

    await model.fit(trainData.xs, trainData.ys, {
        epochs: 30,
        batchSize: 16,
        shuffle: true,
        callbacks: {
            onEpochEnd: (epoch, logs) => {
                postMessage({
                    type: workerEvents.trainingLog,
                    epoch,
                    loss: logs.loss,
                    accuracy: logs.acc ?? logs.accuracy ?? 0
                });
                postMessage({
                    type: workerEvents.progressUpdate,
                    progress: { progress: Math.min(95, 20 + epoch * 2) }
                });
            }
        }
    });

    trainData.xs.dispose();
    trainData.ys.dispose();
    return model;
}

async function buildVectorIndex({ users }) {
    try {
        postMessage({ type: workerEvents.progressUpdate, progress: { progress: 5 } });
        const movies = await (await fetch('/data/movies.json')).json();
        const context = buildContext(movies, users);

        context.movieEntries = movies.map((movie) => ({
            id: movie.id,
            payload: movie,
            vector: encodeMovie(movie, context)
        }));

        postMessage({ type: workerEvents.progressUpdate, progress: { progress: 15 } });
        await QDRANT.ensureCollection(context.movieEntries[0].vector.length);
        await QDRANT.upsert(context.movieEntries.map((entry) => ({
            id: entry.id,
            vector: entry.vector,
            payload: entry.payload
        })));

        const trainData = createTrainingData(context);
        _model = await trainRankingModel(trainData);
        _context = context;

        postMessage({ type: workerEvents.progressUpdate, progress: { progress: 100 } });
        postMessage({ type: workerEvents.trainingComplete });
    } catch (error) {
        postMessage({
            type: workerEvents.error,
            message: error.message
        });
    }
}

function rerankRecommendations(userVector, qdrantResults) {
    const inputs = qdrantResults.map((result) => [...userVector, ...result.vector]);
    const inputTensor = tf.tensor2d(inputs);
    const predictions = _model.predict(inputTensor);
    const scores = Array.from(predictions.dataSync());

    inputTensor.dispose();
    predictions.dispose();

    return qdrantResults
        .map((result, index) => ({
            ...result.payload,
            vectorScore: result.score,
            score: scores[index]
        }))
        .sort((left, right) => right.score - left.score);
}

async function recommend({ user }) {
    if (!_context || !_model) {
        return;
    }

    try {
        const watchedIds = (user.watchHistory || []).map((movie) => movie.id);
        const userVector = encodeUser(user, _context);
        const candidates = await QDRANT.search(userVector, {
            limit: 8,
            excludeIds: watchedIds
        });

        const recommendations = rerankRecommendations(userVector, candidates);

        postMessage({
            type: workerEvents.recommend,
            user,
            recommendations
        });
    } catch (error) {
        postMessage({
            type: workerEvents.error,
            message: error.message
        });
    }
}

const handlers = {
    [workerEvents.trainModel]: buildVectorIndex,
    [workerEvents.recommend]: recommend
};

self.onmessage = (event) => {
    const { action, ...data } = event.data;
    if (handlers[action]) {
        handlers[action](data);
    }
};
