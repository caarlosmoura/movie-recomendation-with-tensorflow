# Movie Recommendation System With Qdrant + TensorFlow

This project is a browser-based movie recommendation demo that replaces the original product catalog with a movie catalog and combines Qdrant vector retrieval with a TensorFlow ranking model.

## What Changed

- Products were replaced with movies.
- Purchase history was replaced with watch history.
- Qdrant is used for top-k vector retrieval.
- TensorFlow is used to learn a ranking model and rerank retrieved candidates.

## Stack

- Vanilla JavaScript
- BrowserSync for local development
- Qdrant as the vector database
- Web Worker for indexing and recommendation queries

## Data Model

- `data/movies.json`: movie catalog
- `data/users.json`: users with watch history

Each movie is encoded into a vector using:

- genres
- language
- release year
- rating
- duration

The user profile vector is the average of watched movie vectors. Recommendations first come from Qdrant nearest-neighbor search, then a TensorFlow model reranks the retrieved candidates.

## Run

Start Qdrant:

```bash
docker compose up -d
```

Then start the app:

```bash
npm install
npm start
```

Open `http://localhost:3000`.

## Main Files

- `src/service/QdrantService.js`: Qdrant REST integration
- `src/service/MovieService.js`: movie catalog loader
- `src/workers/modelTrainingWorker.js`: vector index builder, TensorFlow trainer, and recommender
- `src/controller/MovieController.js`: movie catalog and recommendation rendering

## Notes

The recommendation flow still uses the existing UI events named around training and recommendation, but the engine behind it is now Qdrant retrieval plus TensorFlow reranking.
