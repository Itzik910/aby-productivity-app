import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import i18n, { applyDirection } from '../i18n';

type Language = 'en' | 'he';

interface LanguageState {
  language: Language;
  isRtl: boolean;
}

interface LanguageActions {
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
}

export const useLanguageStore = create<LanguageState & LanguageActions>()(
  persist(
    (set, get) => ({
      language: (i18n.language as Language) || 'en',
      isRtl: i18n.language === 'he',

      setLanguage: (lang: Language) => {
        i18n.changeLanguage(lang);
        applyDirection(lang);
        set({ language: lang, isRtl: lang === 'he' });
      },

      toggleLanguage: () => {
        const { language } = get();
        const newLang: Language = language === 'en' ? 'he' : 'en';
        i18n.changeLanguage(newLang);
        applyDirection(newLang);
        set({ language: newLang, isRtl: newLang === 'he' });
      },
    }),
    {
      name: 'aby-language',
      partialize: (state) => ({ language: state.language }),
      onRehydrateStorage: () => (state) => {
        if (state?.language) {
          i18n.changeLanguage(state.language);
          applyDirection(state.language);
          state.isRtl = state.language === 'he';
        }
      },
    }
  )
);
