/**
 * The Indexer — the only component that knows the on-disk shape of works.json.
 *
 * Loads once per page session, builds the derived runtime structures (inverse
 * edge index, settlement weights, membership sets), and exposes a read-only
 * query API. Downstream components (the Cartographer, the Garden Gate, the
 * grid view) query this module and never parse raw catalog JSON.
 *
 * Decisions encoded here are recorded in ho-process/hos/ho-02-the-indexer.md:
 * pure factory with loading separated from construction; symmetric and inverse
 * edge types normalized at build so declaration location is invisible to
 * callers; settlementWeight = ln(sum of documents strengths), 0 when none;
 * throw on referential corruption at construction; no cartographic role
 * semantics (peaks-vs-towns belongs to ho-05).
 */

/**
 * @typedef {Object} RawEdge
 * @property {string} target
 * @property {string} type
 * @property {number | null} [strength]
 * @property {string | null} [articulated_in]
 * @property {string | null} [note]
 */

/**
 * @typedef {Object} Edge
 * @property {string} source
 * @property {string} target
 * @property {string} type
 * @property {number | null} strength
 * @property {string | null} articulated_in
 * @property {string | null} note
 * @property {string} declaredOn The work id the edge is authored on in works.json.
 */

/**
 * @typedef {Object} Deployment
 * @property {string} label
 * @property {string | null} url
 */

/**
 * @typedef {Object} Work The runtime shape of a works.json entry (schema.json v4).
 * @property {string} id
 * @property {string} name
 * @property {string | null} native_script
 * @property {string | null} native_translation
 * @property {string | null} hero
 * @property {number} importance
 * @property {string | null} color
 * @property {boolean} featured
 * @property {string[]} media
 * @property {string} group
 * @property {string[]} themes
 * @property {string} status
 * @property {string[]} tags
 * @property {string | null} repo
 * @property {string | null} license
 * @property {Deployment[]} deployment
 * @property {string | null} tech_stack
 * @property {string | null} publication_date
 * @property {string | null} outlet
 * @property {number | null} word_count
 * @property {string | null} embed_url
 * @property {string | null} personal_stake
 * @property {string} created
 * @property {string} last_updated
 * @property {string} short_description
 * @property {string[]} substantive_description
 * @property {RawEdge[]} relationships
 * @property {{ preview: { url: string, alt: string } | null, gallery: Array<{ url: string, alt: string, caption?: string | null }> }} images
 * @property {number} sort_order_within_group
 */

/**
 * @typedef {Object} WorkGroup
 * @property {string} id
 * @property {number} number
 * @property {string} name
 * @property {string} intro
 */

/**
 * @typedef {Object} CatalogData
 * @property {Work[]} works
 * @property {WorkGroup[]} work_groups
 * @property {Record<string, string>} theme_vocabulary
 */

/** Symmetric types are stored once on either endpoint; the index mirrors them. */
const SYMMETRIC_TYPES = new Set(['paired_with', 'companion_to']);

/**
 * Fetch and parse works.json. The only I/O in the module — construction itself
 * is pure so the index is testable from fixtures. "Hot reload" during
 * development is re-fetch, re-construct, re-assign (a page refresh).
 * @param {string} [url]
 * @returns {Promise<CatalogData>}
 */
