/**
 * i18n Configuration for Mobile App
 * Uses expo-localization for device language detection
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

// Import translation files
import en from './locales/en.json';
import hi from './locales/hi.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import zh from './locales/zh.json';

// Language metadata
export const languages = {
  en: { name: 'English', nativeName: 'English' },
  hi: { name: 'Hindi', nativeName: 'हिन्दी' },
  es: { name: 'Spanish', nativeName: 'Español' },
  fr: { name: 'French', nativeName: 'Français' },
  de: { name: 'German', nativeName: 'Deutsch' },
  zh: { name: 'Chinese', nativeName: '中文' },
} as const;

export type LanguageCode = keyof typeof languages;

// Get device language
const getDeviceLanguage = (): LanguageCode => {
  const locales = Localization.getLocales();
  if (locales && locales.length > 0) {
    const deviceLang = locales[0].languageCode;
    // Check if device language is supported
    if (deviceLang && deviceLang in languages) {
      return deviceLang as LanguageCode;
    }
  }
  return 'en'; // Default to English
};

// Initialize i18next
i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      es: { translation: es },
      fr: { translation: fr },
      de: { translation: de },
      zh: { translation: zh },
    },
    lng: getDeviceLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    compatibilityJSON: 'v4', // Use v4 format for React Native
    react: {
      useSuspense: false, // Disable suspense for React Native
    },
  });

export default i18n;

/**
 * Change app language
 */
export const changeLanguage = async (languageCode: LanguageCode): Promise<void> => {
  await i18n.changeLanguage(languageCode);
};

/**
 * Get current language
 */
export const getCurrentLanguage = (): LanguageCode => {
  return i18n.language as LanguageCode;
};

/**
 * Supported languages array for UI rendering
 */
export const SUPPORTED_LANGUAGES = Object.entries(languages).map(([code, info]) => ({
  code: code as LanguageCode,
  name: info.name,
  nativeName: info.nativeName,
}));

/**
 * Get all available languages
 */
export const getAvailableLanguages = (): Array<{
  code: LanguageCode;
  name: string;
  nativeName: string;
}> => {
  return Object.entries(languages).map(([code, info]) => ({
    code: code as LanguageCode,
    name: info.name,
    nativeName: info.nativeName,
  }));
};
