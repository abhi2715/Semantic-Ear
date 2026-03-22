const STORAGE_KEY = 'semantic_ear_memories';

/**
 * Load all memories from localStorage
 * @returns {Array} Array of memory objects
 */
export function loadMemories() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const memories = JSON.parse(raw);
        return Array.isArray(memories) ? memories : [];
    } catch (err) {
        console.warn('Failed to load memories from localStorage:', err);
        return [];
    }
}

/**
 * Save all memories to localStorage
 * @param {Array} memories - Array of memory objects
 */
export function saveMemories(memories) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(memories));
    } catch (err) {
        console.warn('Failed to save memories to localStorage:', err);
    }
}

/**
 * Clear all memories from localStorage
 */
export function clearAllMemories() {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
        console.warn('Failed to clear memories from localStorage:', err);
    }
}
