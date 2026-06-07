import { useState, useEffect, useMemo, useRef, Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchNews } from '../services/multiNewsService';
import { translateArticle } from '../services/translationService';
import allMockEvents from '../data/mockIntelligence';

function useTimeAgo() {
  const { t } = useTranslation();
  return (dateStr) => {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    if (isNaN(then)) return '';
    const diff = Math.floor((now - then) / 1000);
    if (diff < 60) return t('time.justNow');
    if (diff < 3600) return t('time.minutesAgo', { count: Math.floor(diff / 60) });
    if (diff < 86400) return t('time.hoursAgo', { count: Math.floor(diff / 3600) });
    return t('time.daysAgo', { count: Math.floor(diff / 86400) });
  };
}

function ContextPanel({ selectedLocation, voyageHistory = [], onVoyageNavigate, onToggleBookmark, isBookmarked, onClose }) {
  const { t, i18n } = useTranslation();
  const timeAgo = useTimeAgo();
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const [newsArticles, setNewsArticles] = useState([]);
  const [isLoadingNews, setIsLoadingNews] = useState(false);
  const [newsError, setNewsError] = useState(null);
  const [useNewsData, setUseNewsData] = useState(false);
  const [newArticleToast, setNewArticleToast] = useState(null);
  const [translations, setTranslations] = useState({});
  const [translatingUrls, setTranslatingUrls] = useState({});
  const newsCountRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    const loadNewsForLocation = async () => {
      if (!selectedLocation) {
        if (cancelled) return;
        setNewsArticles([]);
        setNewsError(null);
        setUseNewsData(false);
        return;
      }

      if (cancelled) return;
      setIsLoadingNews(true);
      setNewsError(null);
      setCurrentEventIndex(0);

      try {
        let query = null;

        if (typeof selectedLocation === 'object' && selectedLocation.name) {
          query = selectedLocation.name;
        } else if (typeof selectedLocation === 'string') {
          query = selectedLocation.split(' (')[0];
        }

        if (!query) {
          if (cancelled) return;
          setNewsArticles([]);
          setUseNewsData(false);
          setIsLoadingNews(false);
          return;
        }

        const result = await fetchNews(query);
        if (cancelled) return;

        if (result.articles && result.articles.length > 0) {
          setNewsArticles(result.articles);
          setUseNewsData(true);
        } else {
          if (cancelled) return;
          setNewsArticles([]);
          setUseNewsData(false);
        }
      } catch (error) {
        if (cancelled) return;
        setNewsError(error.message);
        setNewsArticles([]);
        setUseNewsData(false);
      } finally {
        if (!cancelled) {
          setIsLoadingNews(false);
        }
      }
    };

    loadNewsForLocation();

    return () => {
      cancelled = true;
    };
  }, [selectedLocation]);

  // Keep ref in sync with article count for polling
  useEffect(() => {
    newsCountRef.current = newsArticles.length;
  }, [newsArticles.length]);

  // Live polling every 5 minutes
  useEffect(() => {
    if (!selectedLocation || !useNewsData) return;
    const interval = setInterval(async () => {
      try {
        const query = typeof selectedLocation === 'object' && selectedLocation.name
          ? selectedLocation.name
          : null;
        if (!query) return;
        const result = await fetchNews(query);
        const prevCount = newsCountRef.current;
        if (result.articles && result.articles.length > prevCount) {
          const newCount = result.articles.length - prevCount;
          setNewArticleToast(t('context.newArticles', { count: newCount }));
          setTimeout(() => setNewArticleToast(null), 4000);
          setNewsArticles(result.articles);
        }
      } catch { /* silent poll */ }
    }, 300_000);
    return () => clearInterval(interval);
  }, [selectedLocation, useNewsData]);

  const getLocationName = (location) => {
    if (!location) return null;
    if (typeof location === 'object' && location.name) return location.name;
    if (typeof location === 'string') return location.split(' (')[0];
    return null;
  };

  const locationName = getLocationName(selectedLocation);
  const displayName = typeof selectedLocation === 'object' && selectedLocation.name
    ? selectedLocation.name
    : locationName;
  const isTopic = selectedLocation?.isTopic === true;

  const articlesOrEvents = useMemo(() => {
    if (useNewsData && newsArticles.length > 0) {
      return newsArticles.map((article) => ({
        id: article.url,
        title: article.title,
        description: article.description,
        whyMatters: article.source,
        impact: 'News',
        url: article.url,
        image: article.image,
        publishedAt: article.publishedAt,
        isNewsArticle: true,
      }));
    }
    return (locationName && allMockEvents[locationName]) ? allMockEvents[locationName] : [];
  }, [useNewsData, newsArticles, locationName]);

  // Clamp currentEventIndex when article list shrinks
  useEffect(() => {
    if (articlesOrEvents.length > 0 && currentEventIndex >= articlesOrEvents.length) {
      setCurrentEventIndex(articlesOrEvents.length - 1);
    }
  }, [articlesOrEvents.length, currentEventIndex]);

  const hasEvents = articlesOrEvents.length > 0;
  const safeEventIndex = hasEvents ? Math.min(currentEventIndex, articlesOrEvents.length - 1) : 0;
  const currentEvent = hasEvents ? articlesOrEvents[safeEventIndex] : null;

  const getImpactColor = (impact) => {
    switch (impact) {
      case 'High':
        return 'text-rose-300 bg-rose-900/40 border-rose-800/50';
      case 'Medium':
        return 'text-amber-300 bg-amber-900/40 border-amber-800/50';
      case 'Low':
        return 'text-emerald-300 bg-emerald-900/40 border-emerald-800/50';
      default:
        return 'text-zinc-400 bg-zinc-800/40 border-zinc-700/50';
    }
  };

  const hasSafeUrl = currentEvent?.url && /^https:\/\//.test(currentEvent.url);

  const handleTranslate = async () => {
    if (!currentEvent?.id || !currentEvent.isNewsArticle) return;
    const url = currentEvent.id;
    if (translations[url] || translatingUrls[url]) return;
    setTranslatingUrls((prev) => ({ ...prev, [url]: true }));
    try {
      const result = await translateArticle(
        { title: currentEvent.title, description: currentEvent.description },
        i18n.language
      );
      setTranslations((prev) => ({ ...prev, [url]: result }));
    } catch {
      /* silent fallback */
    } finally {
      setTranslatingUrls((prev) => ({ ...prev, [url]: false }));
    }
  };

  const tTitle = translations[currentEvent?.id]?.title || currentEvent?.title;
  const tDescription = translations[currentEvent?.id]?.description || currentEvent?.description;

  return (
    <aside className="h-full bg-slate-900/95 backdrop-blur-sm rounded-2xl border border-slate-700/50 flex flex-col overflow-hidden shadow-lg">
      {/* Header */}
      <div className="px-8 py-5 border-b border-slate-700/30 bg-gradient-to-b from-slate-900 to-slate-900/80 flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] text-slate-500 uppercase tracking-super-wide mb-1.5 font-semibold">
            {isTopic ? t('context.discovery') : t('context.shipsLog')}
          </div>
          {selectedLocation && (
            <div className="text-lg text-slate-100 font-light tracking-tight truncate">
              {displayName}
            </div>
          )}
          {hasEvents && (
            <div className="text-xs text-slate-500 mt-1.5">
              <span className="inline-block bg-slate-800 px-2.5 py-1 rounded-full font-medium text-slate-300">
                {useNewsData ? t('context.articles', { count: articlesOrEvents.length }) : t('context.intelligence')}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {selectedLocation && !isTopic && (
            <button
              onClick={() => onToggleBookmark?.(selectedLocation)}
              className="p-2 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-all duration-200"
              title={isBookmarked?.(selectedLocation.name) ? t('context.removePort') : t('context.savePort')}
            >
              <svg className="w-4 h-4" fill={isBookmarked?.(selectedLocation.name) ? '#fbbf24' : 'none'} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
              </svg>
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-all duration-200"
            title={t('context.close')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Ship's Log Breadcrumbs */}
      {voyageHistory.length > 0 && (
        <div className="px-8 py-2.5 border-b border-slate-700/30 bg-slate-900/60 flex items-center gap-1.5 overflow-x-auto text-xs">
          <button
            onClick={() => onVoyageNavigate?.(voyageHistory[0])}
            className="text-slate-400 hover:text-slate-200 transition-colors flex-shrink-0"
            title={t('context.firstPort')}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </button>
          {voyageHistory.map((entry, idx) => {
            const isLast = idx === voyageHistory.length - 1;
            return (
              <Fragment key={`${entry.name}-${entry.timestamp}`}>
                <span className="text-slate-600 flex-shrink-0">/</span>
                {isLast ? (
                  <span className="text-amber-300 font-medium whitespace-nowrap">{entry.name}</span>
                ) : (
                  <button
                    onClick={() => onVoyageNavigate?.(entry)}
                    className="text-slate-400 hover:text-slate-200 transition-colors whitespace-nowrap"
                  >
                    {entry.name}
                  </button>
                )}
              </Fragment>
            );
          })}
        </div>
      )}

      {/* Quick-switch chips — last 3 visited ports excluding current */}
      {voyageHistory.length > 1 && (
        <div className="px-8 py-2 border-b border-slate-700/30 bg-slate-900/40 flex items-center gap-2 overflow-x-auto text-xs">
          <span className="text-slate-500 flex-shrink-0">{t('context.quickChart')}</span>
          {voyageHistory
            .filter((entry) => entry.name !== (selectedLocation?.name))
            .slice(-3)
            .reverse()
            .map((entry) => (
              <button
                key={`chip-${entry.name}-${entry.timestamp}`}
                onClick={() => onVoyageNavigate?.(entry)}
                className="px-2 py-1 rounded-full bg-slate-800/60 border border-slate-700/40 text-slate-400 hover:text-slate-200 hover:border-slate-600/60 transition-all duration-150 whitespace-nowrap"
              >
                {entry.name}
              </button>
            ))}
        </div>
      )}

      {/* Toast notification */}
      {newArticleToast && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-amber-500/20 border border-amber-500/30 rounded-full text-amber-300 text-xs font-medium animate-fade-in shadow-lg backdrop-blur-sm">
          {newArticleToast}
        </div>
      )}

      {/* Content */}
      {isLoadingNews ? (
        <div className="flex-1 flex items-center justify-center px-8">
          <div className="text-center space-y-4 animate-fade-in">
            <div className="inline-flex">
              <div className="w-6 h-6 border-2 border-slate-700 border-t-slate-300 rounded-full animate-spin" />
            </div>
            <div className="text-sm text-slate-400 font-light">
              {t('context.fetching', { name: displayName })}
            </div>
          </div>
        </div>
      ) : !currentEvent ? (
        <div className="flex-1 flex items-center justify-center px-8">
          <div className="text-center space-y-3 animate-fade-in">
            <div className="text-sm text-slate-400 font-light">
              {newsError
                ? t('context.newsUnavailable', { error: newsError })
                : t('context.noStories')}
            </div>
            <div className="text-xs text-slate-500">{t('context.tryAnother')}</div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto">
            {/* Error banner */}
            {newsError && (
              <div className="mx-8 mt-6 px-4 py-3 rounded-lg border border-amber-800/50 bg-amber-900/30 text-amber-300 text-xs">
                {t('context.liveUnavailable')}
              </div>
            )}

            {/* Featured image */}
            {currentEvent.image && /^https:\/\//.test(currentEvent.image) && (
              <div className="mx-8 mt-6 rounded-xl overflow-hidden border border-slate-700/30">
                <img
                  src={currentEvent.image}
                  alt=""
                  className="w-full h-48 object-cover"
                  loading="lazy"
                />
              </div>
            )}

            {/* Headline */}
            <div className="px-8 pt-8 pb-6 border-b border-slate-700/30">
              <div className="space-y-4 animate-fade-in">
                <h2 className="text-xl font-semibold text-slate-100 leading-tight">
                  {tTitle}
                </h2>

                <div className="flex items-center gap-3 text-xs text-slate-400">
                  {currentEvent.isNewsArticle ? (
                    <>
                      <span className="font-medium text-slate-300">{currentEvent.whyMatters}</span>
                      {currentEvent.publishedAt && (
                        <>
                          <span className="text-slate-600">&middot;</span>
                          <span>{new Date(currentEvent.publishedAt).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' })}</span>
                          <span className="text-slate-600">&middot;</span>
                          <span>{timeAgo(currentEvent.publishedAt)}</span>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="font-medium text-slate-300">{t('context.analysis')}</span>
                      <span className="text-slate-600">&middot;</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${getImpactColor(currentEvent.impact)}`}>
                        {t('context.impact', { impact: currentEvent.impact })}
                      </span>
                    </>
                  )}
                </div>

                <p className="text-sm text-slate-300 leading-relaxed font-light">
                  {tDescription}
                </p>

                <div className="flex items-center gap-3 mt-3">
                  {hasSafeUrl && (
                    <a
                      href={currentEvent.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 font-medium hover:underline transition-colors duration-200"
                    >
                      {t('context.readFull')}
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </a>
                  )}
                  {currentEvent.isNewsArticle && i18n.language !== 'en' && (
                    <button
                      onClick={handleTranslate}
                      disabled={!!translations[currentEvent.id] || !!translatingUrls[currentEvent.id]}
                      className={`inline-flex items-center gap-1.5 text-xs rounded-lg transition-colors duration-200 ${
                        translations[currentEvent.id]
                          ? 'text-emerald-400 cursor-default'
                          : translatingUrls[currentEvent.id]
                            ? 'text-slate-500 cursor-wait'
                            : 'text-amber-400 hover:text-amber-300'
                      }`}
                    >
                      {translations[currentEvent.id] ? (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : translatingUrls[currentEvent.id] ? (
                        <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-6.219-8.56" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.657 7.69 15.08 3 17.502m9.334-12.138A47.63 47.63 0 0115 5.621m-4.589 8.495a31.023 31.023 0 01-3.827-1.802" />
                        </svg>
                      )}
                      {translatingUrls[currentEvent.id] ? t('context.translating') : translations[currentEvent.id] ? t('context.translate') : t('context.translate')}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* More stories */}
            {articlesOrEvents.length > 1 && (
              <div className="px-8 py-6 border-b border-slate-700/30">
                <div className="text-[10px] text-slate-500 uppercase tracking-super-wide font-semibold mb-4">
                  {useNewsData ? t('context.moreStories') : t('context.additionalHeadlines')}
                </div>
                <div className="space-y-2">
                  {articlesOrEvents.slice(0, 5).map((event, idx) => (
                    idx !== safeEventIndex && (
                      <button
                        key={event.id}
                        onClick={() => setCurrentEventIndex(idx)}
                        className="w-full text-left p-3 rounded-lg border border-transparent hover:border-slate-700/50 hover:bg-slate-800/40 transition-all duration-200 group"
                      >
                        <div className="text-sm font-medium text-slate-200 group-hover:text-blue-400 line-clamp-2 transition-colors">
                          {translations[event.id]?.title || event.title}
                        </div>
                        <div className="text-xs text-slate-500 mt-1.5 flex items-center gap-2">
                          {event.isNewsArticle ? (
                            <>
                              <span>{event.whyMatters}</span>
                              {event.publishedAt && (
                                <>
                                  <span>&middot;</span>
                                  <span>{timeAgo(event.publishedAt)}</span>
                                </>
                              )}
                            </>
                          ) : (
                            <span>{t('context.impact', { impact: event.impact })}</span>
                          )}
                        </div>
                      </button>
                    )
                  ))}
                </div>
              </div>
            )}

            {/* Analysis footer */}
            <div className="px-8 py-8 bg-gradient-to-b from-slate-900/50 to-slate-950/50">
              <div className="space-y-3">
                <div className="text-[10px] text-slate-500 uppercase tracking-super-wide font-semibold">
                  {t('context.context')}
                </div>
                <div className="text-sm text-slate-400 leading-relaxed font-light italic">
                  {currentEvent.whyMatters && !currentEvent.isNewsArticle
                    ? currentEvent.whyMatters
                    : tDescription && tDescription.length > 200
                      ? t('context.storyOngoing')
                      : t('context.stayInformed')}
                </div>
              </div>
            </div>
          </div>

          {/* Pagination footer */}
          {articlesOrEvents.length > 1 && (
            <div className="px-8 py-4 border-t border-slate-700/30 bg-slate-900/80 backdrop-blur-sm flex items-center justify-between text-xs text-slate-500 flex-shrink-0">
              <span>{t('context.pagination', { current: safeEventIndex + 1, total: Math.min(articlesOrEvents.length, 5) })}</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setCurrentEventIndex((prev) => (prev > 0 ? prev - 1 : 0))}
                  disabled={safeEventIndex === 0}
                  className="disabled:opacity-30 text-slate-400 hover:text-slate-200 transition-colors duration-200 p-1.5 hover:bg-slate-800 rounded"
                  title={t('context.previous')}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => setCurrentEventIndex((prev) => (prev < Math.min(articlesOrEvents.length - 1, 4) ? prev + 1 : prev))}
                  disabled={safeEventIndex >= Math.min(articlesOrEvents.length - 1, 4)}
                  className="disabled:opacity-30 text-slate-400 hover:text-slate-200 transition-colors duration-200 p-1.5 hover:bg-slate-800 rounded"
                  title={t('context.next')}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </aside>
  );
}

export default ContextPanel;
