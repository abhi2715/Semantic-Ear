import nlp from 'compromise';
import Sentiment from 'sentiment';

const sentimentAnalyzer = new Sentiment();

// Category keywords for classification
const CATEGORY_KEYWORDS = {
  food: ['food', 'eat', 'ate', 'eating', 'restaurant', 'cafe', 'coffee', 'tea', 'lunch', 'dinner',
    'breakfast', 'snack', 'cook', 'cooked', 'cooking', 'recipe', 'meal', 'pizza', 'burger',
    'biryani', 'pasta', 'sushi', 'noodles', 'rice', 'chicken', 'fish', 'drink', 'juice',
    'smoothie', 'ice cream', 'cake', 'dessert', 'bakery', 'delicious', 'tasty', 'yummy',
    'hungry', 'thirsty', 'order', 'ordered', 'dine', 'dining', 'takeout', 'delivery'],
  meeting: ['meeting', 'meet', 'met', 'call', 'conference', 'presentation', 'discussion',
    'interview', 'sync', 'standup', 'agenda', 'scheduled', 'zoom', 'teams', 'slack',
    'client', 'manager', 'boss', 'colleague', 'coworker'],
  work: ['work', 'working', 'project', 'deadline', 'office', 'task', 'assignment', 'email',
    'report', 'review', 'code', 'coding', 'deploy', 'release', 'bug', 'fix', 'design',
    'strategy', 'planning', 'quarterly', 'annual', 'budget', 'proposal'],
  reminder: ['remind', 'reminder', 'remember', 'need to', 'have to', 'must', 'should',
    'don\'t forget', 'todo', 'to-do', 'buy', 'pick up', 'grab', 'get', 'pay', 'bill',
    'appointment', 'schedule', 'due', 'deadline'],
  fitness: ['gym', 'exercise', 'workout', 'run', 'running', 'jog', 'jogging', 'walk',
    'walking', 'swim', 'swimming', 'yoga', 'stretch', 'weights', 'push-ups', 'pull-ups',
    'squat', 'bench', 'cardio', 'calories', 'fitness', 'healthy', 'muscle', 'training'],
  personal: ['family', 'friend', 'friends', 'mom', 'dad', 'brother', 'sister', 'wife',
    'husband', 'birthday', 'anniversary', 'gift', 'party', 'celebration', 'love',
    'relationship', 'date', 'dating', 'wedding', 'baby', 'kids', 'children'],
  travel: ['travel', 'trip', 'flight', 'hotel', 'vacation', 'holiday', 'beach', 'mountain',
    'city', 'country', 'passport', 'luggage', 'airport', 'train', 'bus', 'drive',
    'road trip', 'sightseeing', 'tourist', 'explore', 'adventure'],
  learning: ['learn', 'learning', 'study', 'studying', 'course', 'class', 'lecture',
    'tutorial', 'book', 'read', 'reading', 'research', 'practice', 'skill', 'knowledge',
    'university', 'college', 'school', 'education', 'exam', 'test'],
  moment: ['beautiful', 'amazing', 'wonderful', 'stunning', 'incredible', 'awesome',
    'sunset', 'sunrise', 'view', 'scenery', 'peaceful', 'calm', 'relaxing', 'happy',
    'joy', 'excited', 'grateful', 'thankful', 'memory', 'experience'],
  achievement: ['achieved', 'accomplished', 'completed', 'finished', 'won', 'success',
    'milestone', 'goal', 'finally', 'proud', 'celebration', 'breakthrough', 'record',
    'personal best', 'first time', 'promotion', 'raise', 'award'],
  discovery: ['discovered', 'found', 'new', 'interesting', 'cool', 'unique', 'hidden',
    'secret', 'spot', 'place', 'store', 'shop', 'bookstore', 'market', 'recommend',
    'suggestion', 'try', 'tried']
};

/**
 * Analyze text using compromise.js NLP and return extracted entities and tags.
 * @param {string} text - The transcribed speech text
 * @returns {{ tags: string[], category: string, entities: object }}
 */
