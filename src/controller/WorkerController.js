import { workerEvents } from "../events/constants.js";

export class WorkerController {
    #worker;
    #events;
    #indexReady = false;
    constructor({ worker, events }) {
        this.#worker = worker;
        this.#events = events;
        this.#indexReady = false;
        this.init();
    }

    async init() {
        this.setupCallbacks();
    }

    static init(deps) {
        return new WorkerController(deps);
    }

    setupCallbacks() {
        this.#events.onTrainModel((data) => {
            this.#indexReady = false;
            this.triggerTrain(data);
        });
        this.#events.onTrainingComplete(() => {
            this.#indexReady = true;
        });

        this.#events.onRecommend((data) => {
            if (!this.#indexReady) return;

            this.triggerRecommend(data);
        });

        this.#worker.onmessage = (event) => {
            if (event.data.type === workerEvents.error) {
                console.error('Worker error:', event.data.message);
            }

            if (event.data.type === workerEvents.trainingLog) {
                this.#events.dispatchTFVisLogs(event.data);
            }

            if (event.data.type === workerEvents.progressUpdate) {
                this.#events.dispatchProgressUpdate(event.data.progress);
            }

            if (event.data.type === workerEvents.trainingComplete) {
                this.#events.dispatchTrainingComplete(event.data);
            }
            if (event.data.type === workerEvents.recommend) {
                this.#events.dispatchRecommendationsReady(event.data);
            }
        };
    }

    triggerTrain(users) {
        this.#worker.postMessage({ action: workerEvents.trainModel, users });
    }

    triggerRecommend(user) {
        this.#worker.postMessage({ action: workerEvents.recommend, user });
    }
}
