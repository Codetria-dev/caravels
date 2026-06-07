import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { cleanText, parseRSS, RSS_FEEDS } from './scripts/rssParser.js'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const newsApiKey = env.NEWS_API_KEY || process.env.NEWS_API_KEY
  const gnewsApiKey = env.GNEWS_API_KEY || process.env.GNEWS_API_KEY

  function newsApiProxy() {
    return {
      name: 'news-api-proxy',
      apply: 'serve',
      configureServer(server) {
        server.middlewares.use('/api/news', async (req, res) => {
          if (!newsApiKey) {
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ status: 'ok', totalResults: 0, articles: [], message: 'NewsAPI key not configured.' }))
            return
          }
          const newsPath = req.url || '/'
          const separator = newsPath.includes('?') ? '&' : '?'
          const targetUrl = `https://newsapi.org/v2${newsPath}${separator}apiKey=${encodeURIComponent(newsApiKey)}`
          try {
            const upstream = await fetch(targetUrl)
            const data = await upstream.json()
            res.writeHead(upstream.status, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify(data))
          } catch {
            res.writeHead(502, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ status: 'error', message: 'Failed to reach news service.' }))
          }
        })
      },
    }
  }

  function rssProxy() {
    return {
      name: 'rss-proxy',
      apply: 'serve',
      configureServer(server) {
        // RSS: /api/rss?q=Brazil   or   /api/rss?topic=world
        server.middlewares.use('/api/rss', async (req, res) => {
          const url = new URL(req.url, 'http://localhost');
          const query = url.searchParams.get('q');
          const topic = url.searchParams.get('topic');

          let feedUrl;
          if (topic && RSS_FEEDS[topic]) {
            feedUrl = RSS_FEEDS[topic];
          } else if (query) {
            feedUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
          } else {
            feedUrl = RSS_FEEDS.world;
          }

          try {
            const r = await fetch(feedUrl);
            const xml = await r.text();
            const articles = parseRSS(xml);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok', totalResults: articles.length, articles }));
          } catch {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'error', message: 'Failed to fetch RSS feed.' }));
          }
        });

        // GNews: /api/gnews?q=Brazil
        server.middlewares.use('/api/gnews', async (req, res) => {
          if (!gnewsApiKey) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok', totalResults: 0, articles: [], message: 'GNews key not configured.' }));
            return;
          }
          const url = new URL(req.url, 'http://localhost');
          const query = url.searchParams.get('q') || 'world';
          const gnewsUrl = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&max=10&token=${gnewsApiKey}`;
          try {
            const upstream = await fetch(gnewsUrl);
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
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
          } catch {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'error', message: 'Failed to reach GNews.' }));
          }
        });
      },
    };
  }

  function translateProxy() {
    return {
      name: 'translate-proxy',
      apply: 'serve',
      configureServer(server) {
        server.middlewares.use('/api/translate', async (req, res) => {
          const url = new URL(req.url, 'http://localhost');
          const text = url.searchParams.get('q');
          const langpair = url.searchParams.get('langpair') || 'en|pt';

          if (!text || text.trim().length === 0) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing text to translate' }));
            return;
          }

          try {
            const mymemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(langpair)}`;
            const upstream = await fetch(mymemoryUrl);
            const data = await upstream.json();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              translatedText: data.responseData?.translatedText || text,
              match: data.responseData?.match || 0,
            }));
          } catch {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Translation service unavailable' }));
          }
        });
      },
    };
  }

  return {
    plugins: [react(), newsApiProxy(), rssProxy(), translateProxy()],
    build: {
      chunkSizeWarningLimit: 800,
    },
  }
})
