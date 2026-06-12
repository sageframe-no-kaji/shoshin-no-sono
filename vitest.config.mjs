import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**', 'scripts/**'],
      // src/main.js is browser-only wiring (fetch + window assignment, no logic) —
      // deliberately untested per ho-01.5 Decision 9 / the discipline's documented-exclusion rule.
      exclude: ['src/main.js'],
      thresholds: { lines: 90, branches: 90, functions: 90, statements: 90 },
    },
  },
});