export function analyzeText(text) {
  if (!text || text.trim().length === 0) {
    return { tags: [], category: 'general', entities: {} };
  }

  const doc = nlp(text);
  const tags = new Set();
  const entities = {
    people: [],
    places: [],
    dates: [],
    nouns: [],
    verbs: [],
    topics: []
  };

  // --- Extract entities with safety wrappers (compromise API can vary by version) ---

  // Extract people names
  try {
    const people = doc.people().out('array');
    people.forEach(person => {
      const cleaned = person.trim();
      if (cleaned.length > 1) {
        entities.people.push(cleaned);
        tags.add(cleaned.toLowerCase());
        tags.add('person');
      }
    });
  } catch (e) { console.warn('[NLP] people extraction failed:', e); }

  // Extract places
  try {
    const places = doc.places().out('array');
    places.forEach(place => {
      const cleaned = place.trim();
      if (cleaned.length > 1) {
        entities.places.push(cleaned);
        tags.add(cleaned.toLowerCase());
        tags.add('place');
      }
    });
  } catch (e) { console.warn('[NLP] places extraction failed:', e); }

  // Extract dates/times (compromise v14 uses .match() instead of .dates())
  try {
    const dates = doc.match('#Date+').out('array');
    dates.forEach(date => {
      entities.dates.push(date.trim());
      tags.add('time');
    });
  } catch (e) { console.warn('[NLP] dates extraction failed:', e); }

  // Extract important nouns (topics)
  try {
    const nouns = doc.nouns().out('array');
    nouns.forEach(noun => {
      const cleaned = noun.trim().toLowerCase();
      if (cleaned.length > 2 && !['the', 'this', 'that', 'there', 'here', 'also'].includes(cleaned)) {
        entities.nouns.push(cleaned);
        if (entities.topics.length < 5) {
          entities.topics.push(cleaned);
          tags.add(cleaned);
        }
      }
    });
  } catch (e) { console.warn('[NLP] nouns extraction failed:', e); }

  // Extract key verbs for activity detection
  try {
    const verbs = doc.verbs().out('array');
    verbs.forEach(verb => {
      const cleaned = verb.trim().toLowerCase();
      if (cleaned.length > 2 && !['is', 'was', 'are', 'were', 'has', 'have', 'had', 'been',
        'being', 'will', 'would', 'could', 'should', 'can', 'may', 'might', 'shall',
        'does', 'did', 'got', 'get'].includes(cleaned)) {
        entities.verbs.push(cleaned);
      }
    });
  } catch (e) { console.warn('[NLP] verbs extraction failed:', e); }

  // Determine category
  const category = detectCategory(text, entities);
  tags.add(category);

  // Sentiment Analysis
  const sentimentResult = sentimentAnalyzer.analyze(text);
  const sentimentScore = sentimentResult.score;
  let sentimentLabel = 'Neutral';
  if (sentimentScore > 0) sentimentLabel = 'Positive';
  if (sentimentScore < 0) sentimentLabel = 'Negative';

  // Task Detection
  let isTask = category === 'reminder';
  const lowerText = text.toLowerCase().trim();
  if (lowerText.startsWith('remind me') || lowerText.startsWith('i need to') || lowerText.startsWith('buy ') || lowerText.includes('add to my todo')) {
    isTask = true;
  }

  return {
    tags: Array.from(tags).slice(0, 8),
    category,
    entities,
    sentiment: { score: sentimentScore, label: sentimentLabel },
    isTask
  };
}

/**
 * Detect the best category for the text based on keyword matching
 */
function detectCategory(text, entities) {
  const lowerText = text.toLowerCase();
  const scores = {};

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        score += 1;
        // Bonus points for longer/more specific keywords
        if (keyword.length > 5) score += 0.5;
      }
    }
    // Boost score if entities match the category
    if (category === 'meeting' && entities.people.length > 0) score += 1;
    if (category === 'travel' && entities.places.length > 0) score += 1;
    if (category === 'reminder' && entities.dates.length > 0) score += 0.5;

    scores[category] = score;
  }

  // Find the highest scoring category
  let bestCategory = 'general';
  let bestScore = 0;
  for (const [category, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  return bestScore > 0 ? bestCategory : 'general';
}

/**
 * Generate a human-readable relative time string
 */
export function getRelativeTime(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);

  if (seconds < 10) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (weeks === 1) return '1 week ago';
  return `${weeks} weeks ago`;
}

