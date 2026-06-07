/**
 * Production server for Caravels.
 *
 * Serves static build (dist/) and proxies /api/rss, /api/gnews, /api/news requests,
 * keeping API keys server-side.
 *
 * Usage:
 *   node scripts/prod-server.js
 *
 * Environment variables (optional):
 *   PORT              — server port (default 4173)
 *   NEWS_API_KEY      — NewsAPI key
 *   GNEWS_API_KEY     — GNews free tier key (https://gnews.io)
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanText, parseRSS, RSS_FEEDS } from './rssParser.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '..', 'dist');
const PORT = parseInt(process.env.PORT || '4173', 10);
const NEWS_API_KEY = process.env.NEWS_API_KEY;
const GNEWS_API_KEY = process.env.GNEWS_API_KEY;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function serveStatic(req, res) {
  let filePath = path.join(distDir, req.url === '/' ? 'index.html' : req.url);
  if (!filePath.startsWith(distDir)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        fs.readFile(path.join(distDir, 'index.html'), (err2, indexData) => {
          if (err2) { res.writeHead(500); res.end('Internal server error'); return; }
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(indexData);
        });
        return;
      }
      res.writeHead(500);
      res.end('Internal server error');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  // --- RSS proxy (free, no API key) ---
  if (req.url?.startsWith('/api/rss')) {
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
    return;
  }

  // --- GNews proxy (free tier, needs GNEWS_API_KEY) ---
  if (req.url?.startsWith('/api/gnews')) {
    if (!GNEWS_API_KEY) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'error', message: 'GNews key not configured.' }));
      return;
    }
    const url = new URL(req.url, 'http://localhost');
    const query = url.searchParams.get('q') || 'world';
    const gnewsUrl = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&max=10&token=${GNEWS_API_KEY}`;
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
    return;
  }

  // --- NewsAPI proxy (needs NEWS_API_KEY) ---
  if (req.url?.startsWith('/api/news')) {
    if (!NEWS_API_KEY) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'error', message: 'NewsAPI key not configured on server.' }));
      return;
    }
    const newsPath = req.url.replace('/api/news', '');
    const separator = newsPath.includes('?') ? '&' : '?';
    const targetUrl = `https://newsapi.org/v2${newsPath}${separator}apiKey=${encodeURIComponent(NEWS_API_KEY)}`;
    try {
      const upstream = await fetch(targetUrl);
      const data = await upstream.json();
      res.writeHead(upstream.status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    } catch {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'error', message: 'Failed to reach news service.' }));
    }
    return;
  }

  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`[caravels] Production server running at http://localhost:${PORT}`);
  if (!NEWS_API_KEY && !GNEWS_API_KEY) {
    console.warn('[caravels] No API keys configured. RSS feeds will still work for free.');
  }
});
