import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**', 'scripts/**'],
      // Browser-only wiring (fetch + window assignment + DOM glue, no logic) —
      // deliberately untested per ho-01.5 Decision 9 / the discipline's documented-exclusion rule.
      // src/cartography-page.js is the ho-05 debug page entry, same character as main.js.
      exclude: ['src/main.js', 'src/cartography-page.js'],
      thresholds: { lines: 90, branches: 90, functions: 90, statements: 90 },
    },
  },
});
