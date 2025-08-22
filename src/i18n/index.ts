// src/i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import cs from './locales/cs.json';
import en from './locales/en.json';

const resources = {
  cs: { translation: cs },
  en: { translation: en },
};

// Bezpečné zistenie systémového jazyka cez getLocales()
function getSystemLang(): 'cs' | 'en' {
  const locales = Localization.getLocales?.();
  // languageTag je napr. "cs-CZ", languageCode je "cs"
  const langCode =
    locales && locales.length > 0
      ? locales[0].languageCode || locales[0].languageTag?.split('-')[0]
      : undefined;

  switch (langCode) {
    case 'cs':
      return 'cs';
    default:
      return 'en';
  }
}

// Určení výchozího jazyka podle systému (cs -> čeština, jinak en)
const initialLng = getSystemLang();

void i18n.use(initReactI18next).init({
  resources,
  lng: initialLng,
  fallbackLng: 'en',
  supportedLngs: ['cs', 'en'],
  interpolation: { escapeValue: false },
  compatibilityJSON: 'v4',
  returnNull: false,
});

export default i18n;
