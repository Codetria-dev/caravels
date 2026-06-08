import 'dotenv/config';
import express from 'express';
import compression from 'compression';
import cors from 'cors';

const PORT = process.env.PORT || 3000;
const NEWS_API_KEY = process.env.NEWS_API_KEY;
const GNEWS_API_KEY = process.env.GNEWS_API_KEY;

// --- RSS Feed Parser ---
import { parseRSS } from './rssParser.js';

const RSS_FEEDS = {
  world: 'https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en',
  technology: 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGRqTVhZU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en',
  business: 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx6TVdZU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en',
  health: 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNR3QwTkRZU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en',
  sports: 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRFp1ZEdvU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en',
  science: 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRFp0Y1djU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en',
};

const app = express();

app.use(compression());
app.use(express.json());
app.use(cors());

// --- API Routes ---

app.get('/api/news', async (req, res) => {
  if (!NEWS_API_KEY) {
    return res.json({ status: 'ok', totalResults: 0, articles: [] });
  }
  try {
    const newsPath = req.originalUrl.replace('/api/news', '');
    const sep = newsPath.includes('?') ? '&' : '?';
    const target = `https://newsapi.org/v2${newsPath}${sep}apiKey=${encodeURIComponent(NEWS_API_KEY)}`;
    const upstream = await fetch(target);
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch {
    res.status(502).json({ status: 'error', message: 'Failed to reach news service.' });
  }
});

app.get('/api/gnews', async (req, res) => {
  if (!GNEWS_API_KEY) {
    return res.json({ status: 'ok', totalResults: 0, articles: [] });
  }
  try {
    const query = req.query.q || 'world';
    const target = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&max=10&token=${GNEWS_API_KEY}`;
    const upstream = await fetch(target);
    const data = await upstream.json();
    if (data.articles) {
      data.articles = data.articles.map((a) => ({
        title: a.title,
        description: a.description,
        url: a.url,
        source: a.source?.name || '',
        publishedAt: a.publishedAt,
        image: a.image || null,
      }));
    }
    res.json(data);
  } catch {
    res.status(502).json({ status: 'error', message: 'Failed to reach GNews.' });
  }
});

app.get('/api/rss', async (req, res) => {
  try {
    const { q, topic } = req.query;
    let feedUrl;
    if (topic && RSS_FEEDS[topic]) {
      feedUrl = RSS_FEEDS[topic];
    } else if (q) {
      feedUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;
    } else {
      feedUrl = RSS_FEEDS.world;
    }
    const r = await fetch(feedUrl);
    const xml = await r.text();
    const articles = parseRSS(xml);
    res.json({ status: 'ok', totalResults: articles.length, articles });
  } catch {
    res.status(502).json({ status: 'error', message: 'Failed to fetch RSS feed.' });
  }
});

app.get('/api/translate', async (req, res) => {
  const { q, langpair } = req.query;
  if (!q || !q.trim()) {
    return res.status(400).json({ error: 'Missing text to translate' });
  }
  try {
    const pair = langpair || 'en|pt';
    const target = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}&langpair=${encodeURIComponent(pair)}`;
    const upstream = await fetch(target);
    const data = await upstream.json();
    res.json({
      translatedText: data.responseData?.translatedText || q,
      match: data.responseData?.match || 0,
    });
  } catch {
    res.status(502).json({ error: 'Translation service unavailable' });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.listen(PORT, () => {
  console.log(`Caravels API running on port ${PORT}`);
});
