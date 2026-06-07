import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { searchCountries } from '../utils/countryDataExtractor';

function EnhancedSearchBar({ onLocationSelect, countriesIndex, regions }) {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputValue.trim().length < 1) {
        setSuggestions([]);
        setSelectedIndex(-1);
        setIsOpen(false);
        return;
      }

      // Search both countries and regions
      const countryResults = searchCountries(inputValue, countriesIndex, 8);

      const regionResults = regions.filter((region) =>
        region.label.toLowerCase().includes(inputValue.toLowerCase())
      );

      // Combine and limit results
      const combined = [
        ...regionResults.slice(0, 4),
        ...countryResults.slice(0, 6),
      ].slice(0, 10);

      setSuggestions(combined);
      setSelectedIndex(combined.length > 0 ? 0 : -1);
      setIsOpen(true);
    }, 200);

    return () => clearTimeout(timer);
  }, [inputValue, countriesIndex, regions]);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    switch (e.key) {
      case 'ArrowDown':
        if (!isOpen) return;
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        if (!isOpen) return;
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          // User selected a location from suggestions
          selectLocation(suggestions[selectedIndex]);
        } else if (inputValue.trim()) {
          // No selection or suggestions - treat as free-text topic search
          handleTopicSearch(inputValue);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setInputValue('');
        setSuggestions([]);
        break;
      default:
        break;
    }
  };

  const selectLocation = (location) => {
    onLocationSelect({
      name: location.label || location.name,
      lat: location.lat,
      lng: location.lng,
      type: location.type,
    });

    setInputValue('');
    setSuggestions([]);
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  // Handle free-text topic search (when user hits Enter on non-matching input)
  const handleTopicSearch = (topic) => {
    if (!topic.trim()) return;

    // Send topic search as a special location object
    onLocationSelect({
      name: topic.trim(),
      type: 'topic',
      isTopic: true,
    });

    setInputValue('');
    setSuggestions([]);
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl">
      {/* Search Input */}
      <div className="relative">
        <svg
          className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => inputValue && setIsOpen(true)}
          maxLength={200}
          placeholder={t('search.placeholder')}
          className="w-full pl-12 pr-4 py-3 bg-slate-900/80 border border-slate-700/50 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-200 backdrop-blur-sm"
        />
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900/95 border border-slate-700/50 rounded-xl shadow-2xl overflow-hidden backdrop-blur-sm z-50">
          <ul className="max-h-72 overflow-y-auto">
            {suggestions.map((location, index) => (
              <li key={`${location.type}-${location.id}`}>
                <button
                  onClick={() => selectLocation(location)}
                  className={`w-full px-5 py-3 text-left flex items-center gap-3 transition-colors duration-150 ${
                    index === selectedIndex
                      ? 'bg-slate-800/80 text-cyan-300'
                      : 'text-slate-300 hover:bg-slate-800/40'
                  }`}
                >
                  {/* Type indicator */}
                  <span
                    className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${
                      location.type === 'region'
                        ? 'bg-emerald-500'
                        : 'bg-slate-500'
                    }`}
                  />

                  {/* Location name and type */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-light">
                      {location.label || location.name}
                    </div>
                    <div className="text-xs text-slate-500 capitalize">
                      {t(`search.${location.type}`, location.type)}
                    </div>
                  </div>

                  {/* Keyboard hint for first item */}
                  {index === 0 && (
                    <div className="text-xs text-slate-500 flex-shrink-0">
                      ↵
                    </div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Empty state - suggest topic search */}
      {isOpen && inputValue && suggestions.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900/95 border border-slate-700/50 rounded-xl px-5 py-4 backdrop-blur-sm z-50">
          <div className="text-slate-400 text-sm">
            {t('search.noResults', { query: inputValue })}
          </div>
          <button
            onClick={() => handleTopicSearch(inputValue)}
            className="mt-2 w-full text-left px-3 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 text-cyan-300 text-sm transition-colors duration-150"
          >
            {t('search.exploreNews', { query: inputValue })}
          </button>
        </div>
      )}
    </div>
  );
}

export default EnhancedSearchBar;
