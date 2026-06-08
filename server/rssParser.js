/**
 * Shared RSS parser utilities used by both the Vite dev server proxy
 * and the production Node.js server.
 */

export const RSS_FEEDS = {
  world: 'https://news.google.com/rss/headlines/section/topic/WORLD?hl=en-US&gl=US&ceid=US:en',
  technology: 'https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=en-US&gl=US&ceid=US:en',
  business: 'https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=en-US&gl=US&ceid=US:en',
  health: 'https://news.google.com/rss/headlines/section/topic/HEALTH?hl=en-US&gl=US&ceid=US:en',
  sports: 'https://news.google.com/rss/headlines/section/topic/SPORTS?hl=en-US&gl=US&ceid=US:en',
  science: 'https://news.google.com/rss/headlines/section/topic/SCIENCE?hl=en-US&gl=US&ceid=US:en',
  bbc: 'https://feeds.bbci.co.uk/news/world/rss.xml',
};

export function cleanText(raw) {
  return raw
    .replace(/<!\[CDATA\[/gi, '')
    .replace(/\]\]>/g, '')
    // Decode entities first so encoded HTML tags become real tags
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    // Then strip all HTML tags (now that encoded ones are real)
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseRSS(xml) {
  const articles = [];
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let itemMatch;
  while ((itemMatch = itemRegex.exec(xml)) !== null) {
    const itemXml = itemMatch[1];
    const getTag = (tag) => {
      const m = itemXml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
      return m ? cleanText(m[1]) : '';
    };
    const getAttr = (tag, attr) => {
      const m = itemXml.match(new RegExp(`<${tag}[^>]*${attr}=["']([^"']+)`, 'i'));
      return m ? m[1] : '';
    };
    const title = getTag('title');
    const link = getTag('link');
    const desc = getTag('description');
    const pubDate = getTag('pubDate');
    const source = getTag('source') || '';
    const image = getAttr('media:content', 'url') || getAttr('enclosure', 'url') || '';
    if (title && link) {
      articles.push({
        title,
        description: desc,
        url: link,
        source: source || (() => { try { return new URL(link).hostname; } catch { return 'Unknown'; } })(),
        publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        image: image || null,
      });
    }
  }
  return articles;
}
