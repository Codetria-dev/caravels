/**
 * Translates text using the Vite-proxied MyMemory API.
 * MyMemory is free (no key required) with ~1000 chars/day limit.
 */

import { apiUrl } from './api.js';

const LANG_MAP = {
  en: 'en',
  pt: 'pt',
  es: 'es',
  fr: 'fr',
  de: 'de',
  it: 'it',
  ja: 'ja',
  ko: 'ko',
  'zh-CN': 'zh-CN',
  ru: 'ru',
  hi: 'hi',
  ar: 'ar',
};

export async function translateText(text, targetLang) {
  if (!text || typeof text !== 'string') return text;
  const tl = LANG_MAP[targetLang] || targetLang || 'pt';
  if (tl === 'en') return text; // Source is already English (most news)

  const langpair = `en|${tl}`;

  try {
    const res = await fetch(
      apiUrl(`/api/translate?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(langpair)}`)
    );
    const data = await res.json();
    if (data.translatedText && data.translatedText !== text) {
      return data.translatedText;
    }
    return text;
  } catch {
    return text; // Silent fallback — keep original text
  }
}

/**
 * Translate both title and description of a news article.
 * Returns { title, description } with translated strings.
 */
export async function translateArticle({ title, description }, targetLang) {
  const translatedTitle = await translateText(title, targetLang);
  const translatedDescription = description ? await translateText(description, targetLang) : description;
  return { title: translatedTitle, description: translatedDescription };
}
