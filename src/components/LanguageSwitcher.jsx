import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

const LANGUAGES = [
  { code: 'en', native: 'English', flag: '🇬🇧' },
  { code: 'pt', native: 'Português', flag: '🇧🇷' },
  { code: 'es', native: 'Español', flag: '🇪🇸' },
  { code: 'fr', native: 'Français', flag: '🇫🇷' },
  { code: 'de', native: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', native: 'Italiano', flag: '🇮🇹' },
  { code: 'ja', native: '日本語', flag: '🇯🇵' },
  { code: 'ko', native: '한국어', flag: '🇰🇷' },
  { code: 'zh-CN', native: '中文', flag: '🇨🇳' },
  { code: 'ru', native: 'Русский', flag: '🇷🇺' },
  { code: 'hi', native: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ar', native: 'العربية', flag: '🇸🇦' },
];

function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  const current = LANGUAGES.find((l) => l.code === i18n.language) || LANGUAGES[0];

  const handleSelect = (code) => {
    i18n.changeLanguage(code).catch((err) => {
      console.error('Language change failed:', err);
    });
    document.documentElement.lang = code;
    document.documentElement.dir = code === 'ar' ? 'rtl' : 'ltr';
    setOpen(false);
  };

  // Sync dir/lng on mount
  useEffect(() => {
    document.documentElement.lang = i18n.language;
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
  }, [i18n.language]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div ref={menuRef} className="relative flex-shrink-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all duration-200 text-sm"
        title={t('lang.switch')}
      >
        <span className="text-base">{current.flag}</span>
        <span className="hidden sm:inline">{current.code.toUpperCase()}</span>
        <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 bg-slate-900/95 border border-slate-700/50 rounded-xl shadow-2xl backdrop-blur-sm z-50 w-56 max-h-80 overflow-y-auto animate-fade-in">
          <div className="p-2">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest px-3 py-2 font-semibold">
              {t('lang.switch')}
            </div>
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleSelect(lang.code)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors duration-150 ${
                  lang.code === i18n.language
                    ? 'bg-slate-800 text-slate-100'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <span className="text-base">{lang.flag}</span>
                <span className="font-light flex-1 text-left">{lang.native}</span>
                {lang.code === i18n.language && (
                  <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default LanguageSwitcher;
