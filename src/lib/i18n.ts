import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { enAttendance } from './locales/en.attendance';
import { hiAttendance } from './locales/hi.attendance';
import { enBase } from './locales/en.base';
import { hiBase } from './locales/hi.base';
import { enCommon } from './locales/en.common';
import { hiCommon } from './locales/hi.common';
import { enPublic } from './locales/en.public';
import { hiPublic } from './locales/hi.public';
import { enParent } from './locales/en.parent';
import { hiParent } from './locales/hi.parent';
import { enDriverApp } from './locales/en.driverApp';
import { hiDriverApp } from './locales/hi.driverApp';
import { enAdmin } from './locales/en.admin';
import { hiAdmin } from './locales/hi.admin';
import { enPlatform } from './locales/en.platform';
import { hiPlatform } from './locales/hi.platform';
import { enSchool } from './locales/en.school';
import { hiSchool } from './locales/hi.school';
import { enTeacher } from './locales/en.teacher';
import { hiTeacher } from './locales/hi.teacher';
import { enComponents } from './locales/en.components';
import { hiComponents } from './locales/hi.components';
import { enUi } from './locales/en.ui';
import { hiUi } from './locales/hi.ui';

type Tree = { [key: string]: string | Tree };

/**
 * Deep-merges locale files. Each file owns its own top-level keys, so this only matters where two
 * files legitimately extend the same branch (e.g. `nav`, `driver`). The Hindi files are typed
 * against their English twin (see locales/types.ts), so a key missing from Hindi fails the build.
 */
function mergeTrees(...trees: object[]): Tree {
  const out: Tree = {};
  for (const tree of trees as Tree[]) {
    for (const [key, value] of Object.entries(tree)) {
      const existing = out[key];
      out[key] =
        typeof value === 'object' && value !== null && typeof existing === 'object' && existing !== null
          ? mergeTrees(existing, value)
          : value;
    }
  }
  return out;
}

export const resources = {
  en: {
    translation: mergeTrees(
      enCommon,
      enBase,
      enAttendance,
      enPublic,
      enParent,
      enDriverApp,
      enAdmin,
      enPlatform,
      enSchool,
      enTeacher,
      enComponents,
      enUi,
    ),
  },
  hi: {
    translation: mergeTrees(
      hiCommon,
      hiBase,
      hiAttendance,
      hiPublic,
      hiParent,
      hiDriverApp,
      hiAdmin,
      hiPlatform,
      hiSchool,
      hiTeacher,
      hiComponents,
      hiUi,
    ),
  },
};

/** Exported so tests can await readiness before rendering - see src/test/setup.ts. init() resolves asynchronously even with inline resources (no HTTP backend), so a component under test can otherwise render before translations are loaded and see raw keys instead of resolved strings. */
export const i18nReady = i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

export default i18n;