/**
 * Generate a concise one-line summary from extracted entities.
 * @param {string} text - Original text
 * @param {string} category - Detected category
 * @param {object} entities - Extracted entities
 * @returns {string} A short summary string
 */
export function generateSummary(text, category, entities) {
  const parts = [];

  // Category-based prefix
  const prefixes = {
    food: '🍽️ Food note',
    meeting: '📋 Meeting',
    work: '💼 Work',
    reminder: '📌 Reminder',
    fitness: '💪 Fitness',
    personal: '❤️ Personal',
    travel: '✈️ Travel',
    learning: '📚 Learning',
    moment: '✨ Moment',
    achievement: '🏆 Achievement',
    discovery: '🔍 Discovery',
    general: '💭 Note'
  };

  parts.push(prefixes[category] || prefixes.general);

  // Add people
  if (entities.people && entities.people.length > 0) {
    parts.push(`with ${entities.people.slice(0, 2).join(' & ')}`);
  }

  // Add key topics
  if (entities.topics && entities.topics.length > 0) {
    const topTopics = entities.topics.slice(0, 2).join(', ');
    parts.push(`about ${topTopics}`);
  }

  // Add places
  if (entities.places && entities.places.length > 0) {
    parts.push(`at ${entities.places[0]}`);
  }

  return parts.join(' ');
}

/**
 * Tokenize text into individual words with POS tags and root/base forms.
 * Gives a "behind the scenes" peek at how the NLP engine processes text.
 * @param {string} text
 * @returns {Array<{text: string, root: string, pos: string, tag: string}>}
 */
export function tokenizeText(text) {
  if (!text || text.trim().length === 0) return [];

  try {
    const doc = nlp(text);
    const tokens = [];

    doc.terms().forEach((term) => {
      const word = term.text('text');
      const root = term.text('root') || word;
      // Get the most descriptive tag
      const tagList = term.json()?.[0]?.terms?.[0]?.tags || [];
      const tagArr = Array.isArray(tagList) ? tagList : Object.keys(tagList || {});

      // Pick the most meaningful POS tag
      let pos = 'word';
      let tag = 'Word';
      const tagSet = new Set(tagArr.map(t => t.toLowerCase()));

      if (tagSet.has('person') || tagSet.has('firstname') || tagSet.has('lastname')) {
        pos = 'person'; tag = 'Person';
      } else if (tagSet.has('place') || tagSet.has('city') || tagSet.has('country') || tagSet.has('region')) {
        pos = 'place'; tag = 'Place';
      } else if (tagSet.has('verb') || tagSet.has('infinitive') || tagSet.has('pastverb') || tagSet.has('presenttense')) {
        pos = 'verb'; tag = 'Verb';
      } else if (tagSet.has('noun') || tagSet.has('singular') || tagSet.has('plural')) {
        pos = 'noun'; tag = 'Noun';
      } else if (tagSet.has('adjective') || tagSet.has('comparable')) {
        pos = 'adj'; tag = 'Adj';
      } else if (tagSet.has('adverb')) {
        pos = 'adv'; tag = 'Adv';
      } else if (tagSet.has('preposition')) {
        pos = 'prep'; tag = 'Prep';
      } else if (tagSet.has('conjunction')) {
        pos = 'conj'; tag = 'Conj';
      } else if (tagSet.has('determiner') || tagSet.has('article')) {
        pos = 'det'; tag = 'Det';
      } else if (tagSet.has('pronoun')) {
        pos = 'pron'; tag = 'Pron';
      }

      if (word.trim()) {
        tokens.push({ text: word, root: root.toLowerCase(), pos, tag });
      }
    });

    return tokens;
  } catch (e) {
    console.warn('[NLP] tokenizeText failed:', e);
    return text.split(/\s+/).filter(Boolean).map(w => ({
      text: w, root: w.toLowerCase(), pos: 'word', tag: 'Word'
    }));
  }
}
