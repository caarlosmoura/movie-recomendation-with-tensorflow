# Movie Recommendation System With Qdrant + TensorFlow

This project is a browser-based movie recommendation demo that replaces the original product catalog with a movie catalog and combines Qdrant vector retrieval with a TensorFlow ranking model.

## What Changed

- Products were replaced with movies.
- Purchase history was replaced with watch history.
- Qdrant is used for top-k vector retrieval.
- TensorFlow is used to learn a ranking model and rerank retrieved candidates.

## Stack

- Vanilla JavaScript
- TensorFlow.js
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

## Prerequisites

- Node.js and npm
- Docker with Docker Compose support
- WSL if you are running the project from Windows and your Docker CLI is available there
- PowerShell 5.1+ or PowerShell 7+ if you want to inspect Qdrant from Windows

## Run

### Linux

```bash
cd /path/to/movie-recomendation-with-tensorflow
docker compose up -d
npm install
npm start
```

### Windows with WSL

Run the project from a WSL terminal, not from PowerShell:

```bash
cd /mnt/c/Users/caarl/source/repos/movie-recomendation-with-tensorflow
docker compose up -d
npm install
npm start
```

Open:

- App: `http://localhost:3000`
- Qdrant API: `http://localhost:6333`

## Stop

To stop only the Qdrant container:

```bash
docker stop movie-recommendation-qdrant
```

To stop the compose stack created by this project:

```bash
docker compose down
```

## Troubleshooting

- Windows PowerShell: if you see `docker: The term 'docker' is not recognized as the name of a cmdlet`, open WSL and run the Docker commands there.
- WSL path: use `/mnt/c/Users/caarl/source/repos/movie-recomendation-with-tensorflow` instead of `C:\Users\caarl\source\repos\movie-recomendation-with-tensorflow`.
- Existing Qdrant container: if `docker compose up -d` reports a container name conflict, start the existing container with `docker start movie-recommendation-qdrant` or remove it before recreating the stack.
- Docker permissions: if WSL shows a permission error when accessing Docker, make sure Docker Desktop is running and integrated with your WSL distribution.
- BrowserSync port: the frontend runs on port `3000` through BrowserSync, so use `npm start` after `npm install`.

## Inspect Qdrant Data

### Linux or WSL

List collections:

```bash
curl -s http://localhost:6333/collections | jq
```

Inspect one collection:

```bash
curl -s http://localhost:6333/collections/movie_recommendations | jq
```

List points from one collection:

```bash
curl -s -X POST http://localhost:6333/collections/movie_recommendations/points/scroll \
  -H "Content-Type: application/json" \
  -d '{"limit": 10, "with_payload": true, "with_vector": false}' | jq
```

List points including vectors:

```bash
curl -s -X POST http://localhost:6333/collections/movie_recommendations/points/scroll \
  -H "Content-Type: application/json" \
  -d '{"limit": 10, "with_payload": true, "with_vector": true}' | jq
```

### Windows PowerShell

Use the helper script in [scripts/qdrant-inspect.ps1](/mnt/c/Users/caarl/source/repos/movie-recomendation-with-tensorflow/scripts/qdrant-inspect.ps1).

List collections:

```powershell
.\scripts\qdrant-inspect.ps1
```

Show collection info and a sample of points:

```powershell
.\scripts\qdrant-inspect.ps1 -CollectionName movie_recommendations
```

Show collection info and include vectors:

```powershell
.\scripts\qdrant-inspect.ps1 -CollectionName movie_recommendations -WithVectors
```

Limit the number of returned points:

```powershell
.\scripts\qdrant-inspect.ps1 -CollectionName movie_recommendations -Limit 3
```

Get a single point by id:

```powershell
.\scripts\qdrant-inspect.ps1 -CollectionName movie_recommendations -PointId 1
```

The script uses `Invoke-RestMethod`, so it can be run from PowerShell even when `docker` is only available through WSL.

## Main Files

- `index.html`: main page and UI shell
- `style.css`: page styling
- `docker-compose.yml`: local Qdrant service definition
- `package.json`: BrowserSync development server configuration
- `scripts/qdrant-inspect.ps1`: PowerShell helper to inspect Qdrant collections and points
- `demo.png`: project screenshot

## Notes

- This project expects `data/` and `src/` to be present locally.
- The PowerShell script is only for inspecting Qdrant data. Use WSL for Docker commands when `docker` is not available in PowerShell.
