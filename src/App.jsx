import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import GlobeSection from './components/GlobeSection';
import ContextPanel from './components/ContextPanel';
import EnhancedSearchBar from './components/EnhancedSearchBar';
import TrendingTopics from './components/TrendingTopics';
import LanguageSwitcher from './components/LanguageSwitcher';
import ErrorBoundary from './components/ErrorBoundary';
import { useMapData } from './hooks/useMapData';
import { addToVoyageHistory } from './utils/voyageUtils';
import { getBookmarks, addBookmark, removeBookmark, isBookmarked } from './utils/bookmarksUtils';
import { exportVoyageLog, downloadMarkdown } from './utils/exportUtils';
import allMockEvents from './data/mockIntelligence';

function App() {
  const { t } = useTranslation();
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [voyageHistory, setVoyageHistory] = useState([]);
  const [chartMode, setChartMode] = useState(false);
  const [bookmarks, setBookmarks] = useState(getBookmarks);
  const { locations, countriesIndex, loading } = useMapData();

  const handleLocationSelect = (location) => {
    if (typeof location === 'object' && location.name) {
      const entry = {
        name: location.name,
        lat: location.lat,
        lng: location.lng,
        type: location.type,
        isTopic: location.isTopic,
        timestamp: Date.now(),
      };
      setSelectedLocation(entry);
      setVoyageHistory((prev) => addToVoyageHistory(prev, entry));
    }
  };

  const handleClosePanel = () => {
    setSelectedLocation(null);
  };

  const handleSetSail = () => {
    const allLocationNames = Object.keys(allMockEvents);
    if (allLocationNames.length === 0) return;

    // Filter to only names that have a matching region or country
    const validNames = allLocationNames.filter((name) =>
      locations.some((l) => l.label === name) ||
      countriesIndex.some((c) => c.name === name)
    );
    if (validNames.length === 0) return;

    const exclude = selectedLocation ? [selectedLocation.name] : [];
    const candidates = validNames.filter((n) => !exclude.includes(n));
    const pool = candidates.length > 0 ? candidates : validNames;
    const chosen = pool[Math.floor(Math.random() * pool.length)];

    const regionMatch = locations.find((l) => l.label === chosen);
    if (regionMatch) {
      handleLocationSelect({
        name: regionMatch.label,
        lat: regionMatch.lat,
        lng: regionMatch.lng,
        type: 'region',
      });
    } else {
      const countryMatch = countriesIndex.find((c) => c.name === chosen);
      if (countryMatch) {
        handleLocationSelect({
          name: countryMatch.name,
          lat: countryMatch.lat,
          lng: countryMatch.lng,
          type: 'country',
        });
      }
    }
  };

  const handleToggleBookmark = (entry) => {
    if (!entry?.name) return;
    if (isBookmarked(entry.name)) {
      removeBookmark(entry.name);
    } else {
      addBookmark(entry);
    }
    setBookmarks(getBookmarks());
  };

  const handleExportLog = () => {
    if (voyageHistory.length === 0) return;
    const md = exportVoyageLog(voyageHistory);
    downloadMarkdown(md);
  };

  // Register service worker for PWA
  useEffect(() => {
    if ('serviceWorker' in navigator && !import.meta.env.DEV) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  // Escape key closes the panel
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && selectedLocation) {
        handleClosePanel();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedLocation]);

  return (
    <ErrorBoundary>
      <div className="h-screen w-screen flex flex-col bg-slate-950 text-zinc-100">
        {/* Header */}
        <header className="flex items-center justify-between px-16 py-5 border-b border-slate-700/30 bg-slate-900/50 backdrop-blur-sm relative z-40">
          <div className="flex items-center gap-3 flex-shrink-0">
            <img src="/assets/logo.png" alt="Caravels" className="w-8 h-8" />
            <span className="text-2xl font-light tracking-wider text-slate-100">Caravels</span>
          </div>
          <div className="flex-1 max-w-2xl mx-16 flex justify-center">
            {!loading && (
              <EnhancedSearchBar
                onLocationSelect={handleLocationSelect}
                countriesIndex={countriesIndex}
                regions={locations}
              />
            )}
          </div>
          <div className="w-32 flex-shrink-0 flex justify-end items-center gap-1">
            <LanguageSwitcher />
            <button
              onClick={() => setChartMode((v) => !v)}
              className={`p-2 rounded-lg transition-all duration-200 border ${chartMode ? 'bg-amber-500/15 border-amber-500/30 text-amber-300' : 'bg-transparent border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
              title={chartMode ? t('app.chartModeOn') : t('app.chartModeOff')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
              </svg>
            </button>
          </div>
        </header>

        {/* Trade Winds Bar */}
        <TrendingTopics onTopicSelect={handleLocationSelect} bookmarks={bookmarks} />

        {/* Main Content - relative container for globe + overlay panel */}
        <main className="flex-1 flex flex-col relative overflow-hidden px-8 pt-6 pb-8">
          <GlobeSection
            onLocationSelect={handleLocationSelect}
            selectedLocation={selectedLocation}
            voyageHistory={voyageHistory}
            locations={locations}
            countriesIndex={countriesIndex}
            loading={loading}
            chartMode={chartMode}
          />

          {/* Side Panel - Floating overlay on right side */}
          {selectedLocation && (
            <div className="absolute top-6 right-8 bottom-8 w-[520px] z-30 animate-in fade-in slide-in-from-right-4 duration-300">
              <ContextPanel
                key={selectedLocation.name ?? 'none'}
                selectedLocation={selectedLocation}
                voyageHistory={voyageHistory}
                onVoyageNavigate={(entry) => handleLocationSelect(entry)}
                onToggleBookmark={handleToggleBookmark}
                isBookmarked={isBookmarked}
                onClose={handleClosePanel}
              />
            </div>
          )}

          {/* Set Sail floating button */}
          {!loading && (
            <button
              onClick={handleSetSail}
              className="absolute bottom-8 left-8 z-40 flex items-center gap-2.5 px-5 py-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 hover:border-amber-500/40 rounded-xl text-amber-300 hover:text-amber-200 text-sm font-light transition-all duration-300 backdrop-blur-md shadow-lg group"
              title={t('app.setSailTitle')}
            >
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.5 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z" />
              </svg>
              <span>{t('app.setSail')}</span>
            </button>
          )}
        </main>

        {/* Footer */}
        <footer className="px-16 py-3 border-t border-slate-700/30 text-xs text-slate-400 tracking-wide bg-slate-900/50 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span>{t('app.footer')}</span>
            <div className="flex items-center gap-4">
              {voyageHistory.length > 0 && (
                <button
                  onClick={handleExportLog}
                  className="text-slate-500 hover:text-amber-300 transition-colors duration-200 flex items-center gap-1"
                  title="Download voyage log"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  {t('app.exportLog')}
                </button>
              )}
              <span className="text-slate-500">{t('app.chartYourCourse')}</span>
            </div>
          </div>
        </footer>
      </div>
    </ErrorBoundary>
  );
}

export default App;
