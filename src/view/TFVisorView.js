import { View } from './View.js';

export class TFVisorView extends View {
    #lossPoints = [];
    #accPoints = [];
    #isVisOpen = false;

    resetDashboard() {
        this.#lossPoints = [];
        this.#accPoints = [];
    }

    handleTrainingLog(log) {
        const tfvis = globalThis.tfvis;
        if (!tfvis) {
            console.error('tfjs-vis is not available on window/globalThis');
            return;
        }

        if (!this.#isVisOpen) {
            tfvis.visor().open();
            this.#isVisOpen = true;
        }

        const { epoch, loss, accuracy } = log;
        this.#lossPoints.push({ x: epoch, y: loss });
        this.#accPoints.push({ x: epoch, y: accuracy });

        tfvis.render.linechart(
            {
                name: 'Model Accuracy',
                tab: 'Training',
                style: { display: 'inline-block', width: '49%' }
            },
            { values: this.#accPoints, series: ['accuracy'] },
            {
                xLabel: 'Epoch',
                yLabel: 'Accuracy',
                height: 300
            }
        );

        tfvis.render.linechart(
            {
                name: 'Training Loss',
                tab: 'Training',
                style: { display: 'inline-block', width: '49%' }
            },
            { values: this.#lossPoints, series: ['loss'] },
            {
                xLabel: 'Epoch',
                yLabel: 'Loss',
                height: 300
            }
        );
    }
}
