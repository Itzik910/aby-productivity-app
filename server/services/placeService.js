const axios = require('axios');

const MAX_RESULTS = 3;
const DEBUG_PLACES = process.env.ABY_DEBUG_PLACES === 'true';

// Tasks matching these patterns are best done at home (DIY) —
// no point searching for a nearby business.
const DIY_HOME_PATTERNS = [
  /paint|צבע/i,
  /clean|nik|נקה|שטיפה|ניקיון|dishes|כלים|wash clothes|כביסה|vacuum|laundry/i,
  /hang|תלה|תמונה|assemble|לונה|להרכיב/i,
  /cook|לבשל|bake|אפה/i,
  /study|ללמוד|learn|revision|חזרה|homework|שיעורי בית/i,
  /organize|לארגן|declutter/i,
  /repair.*home|תיקון.*בית|fix.*pipe|תיקון.*צינור/i,
  /workout.*home|אימון.*בית/i,
];

function isDIYTask(task = {}) {
  const haystack = [task.title, task.description].filter(Boolean).join(' ');
  const matchesDIY = DIY_HOME_PATTERNS.some((p) => p.test(haystack));
  const isHomeCategory = (task.category || '').toLowerCase() === 'home';
  return matchesDIY || isHomeCategory;
}

function placeDebug(...args) {
  if (DEBUG_PLACES) {
    console.log('[PLACE DEBUG]', ...args);
  }
}

const KEYWORD_RULES = [
  { pattern: /(grocer|grocery|shop|buy|errand|market|suppl)/i, keyword: 'grocery store' },
  { pattern: /(clean|laundr|wash|fold)/i, keyword: 'laundromat' },
  { pattern: /(repair|fix|assemble|handyman|hardware)/i, keyword: 'hardware store' },
  { pattern: /(doctor|clinic|health|medicine|prescrip|pharmacy|vaccin)/i, keyword: 'pharmacy' },
  { pattern: /(workout|gym|fitness|exercise|train)/i, keyword: 'gym' },
  { pattern: /(study|learn|book|library|read)/i, keyword: 'library' },
  { pattern: /(coffee|cafe|meet|meeting|social|friend|lunch|dinner|eat)/i, keyword: 'cafe' },
  { pattern: /(bank|finance|bill|accounting|tax)/i, keyword: 'bank' },
  { pattern: /(ship|mail|package|post)/i, keyword: 'shipping service' },
  { pattern: /(office|cowork|work|desk)/i, keyword: 'coworking space' }
];

function derivePlaceKeyword(task = {}) {
  const haystack = [task.title, task.description, task.category].filter(Boolean).join(' ');
  const rule = KEYWORD_RULES.find(entry => entry.pattern.test(haystack));
  return rule ? rule.keyword : task.title || task.category || 'local business';
}

function buildQueries(task, user) {
  const keyword = derivePlaceKeyword(task);
  const home = user?.addresses?.home?.trim();
  const work = user?.addresses?.work?.trim();
  const queries = new Set();

  if (home) queries.add(`${keyword} near ${home}`);
  if (work && work !== home) queries.add(`${keyword} near ${work}`);
  if (task?.location?.name) queries.add(task.location.name);
  if (task?.location?.address) queries.add(task.location.address);
  if (task?.title) queries.add(`${task.title} services`);

  const resolvedQueries = Array.from(queries).slice(0, 4);
  placeDebug('buildQueries', {
    keyword,
    home,
    work,
    taskTitle: task?.title,
    taskLocationName: task?.location?.name || '',
    taskLocationAddress: task?.location?.address || '',
    queries: resolvedQueries
  });
  return resolvedQueries;
}