export async function loadWorks(url = './works.json') {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: HTTP ${res.status}`);
  return res.json();
}

/**
 * Build the index over parsed catalog data and return the read-only query API.
 * Construction is eager — every derived structure is computed here, which is
 * also what lets referential corruption surface immediately as a throw.
 * @param {CatalogData} data
 */
export function createIndexer(data) {
  const allWorks = data.works;
  /** @type {Map<string, Work>} */
  const byId = new Map(allWorks.map((w) => [w.id, w]));

  // Referential integrity — fail loudly at construction. The validator and
  // (later) the build pipeline make this unreachable; if it happens anyway the
  // data is corrupted in a way the practitioner must see immediately.
  for (const w of allWorks) {
    for (const r of w.relationships) {
      if (!byId.has(r.target)) {
        throw new Error(`Indexer: dangling relationship target ${w.id} -> ${r.target} (${r.type})`);
      }
      if (r.articulated_in != null && !byId.has(r.articulated_in)) {
        throw new Error(
          `Indexer: dangling articulated_in ${w.id} -> ${r.target}: ${r.articulated_in}`,
        );
      }
    }
  }

  // Normalized edge list. Symmetric types mirror to both endpoints; `succeeds`
  // declarations convert to canonical `succeeded_by` with direction flipped.
  /** @type {Edge[]} */
  const edges = [];
  for (const w of allWorks) {
    for (const r of w.relationships) {
      const base = {
        type: r.type,
        strength: r.strength ?? null,
        articulated_in: r.articulated_in ?? null,
        note: r.note ?? null,
        declaredOn: w.id,
      };
      if (r.type === 'succeeds') {
        // "A succeeds B" ≡ "B succeeded_by A" — store canonical direction only.
        edges.push(Object.freeze({ ...base, type: 'succeeded_by', source: r.target, target: w.id }));
      } else {
        edges.push(Object.freeze({ ...base, source: w.id, target: r.target }));
        if (SYMMETRIC_TYPES.has(r.type)) {
          edges.push(Object.freeze({ ...base, source: r.target, target: w.id }));
        }
      }
    }
  }

  /** @type {Map<string, Edge[]>} */
  const outgoing = new Map();
  /** @type {Map<string, Edge[]>} */
  const incoming = new Map();
  for (const e of edges) {
    const out = outgoing.get(e.source) ?? [];
    out.push(e);
    outgoing.set(e.source, out);
    const inc = incoming.get(e.target) ?? [];
    inc.push(e);
    incoming.set(e.target, inc);
  }

  // Settlement weights: ln(sum of documents-edge strengths) per work, 0 when the
  // work has no documents edges (legitimately the case for some writing — see
  // ho-01 surfacings). Level mapping (hamlet→city) belongs to ho-07.
  /** @type {Map<string, number>} */
  const settlementWeights = new Map();
  for (const w of allWorks) {
    const sum = (outgoing.get(w.id) ?? [])
      .filter((e) => e.type === 'documents')
      .reduce((acc, e) => acc + (e.strength ?? 0), 0);
    settlementWeights.set(w.id, sum > 0 ? Math.log(sum) : 0);
  }

  // Membership maps.
  /** @type {Map<string, Work[]>} */
  const byTheme = new Map();
  /** @type {Map<string, Work[]>} */
  const byMedia = new Map();
  /** @type {Map<string, Work[]>} */
  const byStatus = new Map();
  /** @type {Map<string, Work[]>} */
  const byGroup = new Map();
  for (const w of allWorks) {
    for (const t of w.themes) byTheme.set(t, [...(byTheme.get(t) ?? []), w]);
    for (const m of w.media) byMedia.set(m, [...(byMedia.get(m) ?? []), w]);
    byStatus.set(w.status, [...(byStatus.get(w.status) ?? []), w]);
    byGroup.set(w.group, [...(byGroup.get(w.group) ?? []), w]);
  }
  for (const list of byGroup.values()) {
    list.sort((a, b) => a.sort_order_within_group - b.sort_order_within_group);
  }
  const groupsSorted = [...data.work_groups].sort((a, b) => a.number - b.number);

  /**
   * @param {Edge[]} list
   * @param {string} [edgeType]
   * @returns {Edge[]}
   */
  const filterByType = (list, edgeType) =>
    edgeType == null ? [...list] : list.filter((e) => e.type === edgeType);

  /**
   * Re-express a canonical succeeded_by edge through the `succeeds` alias —
   * same relationship, direction flipped.
   * @param {Edge} e
   * @returns {Edge}
   */
  const asSucceeds = (e) =>
    Object.freeze({ ...e, type: 'succeeds', source: e.target, target: e.source });

  const api = {
    /** @param {string} id @returns {Work | undefined} */
    getWork(id) {
      return byId.get(id);
    },

    /**
     * Edges pointing at `id`. Symmetric edges answer from both endpoints;
     * `succeeds` is accepted as an alias of the canonical `succeeded_by`.
     * @param {string} id @param {string} [edgeType] @returns {Edge[]}
     */
    getIncoming(id, edgeType) {
      if (edgeType === 'succeeds') {
        // "X succeeds id" ≡ "id succeeded_by X" — outgoing canonical edges, flipped.
        return (outgoing.get(id) ?? [])
          .filter((e) => e.type === 'succeeded_by')
          .map(asSucceeds);
      }
      return filterByType(incoming.get(id) ?? [], edgeType);
    },

    /**
     * Edges from `id`. Same symmetric and alias semantics as getIncoming.
     * @param {string} id @param {string} [edgeType] @returns {Edge[]}
     */
    getOutgoing(id, edgeType) {
      if (edgeType === 'succeeds') {
        // "id succeeds X" ≡ "X succeeded_by id" — incoming canonical edges, flipped.
        return (incoming.get(id) ?? [])
          .filter((e) => e.type === 'succeeded_by')
          .map(asSucceeds);
      }
      return filterByType(outgoing.get(id) ?? [], edgeType);
    },

    /** @returns {Work[]} */
    works() {
      return [...allWorks];
    },

    /** Work groups ordered by display number. @returns {WorkGroup[]} */
    groups() {
      return [...groupsSorted];
    },

    /** @param {string} groupId @returns {Work[]} ordered by sort_order_within_group */
    worksByGroup(groupId) {
      return [...(byGroup.get(groupId) ?? [])];
    },

    /** @param {string} theme @returns {Work[]} */
    worksByTheme(theme) {
      return [...(byTheme.get(theme) ?? [])];
    },

    /** @param {string} media @returns {Work[]} */
    worksByMedia(media) {
      return [...(byMedia.get(media) ?? [])];
    },

    /** @param {string} status @returns {Work[]} */
    worksByStatus(status) {
      return [...(byStatus.get(status) ?? [])];
    },

    /**
     * ln(sum of documents-edge strengths); 0 for works with no documents edges.
     * @param {string} workId @returns {number}
     */
    settlementWeight(workId) {
      return settlementWeights.get(workId) ?? 0;
    },

    /**
     * The id of the writing that articulates the given edge, or null.
     * @param {string} fromId @param {string} toId @param {string} type
     * @returns {string | null}
     */
    articulatesEdge(fromId, toId, type) {
      const e = api.getOutgoing(fromId, type).find((x) => x.target === toId);
      return e?.articulated_in ?? null;
    },
  };

  return Object.freeze(api);
}
