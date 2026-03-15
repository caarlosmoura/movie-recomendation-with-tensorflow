import { View } from './View.js';

export class MovieView extends View {
    #movieList = document.querySelector('#movieList');
    #buttons;
    #movieTemplate;
    #onAddMovie;

    constructor() {
        super();
        this.init();
    }

    async init() {
        this.#movieTemplate = await this.loadTemplate('./src/view/templates/movie-card.html');
    }

    onUserSelected(user) {
        this.setButtonsState(user.id ? false : true);
    }

    registerAddMovieCallback(callback) {
        this.#onAddMovie = callback;
    }

    render(movies, disableButtons = true) {
        if (!this.#movieTemplate) return;

        const html = movies.map((movie) => {
            return this.replaceTemplate(this.#movieTemplate, {
                id: movie.id,
                title: movie.title,
                genres: movie.genres.join(', '),
                year: movie.year,
                rating: movie.rating,
                duration: movie.duration,
                language: movie.language,
                score: movie.score ? movie.score.toFixed(3) : 'catalog',
                movie: JSON.stringify(movie)
            });
        }).join('');

        this.#movieList.innerHTML = html;
        this.attachMovieButtonListeners();
        this.setButtonsState(disableButtons);
    }

    setButtonsState(disabled) {
        if (!this.#buttons) {
            this.#buttons = document.querySelectorAll('.watch-now-btn');
        }

        this.#buttons.forEach((button) => {
            button.disabled = disabled;
        });
    }

    attachMovieButtonListeners() {
        this.#buttons = document.querySelectorAll('.watch-now-btn');
        this.#buttons.forEach((button) => {
            button.addEventListener('click', () => {
                const movie = JSON.parse(button.dataset.movie);
                const originalText = button.innerHTML;

                button.innerHTML = '<i class="bi bi-check-circle-fill"></i> Watched';
                button.classList.remove('btn-primary');
                button.classList.add('btn-success');

                setTimeout(() => {
                    button.innerHTML = originalText;
                    button.classList.remove('btn-success');
                    button.classList.add('btn-primary');
                }, 500);

                this.#onAddMovie(movie, button);
            });
        });
    }
}
