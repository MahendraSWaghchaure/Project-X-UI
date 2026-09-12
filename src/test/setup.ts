import '@testing-library/jest-dom/vitest';
import { i18nReady } from '@/lib/i18n';

// Components under test call useTranslation() directly, but i18n.ts (which calls i18next.init())
// is otherwise only imported from main.tsx, which the test environment never runs - without this,
// every t('some.key') call renders the raw key instead of resolved text (see LoginPage.test.tsx,
// which is exactly what surfaced this).
await i18nReady;
