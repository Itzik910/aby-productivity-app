import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en';
import he from './locales/he';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      he: { translation: he },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'he'],
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'aby-language',
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
  });

export function applyDirection(language: string) {
  const isRtl = language === 'he';
  document.documentElement.setAttribute('dir', isRtl ? 'rtl' : 'ltr');
  document.documentElement.setAttribute('lang', language);
}

// Apply direction on language change
i18n.on('languageChanged', (lng) => {
  applyDirection(lng);
});

// Apply on initial load
applyDirection(i18n.language);

export default i18n;
