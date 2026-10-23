import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
const en = { home: 'Overview', repos: 'Repositories', import: 'Import', activity: 'Activity', settings: 'Settings' };
const fr = { home: 'Accueil', repos: 'Dépôts', import: 'Importer', activity: 'Activité', settings: 'Réglages' };
if (!i18n.isInitialized) {
  // eslint-disable-next-line import/no-named-as-default-member
  void i18n.use(initReactI18next).init({ resources: { en: { translation: en }, fr: { translation: fr } }, lng: getLocales()[0]?.languageCode === 'fr' ? 'fr' : 'en', fallbackLng: 'en', interpolation: { escapeValue: false } });
}
export default i18n;
