import { mergeConfig } from 'vite';
import { defineConfig as defineVitestConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineVitestConfig({
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      css: false,
      // jsdom + userEvent cold-start is slow on constrained CI/dev machines; 5s default flakes on the first interaction.
      testTimeout: 20000,
    },
  }),
);
