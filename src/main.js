/**
 * Page entry point. Wires the Indexer and exposes it for console verification —
 * the placeholder page doubles as ho-02's verification surface (ho-01.5
 * Decision 9). Browser-only wiring, no logic — excluded from coverage by design
 * (vitest.config.mjs).
 */
import { createIndexer, loadWorks } from './indexer.js';

const indexer = createIndexer(await loadWorks('./works.json'));

// Console verification surface: `indexer.getWork('kanyo')` etc. on the served page.
window.indexer = indexer;
console.log(`初心の園 — Shoshin no Sono. Indexer ready: ${indexer.works().length} works indexed.`);