function normalizePlace(place) {
  const priceLevel = typeof place.price_level === 'number' ? place.price_level : null;
  return {
    name: place.name,
    address: place.formatted_address || '',
    rating: place.rating || null,
    priceLevel,
    costText: priceLevel === null ? 'Cost unknown' : '$'.repeat(Math.max(1, Math.min(priceLevel + 1, 4))),
    placeId: place.place_id,
    mapsUrl: place.place_id
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.place_id}`
      : undefined
  };
}

async function fetchPlaceDetails(placeId) {
  const mapsKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!mapsKey || !placeId) {
    placeDebug('fetchPlaceDetails skipped', { hasMapsKey: !!mapsKey, placeId });
    return null;
  }

  try {
    placeDebug('fetchPlaceDetails request', { placeId });
    const response = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
      params: {
        place_id: placeId,
        fields: 'name,formatted_address,rating,price_level,website,formatted_phone_number,place_id',
        key: mapsKey
      }
    });

    placeDebug('fetchPlaceDetails response', {
      placeId,
      status: response.data?.status,
      hasResult: !!response.data?.result,
      address: response.data?.result?.formatted_address || ''
    });

    if (response.data.status !== 'OK' || !response.data.result) {
      return null;
    }

    return normalizePlace(response.data.result);
  } catch (error) {
    console.error('Google Places details error:', error.message);
    placeDebug('fetchPlaceDetails error', { placeId, message: error.message });
    return null;
  }
}

async function searchPlaces(query) {
  const mapsKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!mapsKey || !query) {
    placeDebug('searchPlaces skipped', { hasMapsKey: !!mapsKey, query });
    return [];
  }

  try {
    placeDebug('searchPlaces request', { query });
    const response = await axios.get('https://maps.googleapis.com/maps/api/place/textsearch/json', {
      params: {
        query,
        key: mapsKey
      }
    });

    placeDebug('searchPlaces response', {
      query,
      status: response.data?.status,
      resultCount: Array.isArray(response.data?.results) ? response.data.results.length : 0
    });

    if (response.data.status !== 'OK' || !Array.isArray(response.data.results)) {
      return [];
    }

    const normalizedResults = response.data.results.slice(0, MAX_RESULTS).map(normalizePlace);
    const enrichedResults = await Promise.all(
      normalizedResults.map(async (place) => {
        if (place.address) {
          placeDebug('searchPlaces normalized result has address', {
            name: place.name,
            address: place.address
          });
          return place;
        }
        const details = await fetchPlaceDetails(place.placeId);
        const resolved = details || place;
        placeDebug('searchPlaces resolved result', {
          name: resolved.name,
          address: resolved.address || '',
          usedDetails: !!details
        });
        return resolved;
      })
    );

    placeDebug('searchPlaces enriched results', enrichedResults.map(place => ({
      name: place.name,
      address: place.address,
      placeId: place.placeId
    })));
    return enrichedResults;
  } catch (error) {
    console.error('Google Places search error:', error.message);
    placeDebug('searchPlaces error', { query, message: error.message });
    return [];
  }
}

async function getPlaceSuggestions(task, user) {
  // Skip place lookup for DIY/home tasks — they need no physical destination
  if (isDIYTask(task)) {
    placeDebug('getPlaceSuggestions: DIY/home task detected, skipping place lookup', { title: task?.title });
    return [];
  }

  const queries = buildQueries(task, user);
  if (queries.length === 0) {
    placeDebug('getPlaceSuggestions no queries', { taskTitle: task?.title });
    return [];
  }

  const placeGroups = await Promise.all(queries.map(query => searchPlaces(query)));
  const deduped = [];
  const seen = new Set();

  placeGroups.flat().forEach(place => {
    if (!place.placeId || seen.has(place.placeId)) return;
    seen.add(place.placeId);
    deduped.push(place);
  });

  const finalPlaces = deduped.slice(0, MAX_RESULTS);
  placeDebug('getPlaceSuggestions final', finalPlaces.map(place => ({
    name: place.name,
    address: place.address,
    rating: place.rating,
    costText: place.costText
  })));
  return finalPlaces;
}

module.exports = {
  getPlaceSuggestions,
  derivePlaceKeyword,
  isDIYTask
};
