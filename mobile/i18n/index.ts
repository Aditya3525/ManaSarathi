/**
 * i18n exports
 * Main entry point for internationalization
 */

import i18n, {
  languages,
  changeLanguage,
  getCurrentLanguage,
  getAvailableLanguages,
  type LanguageCode,
} from './config';

// Export supported languages for UI components
export const SUPPORTED_LANGUAGES = getAvailableLanguages();

// Re-export everything from config
export { languages, changeLanguage, getCurrentLanguage, getAvailableLanguages };
export type { LanguageCode };

// Default export
export default i18n;
