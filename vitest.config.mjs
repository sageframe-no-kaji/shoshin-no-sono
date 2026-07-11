import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**', 'scripts/**'],
      // Browser-only wiring — deliberately untested per ho-01.5 Decision 9 /
      // the discipline's documented-exclusion rule. src/main.js is fetch +
      // window assignment + DOM glue. src/cartography-page.js is the
      // cartography page entry: DOM lookups, tuner panel + event wiring, and
      // the timer-driven emergence player; its pure logic was extracted to
      // tested modules (src/label-map.js, src/beacon-map.js, and the edge
      // assembly in src/cartographer.js).
      exclude: ['src/main.js', 'src/cartography-page.js'],
      thresholds: { lines: 90, branches: 90, functions: 90, statements: 90 },
    },
  },
});
