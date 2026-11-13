import type { enComponents } from './en.components';
import type { Translations } from './types';

/** Hindi strings: components area. Typed against the English tree so a missing key fails the build. */
export const hiComponents: Translations<typeof enComponents> = {
  ui: {
    dismiss: 'हटाएँ',
  },
  shell: {
    language: 'भाषा',
    closeMenu: 'मेनू बंद करें',
    openMenu: 'मेनू खोलें',
    trackBusLive: 'बस को लाइव ट्रैक करें',
    trackBus: 'बस ट्रैक करें',
  },
  geo: {
    country: 'देश',
    state: 'राज्य',
    region: 'क्षेत्र',
    district: 'ज़िला',
    allCountries: 'सभी देश',
    allStates: 'सभी राज्य',
    allRegions: 'सभी क्षेत्र',
    allDistricts: 'सभी ज़िले',
    allCustom: 'सभी {{label}}',
    searchInstead: 'खोजें',
    searchPlaceholder: 'जैसे पुणे',
    noMatch: '"{{query}}" से मेल खाता कोई {{label}} नहीं मिला',
    searchFailed: 'खोज विफल रही',
    clearFilters: 'फ़िल्टर हटाएँ',
    filterByRoute: 'रूट के अनुसार फ़िल्टर करें',
    allRoutes: 'सभी रूट',
    location: 'स्थान',
    pinned: '{{lat}}, {{lng}} पर पिन किया गया - बदलने के लिए क्लिक करें।',
    clickToPin: 'पिन लगाने के लिए नक्शे पर क्लिक करें।',
  },
};
