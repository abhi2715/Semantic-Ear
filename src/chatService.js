import { searchMemories } from './searchService';

/**
 * Memory-aware chatbot service.
 * Parses user questions, searches memories, and generates conversational responses.
 */

// Intent patterns for classifying user questions
const INTENT_PATTERNS = [
    { intent: 'count', patterns: ['how many', 'how much', 'count', 'total', 'number of'] },
    { intent: 'when', patterns: ['when did', 'when was', 'what time', 'last time', 'what day'] },
    { intent: 'what', patterns: ['what did', 'what was', 'what is', 'what are', 'tell me about', 'what do you know'] },
    { intent: 'who', patterns: ['who did', 'who was', 'who is', 'who are'] },
    { intent: 'where', patterns: ['where did', 'where was', 'where is'] },
    { intent: 'list', patterns: ['list all', 'show me', 'give me', 'show all', 'find all', 'list my'] },
    { intent: 'summary', patterns: ['summarize', 'summary', 'overview', 'recap', 'highlight'] },
    { intent: 'category', patterns: ['category', 'categories', 'what type', 'what kind'] },
    { intent: 'recent', patterns: ['recent', 'latest', 'last', 'newest', 'most recent'] },
    { intent: 'greeting', patterns: ['hello', 'hi', 'hey', 'good morning', 'good evening', 'sup', 'yo'] },
    { intent: 'help', patterns: ['help', 'what can you do', 'how do i', 'what should'] },
];

/**
 * Detect the intent of a user message
 */
function detectIntent(message) {
    const lower = message.toLowerCase().trim();

    for (const { intent, patterns } of INTENT_PATTERNS) {
        for (const pattern of patterns) {
            if (lower.includes(pattern)) {
                return intent;
            }
        }
    }

    return 'search'; // Default: treat as a search query
}

/**
 * Format a relative time string from a timestamp
 */
