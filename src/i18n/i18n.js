import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import pt from './locales/pt.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import it from './locales/it.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import zhCN from './locales/zh-CN.json';
import ru from './locales/ru.json';
import hi from './locales/hi.json';
import ar from './locales/ar.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      pt: { translation: pt },
      es: { translation: es },
      fr: { translation: fr },
      de: { translation: de },
      it: { translation: it },
      ja: { translation: ja },
      ko: { translation: ko },
      'zh-CN': { translation: zhCN },
      ru: { translation: ru },
      hi: { translation: hi },
      ar: { translation: ar },
    },
    fallbackLng: 'en',
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'caravels-lang',
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
