export class QdrantService {
    constructor({
        baseUrl = 'http://localhost:6333',
        collectionName = 'movie_recommendations'
    } = {}) {
        this.baseUrl = baseUrl.replace(/\/$/, '');
        this.collectionName = collectionName;
    }

    async ensureCollection(vectorSize) {
        await fetch(`${this.baseUrl}/collections/${this.collectionName}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                vectors: {
                    size: vectorSize,
                    distance: 'Cosine'
                }
            })
        });
    }

    async upsert(points) {
        const response = await fetch(`${this.baseUrl}/collections/${this.collectionName}/points?wait=true`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ points })
        });

        if (!response.ok) {
            throw new Error(`Qdrant upsert failed with status ${response.status}`);
        }
    }

    async search(vector, { limit = 8, excludeIds = [] } = {}) {
        const filter = excludeIds.length ? {
            must_not: [
                {
                    has_id: excludeIds
                }
            ]
        } : undefined;

        const response = await fetch(`${this.baseUrl}/collections/${this.collectionName}/points/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                vector,
                limit,
                with_payload: true,
                with_vector: true,
                filter
            })
        });

        if (!response.ok) {
            throw new Error(`Qdrant search failed with status ${response.status}`);
        }

        const data = await response.json();
        return data.result || [];
    }
}
