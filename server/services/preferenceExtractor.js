const User = require('../models/User');

let openai = null;
if (process.env.OPENAI_API_KEY) {
  const OpenAI = require('openai');
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// Fast/cheap model for lightweight background extraction.
const EXTRACTION_MODEL = 'gpt-4o-mini';

const EXTRACTION_SYSTEM_PROMPT =
  "Analyze the following user prompt. Did the user reveal any new personal " +
  "preferences, hobbies, dislikes, or dietary needs? Return a JSON object with " +
  "keys like 'add_sports', 'add_dislikedSports', 'add_dietary', " +
  "'add_preferredBrands', 'add_generalNotes'. Each value must be an array of " +
  "short strings. If nothing new is found, return an empty object {}.";

// Maps extraction keys -> dynamicPreferences array paths.
const KEY_MAP = {
  add_sports: 'dynamicPreferences.sports',
  add_dislikedSports: 'dynamicPreferences.dislikedSports',
  add_dietary: 'dynamicPreferences.dietary',
  add_preferredBrands: 'dynamicPreferences.preferredBrands',
  add_generalNotes: 'dynamicPreferences.generalNotes'
};

function parseJsonObject(content) {
  const text = String(content || '').trim();
  const stripped = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```$/i, '')
    .trim();
  const parsed = JSON.parse(stripped);
  return parsed && typeof parsed === 'object' ? parsed : {};
}

/**
 * Analyze a raw prompt for new user preferences and persist them.
 * Runs in the background — callers should NOT await this in the request path.
 *
 * @param {string} rawPrompt
 * @param {string|import('mongoose').Types.ObjectId} userId
 */
async function extractAndSavePreferences(rawPrompt, userId) {
  const prompt = String(rawPrompt || '').trim();
  if (!prompt || !userId || !openai) return;

  let extracted = {};
  try {
    const result = await openai.chat.completions.create({
      model: EXTRACTION_MODEL,
      response_format: { type: 'json_object' },
      temperature: 0,
      max_tokens: 300,
      messages: [
        { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ]
    });
    extracted = parseJsonObject(result.choices[0].message.content);
  } catch (error) {
    console.error('preferenceExtractor LLM error:', error.message);
    return;
  }

  const addToSet = {};
  for (const [key, path] of Object.entries(KEY_MAP)) {
    const values = extracted[key];
    if (Array.isArray(values) && values.length) {
      const clean = values.map((v) => String(v).trim()).filter(Boolean);
      if (clean.length) addToSet[path] = { $each: clean };
    }
  }

  if (Object.keys(addToSet).length === 0) return;

  try {
    await User.updateOne({ _id: userId }, { $addToSet: addToSet });
  } catch (error) {
    console.error('preferenceExtractor DB update error:', error.message);
  }
}

module.exports = { extractAndSavePreferences };