function timeAgo(ts) {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days} days ago`;
    return `${Math.floor(days / 7)} weeks ago`;
}

/**
 * Generate a chatbot response based on user message and stored memories.
 * @param {string} message - User's chat message
 * @param {Array} memories - All stored memories
 * @returns {{ text: string, relatedMemories: Array }}
 */
export function generateChatResponse(message, memories) {
    const intent = detectIntent(message);
    const results = searchMemories(message, memories);
    const topResults = results.slice(0, 5);

    // --- Handle special intents ---

    if (intent === 'greeting') {
        const memCount = memories.length;
        return {
            text: memCount > 0
                ? `Hey Abhi! 👋 How's it going? I'm your memory sidekick always here to help. You've got **${memCount}** memories stored with me. Ask me anything you want to remember — like "Who do I like going to college with?" or "Summarize my week". Let's chat!`
                : `Oh hey Abhi! 👋 I'm your new memory assistant. Looks like we haven't made any memories together yet. Tap that mic to start recording, and then we can chat about whatever you tell me!`,
            relatedMemories: []
        };
    }

    if (intent === 'help') {
        return {
            text: `Here's what I can help with:\n\n` +
                `🔍 **Search** — "What do I know about coffee?"\n` +
                `📊 **Count** — "How many food memories do I have?"\n` +
                `🕐 **When** — "When did I last go to the gym?"\n` +
                `📋 **List** — "Show me all my work memories"\n` +
                `📝 **Summarize** — "Summarize my recent memories"\n` +
                `🏷️ **Category** — "What categories do I have?"\n\n` +
                `Just ask naturally — I'll search through your memories!`,
            relatedMemories: []
        };
    }

    if (memories.length === 0) {
        return {
            text: `Hold on Abhi, we don't have any memories saved yet! 🎙️ Click the microphone above to tell me what's on your mind. Once you record something, I'll be able to totally answer your questions.`,
            relatedMemories: []
        };
    }

    // --- Category intent ---
    if (intent === 'category') {
        const catCount = {};
        memories.forEach(m => {
            catCount[m.category] = (catCount[m.category] || 0) + 1;
        });
        const sorted = Object.entries(catCount).sort(([, a], [, b]) => b - a);
        const catList = sorted.map(([cat, count]) => `• **${cat}** (${count})`).join('\n');
        return {
            text: `📂 Here are your memory categories:\n\n${catList}\n\nAsk me about any category for more details!`,
            relatedMemories: []
        };
    }

    // --- Count intent ---
    if (intent === 'count') {
        if (topResults.length > 0) {
            return {
                text: `I found **${topResults.length}** memories matching that. You have **${memories.length}** total memories.`,
                relatedMemories: topResults.map(r => r.memory)
            };
        }
        // Check if asking about a category
        const lower = message.toLowerCase();
        const catCount = {};
        memories.forEach(m => { catCount[m.category] = (catCount[m.category] || 0) + 1; });
        for (const [cat, count] of Object.entries(catCount)) {
            if (lower.includes(cat)) {
                return {
                    text: `You have **${count}** memories in the **${cat}** category, out of **${memories.length}** total.`,
                    relatedMemories: memories.filter(m => m.category === cat).slice(0, 3)
                };
            }
        }
        return {
            text: `You have **${memories.length}** total memories across ${Object.keys(catCount).length} categories.`,
            relatedMemories: []
        };
    }

    // --- Recent intent ---
    if (intent === 'recent') {
        const recent = memories.slice(0, 3);
        const summaries = recent.map((m, i) =>
            `${i + 1}. ${m.summary || m.text.slice(0, 60)} _(${timeAgo(m.timestamp)})_`
        ).join('\n');

        return {
            text: `📝 Here are your most recent memories:\n\n${summaries}`,
            relatedMemories: recent
        };
    }

    // --- Summary intent ---
    if (intent === 'summary') {
        const catCount = {};
        memories.forEach(m => { catCount[m.category] = (catCount[m.category] || 0) + 1; });
        const topCat = Object.entries(catCount).sort(([, a], [, b]) => b - a)[0];
        const recent = memories.slice(0, 3);
        const recentText = recent.map(m => `• ${m.summary || m.text.slice(0, 50)}`).join('\n');

        return {
            text: `📊 **Memory Summary**\n\n` +
                `You have **${memories.length}** memories. ` +
                `Your most active category is **${topCat[0]}** with ${topCat[1]} memories.\n\n` +
                `**Recent highlights:**\n${recentText}`,
            relatedMemories: recent
        };
    }

    // --- When intent ---
    if (intent === 'when' && topResults.length > 0) {
        const best = topResults[0].memory;
        const time = timeAgo(best.timestamp);
        const date = new Date(best.timestamp).toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
        return {
            text: `🕐 The most relevant memory was from **${time}** (${date}):\n\n> "${best.text.slice(0, 120)}${best.text.length > 120 ? '...' : ''}"`,
            relatedMemories: [best]
        };
    }

    // --- Who intent ---
    if (intent === 'who' && topResults.length > 0) {
        const people = new Set();
        topResults.forEach(r => {
            (r.memory.entities?.people || []).forEach(p => people.add(p));
        });
        if (people.size > 0) {
            return {
                text: `Ohh hey Abhi! Let me check... yep, according to what you told me earlier, the people involved here are: **${[...people].join(', ')}**. Here's the related memory blocks in your data I found:`,
                relatedMemories: topResults.map(r => r.memory)
            };
        }
    }

    // --- Where intent ---
    if (intent === 'where' && topResults.length > 0) {
        const places = new Set();
        topResults.forEach(r => {
            (r.memory.entities?.places || []).forEach(p => places.add(p));
        });
        if (places.size > 0) {
            return {
                text: `📍 Based on your memories, the places mentioned are: **${[...places].join(', ')}**`,
                relatedMemories: topResults.map(r => r.memory)
            };
        }
    }

    // --- Default: search-based response ---
    if (topResults.length > 0) {
        const best = topResults[0].memory;
        
        const peopleList = best.entities?.people || [];
        const topicList = best.entities?.topics || [];
        
        // Conversational human-like intro
        let intro = "Ohh hey Abhi! Let me dig into your memories... Ah, got it! ";
        
        if (peopleList.length > 0 && topicList.length > 0) {
            intro += `It looks like you were talking about ${topicList[0]} with ${peopleList[0]}. `;
        } else if (peopleList.length > 0) {
            intro += `It seems you were hanging out with or talking about ${peopleList.join(' and ')}. `;
        } else if (topicList.length > 0) {
            intro += `Looks like this is mainly about ${topicList[0]}. `;
        }
        
        intro += "Here's the memory block related to your data that I found:";

        let response = `${intro}\n\n> "${best.text}"` +
            `\n\n_(Recorded in your **${best.category}** notes ${timeAgo(best.timestamp)} ago)_`;

        if (topResults.length > 1) {
            response += `\n\nBy the way, I also found ${topResults.length - 1} other related memories! Check them out below.`;
        }

        return {
            text: response,
            relatedMemories: topResults.map(r => r.memory)
        };
    }

    // No results
    return {
        text: `🤔 Hmm, sorry Abhi, I couldn't find any memories related to "${message}". Maybe try asking about it in a different way or double-check you recorded it?`,
        relatedMemories: []
    };
}
