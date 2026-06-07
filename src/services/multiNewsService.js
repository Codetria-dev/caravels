/**
 * Multi-provider News Service
 *
 * Fetches news from multiple sources with automatic fallback:
 *   1. GNews API (free tier, if GNEWS_API_KEY is set) — best quality
 *   2. RSS feeds via server proxy (free, no key needed) — always works
 *   3. NewsAPI (if NEWS_API_KEY is set) — additional source
 *
 * Uses in-memory cache with TTL to reduce redundant requests.
 */

const CACHE_TTL = 900_000; // 15 minutes

const cache = new Map();

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

export function clearCache() {
  cache.clear();
}

function normalizeArticle(item) {
  return {
    title: item.title || 'No title',
    description: item.description || '',
    url: item.url || '#',
    source: item.source || 'Unknown',
    publishedAt: item.publishedAt || new Date().toISOString(),
    image: item.image || null,
  };
}

/** Fetch from RSS proxy (free, no API key needed) */
async function fetchRSS(query) {
  const url = `/api/rss?q=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('RSS fetch failed');
  const data = await res.json();
  if (data.status === 'error') throw new Error(data.message);
  return { articles: (data.articles || []).map(normalizeArticle), source: 'rss' };
}

/** Fetch from GNews (needs GNEWS_API_KEY) */
async function fetchGNews(query) {
  const url = `/api/gnews?q=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('GNews fetch failed');
  const data = await res.json();
  if (data.status === 'error') throw new Error(data.message);
  return { articles: (data.articles || []).map(normalizeArticle), source: 'gnews' };
}

/** Fetch from NewsAPI (needs NEWS_API_KEY) */
async function fetchNewsAPI(query) {
  const url = `/api/news/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('NewsAPI fetch failed');
  const data = await res.json();
  if (data.status === 'error') throw new Error(data.message);
  return { articles: (data.articles || []).map(normalizeArticle), source: 'newsapi' };
}

/**
 * Main entry point — tries providers in order with fallback.
 * @param {string} query - Country name, topic, or keyword
 * @returns {Promise<{articles: Array, source: string}>}
 */
export async function fetchNews(query) {
  if (!query || typeof query !== 'string') {
    throw new Error('Query must be a non-empty string');
  }

  const cacheKey = query.toLowerCase().trim();
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const errors = [];

  // Try GNews first (best quality)
  try {
    const result = await fetchGNews(query);
    if (result.articles.length > 0) {
      setCache(cacheKey, result);
      return result;
    }
  } catch (e) {
    errors.push(`GNews: ${e.message}`);
  }

  // Try RSS (always works, no key needed)
  try {
    const result = await fetchRSS(query);
    if (result.articles.length > 0) {
      setCache(cacheKey, result);
      return result;
    }
  } catch (e) {
    errors.push(`RSS: ${e.message}`);
  }

  // Try NewsAPI (if configured)
  try {
    const result = await fetchNewsAPI(query);
    if (result.articles.length > 0) {
      setCache(cacheKey, result);
      return result;
    }
  } catch (e) {
    errors.push(`NewsAPI: ${e.message}`);
  }

  // No results from any provider
  throw new Error(`No news found for "${query}". ${errors.join('; ')}`);
}
