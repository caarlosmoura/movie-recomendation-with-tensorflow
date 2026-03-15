import { UserController } from './controller/UserController.js';
import { MovieController } from './controller/MovieController.js';
import { ModelController } from './controller/ModelTrainingController.js';
import { TFVisorController } from './controller/TFVisorController.js';
import { UserService } from './service/UserService.js';
import { MovieService } from './service/MovieService.js';
import { UserView } from './view/UserView.js';
import { MovieView } from './view/MovieView.js';
import { ModelView } from './view/ModelTrainingView.js';
import { TFVisorView } from './view/TFVisorView.js';
import Events from './events/events.js';
import { WorkerController } from './controller/WorkerController.js';

const userService = new UserService();
const movieService = new MovieService();

const userView = new UserView();
const movieView = new MovieView();
const modelView = new ModelView();
const tfVisorView = new TFVisorView();
const recommendationWorker = new Worker('/src/workers/modelTrainingWorker.js', { type: 'module' });

const workerController = WorkerController.init({
    worker: recommendationWorker,
    events: Events
});

ModelController.init({
    modelView,
    userService,
    events: Events,
});

TFVisorController.init({
    tfVisorView,
    events: Events,
});

MovieController.init({
    movieView,
    userService,
    movieService,
    events: Events,
});

const userController = UserController.init({
    userView,
    userService,
    movieService,
    events: Events,
});

const users = await userService.getDefaultUsers();
userController.renderUsers({
    id: 99,
    name: 'Alex Johnson',
    age: 30,
    watchHistory: []
});

workerController.triggerTrain(users);
