/**
 * Search memories with fuzzy word-level matching and relevance scoring.
 * Returns all matches sorted by relevance score.
 *
 * @param {string} query - The search query
 * @param {Array} memories - Array of memory objects
 * @returns {Array} Sorted array of { memory, score } objects
 */
export function searchMemories(query, memories) {
    if (!query || query.trim().length === 0 || !memories || memories.length === 0) {
        return [];
    }

    const queryWords = tokenize(query);
    if (queryWords.length === 0) return [];

    const results = [];

    for (const memory of memories) {
        const score = calculateRelevanceScore(queryWords, memory);
        if (score > 0) {
            results.push({ memory, score });
        }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    return results;
}

/**
 * Tokenize a string into lowercase words, filtering out stopwords
 */
function tokenize(text) {
    const STOPWORDS = new Set([
        'the', 'a', 'an', 'is', 'was', 'are', 'were', 'be', 'been', 'being',
        'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
        'should', 'may', 'might', 'shall', 'can', 'to', 'of', 'in', 'for',
        'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
        'before', 'after', 'above', 'below', 'and', 'but', 'or', 'nor',
        'not', 'so', 'yet', 'both', 'either', 'neither', 'each', 'every',
        'all', 'any', 'few', 'more', 'most', 'other', 'some', 'no',
        'it', 'its', 'my', 'your', 'his', 'her', 'our', 'their', 'this',
        'that', 'these', 'those', 'i', 'me', 'we', 'us', 'you', 'he',
        'she', 'they', 'them', 'what', 'which', 'who', 'whom', 'how',
        'just', 'very', 'really', 'also', 'too', 'much', 'many'
    ]);

    return text
        .toLowerCase()
        .replace(/[^\w\s]/g, '') // Remove punctuation
        .split(/\s+/)
        .filter(word => word.length > 1 && !STOPWORDS.has(word));
}

/**
 * Calculate a relevance score for a memory against query words
 */
function calculateRelevanceScore(queryWords, memory) {
    let score = 0;
    const memoryText = memory.text.toLowerCase();
    const memoryWords = tokenize(memory.text);
    const memoryTags = (memory.tags || []).map(t => t.toLowerCase());
    const memoryCategory = (memory.category || '').toLowerCase();

    for (const qWord of queryWords) {
        // Exact word match in text (highest value)
        if (memoryWords.includes(qWord)) {
            score += 10;
        }
        // Partial/substring match in text
        else if (memoryText.includes(qWord)) {
            score += 5;
        }
        // Fuzzy match — check if any memory word starts with the query word
        else {
            for (const mWord of memoryWords) {
                if (mWord.startsWith(qWord) || qWord.startsWith(mWord)) {
                    score += 3;
                    break;
                }
            }
        }

        // Tag match (high value)
        for (const tag of memoryTags) {
            if (tag === qWord) {
                score += 8;
            } else if (tag.includes(qWord) || qWord.includes(tag)) {
                score += 4;
            }
        }

        // Category match
        if (memoryCategory === qWord || memoryCategory.includes(qWord)) {
            score += 6;
        }
    }

    return score;
}
