/**
 * Browser-global declarations. The Indexer instance is exposed on window as the
 * console-verification surface (ho-01.5 Decision 9 / ho-02 done-means).
 */
interface Window {
  indexer?: ReturnType<typeof import('./indexer.js').createIndexer>;
}
