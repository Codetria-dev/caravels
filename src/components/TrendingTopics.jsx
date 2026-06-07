import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const TRENDING_CATEGORIES = [
  { id: 'world', label: 'World', icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064' },
  { id: 'technology', label: 'Technology', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
  { id: 'business', label: 'Business', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1' },
  { id: 'health', label: 'Health', icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' },
  { id: 'sports', label: 'Sports', icon: 'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z' },
  { id: 'science', label: 'Science', icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z' },
];

const QUICK_COUNTRIES = [
  { code: 'us', label: 'United States' },
  { code: 'gb', label: 'United Kingdom' },
  { code: 'br', label: 'Brazil' },
  { code: 'jp', label: 'Japan' },
  { code: 'de', label: 'Germany' },
  { code: 'fr', label: 'France' },
  { code: 'in', label: 'India' },
  { code: 'cn', label: 'China' },
];

function TrendingTopics({ onTopicSelect, bookmarks = [] }) {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState(null);
  const [showCountries, setShowCountries] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  const handleCategoryClick = (category) => {
    setActiveCategory(category.id);
    onTopicSelect({ name: category.label, type: 'topic', isTopic: true });
  };

  const handleCountryClick = (country) => {
    setActiveCategory(country.label);
    onTopicSelect({ name: country.label, lat: 0, lng: 0, type: 'country' });
  };

  return (
    <div className="px-16 py-4 border-t border-slate-700/30 bg-slate-900/50 backdrop-blur-sm">
      <div className="flex items-center gap-6">
        <span className="text-[10px] uppercase tracking-widest text-slate-500 font-medium flex-shrink-0">
          {t('trending.tradeWinds')}
        </span>

        {/* Category chips */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          {TRENDING_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-light whitespace-nowrap transition-all duration-200 border ${
                activeCategory === cat.id
                  ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                  : 'bg-slate-800/60 border-slate-700/40 text-slate-400 hover:text-slate-200 hover:border-slate-600/60 hover:bg-slate-800'
              }`}
            >
              <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={cat.icon} />
              </svg>
              {t(`trending.${cat.id}`, cat.label)}
            </button>
          ))}

          {/* Separator */}
          <span className="w-px h-4 bg-slate-700/50 flex-shrink-0 mx-1" />

          {/* Quick countries toggle */}
          <button
            onClick={() => setShowCountries(!showCountries)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-light whitespace-nowrap transition-all duration-200 border ${
              showCountries
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-800/60 border-slate-700/40 text-slate-400 hover:text-slate-200 hover:border-slate-600/60 hover:bg-slate-800'
            }`}
          >
            <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {t('trending.ports')}
            <svg className={`w-3 h-3 transition-transform duration-200 ${showCountries ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Saved Ports */}
      {bookmarks.length > 0 && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSaved(!showSaved)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-light whitespace-nowrap transition-all duration-200 border ${
              showSaved
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-amber-500/10 border-amber-500/25 text-amber-300 hover:bg-amber-500/20'
            }`}
            title={t('trending.toggleSaved')}
          >
            <svg className="w-3 h-3" fill="#fbbf24" stroke="none" viewBox="0 0 24 24">
              <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
            {t('trending.saved', { count: bookmarks.length })}
          </button>
          {showSaved && (
            <div className="flex items-center gap-2 animate-fade-in">
              {bookmarks.map((entry) => (
                <button
                  key={entry.name}
                  onClick={() => onTopicSelect({ name: entry.name, lat: entry.lat, lng: entry.lng, type: entry.type || 'country' })}
                  className="px-3 py-1 rounded-full text-xs font-light whitespace-nowrap transition-all duration-200 border bg-amber-500/10 border-amber-500/25 text-amber-300 hover:bg-amber-500/20"
                >
                  {entry.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Expanded country chips */}
      {showCountries && (
        <div className="mt-3 flex items-center gap-2 overflow-x-auto scrollbar-none animate-fade-in">
          {QUICK_COUNTRIES.map((country) => (
            <button
              key={country.code}
              onClick={() => handleCountryClick(country)}
              className={`px-3 py-1 rounded-full text-xs font-light whitespace-nowrap transition-all duration-200 border ${
                activeCategory === country.label
                  ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                  : 'bg-slate-800/40 border-slate-700/30 text-slate-500 hover:text-slate-300 hover:border-slate-600/50'
              }`}
            >
              {country.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default TrendingTopics;
