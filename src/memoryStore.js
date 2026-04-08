import { getCurrentUser } from './authService';

/**
 * Get the storage key for the current user to isolate memories.
 */
const getStorageKey = () => {
    const user = getCurrentUser();
    return user ? `semantic_ear_memories_${user.id}` : 'semantic_ear_memories_guest';
};

/**
 * Load all memories from localStorage for the active user
 * @returns {Array} Array of memory objects
 */
export function loadMemories() {
    try {
        const raw = localStorage.getItem(getStorageKey());
        if (!raw) return [];
        const memories = JSON.parse(raw);
        return Array.isArray(memories) ? memories : [];
    } catch (err) {
        console.warn('Failed to load memories from localStorage:', err);
        return [];
    }
}

/**
 * Save all memories to localStorage for the active user
 * @param {Array} memories - Array of memory objects
 */
export function saveMemories(memories) {
    try {
        localStorage.setItem(getStorageKey(), JSON.stringify(memories));
    } catch (err) {
        console.warn('Failed to save memories to localStorage:', err);
    }
}

/**
 * Clear all memories from localStorage for the active user
 */
export function clearAllMemories() {
    try {
        localStorage.removeItem(getStorageKey());
    } catch (err) {
        console.warn('Failed to clear memories from localStorage:', err);
    }
}
