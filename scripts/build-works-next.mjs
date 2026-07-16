#!/usr/bin/env node
/**
 * Corpus-inject merge: composes works.json (editorial base) + keisaku's
 * aggregate public.json (derived freshness) + metadata/corpus-overlay.json
 * (this session's human judgment) into works.next.json — the candidate
 * catalog reviewed on the side and merged into works.json by hand when ready.
 *
 * Re-runnable by design: when keisaku regenerates public.json, run this again
 * and the overlay's judgment survives (the keisaku derived/editorial doctrine,
 * applied one level down). See the overlay's $comment and $flags for the
 * per-decision record.
 *
 *   node scripts/build-works-next.mjs [path/to/public.json]
 *
 * Merge policy, field by field:
 * - Shared works whose media matches the public record ("same view"): the
 *   public side wins on derived freshness (last_updated, tech_stack, tags,
 *   word_count, status, license, descriptions when it carries them — repo
 *   description contracts are the newer authored truth); the local side wins
 *   on editorial identity (name, hero, importance, color, group, themes,
 *   conceived/named/created, personal_stake, images, outlet, publication_date).
 * - Shared works whose media differs (public holds a different *view* of the
 *   same id — e.g. the pink-teaming manifesto essay vs. the site work): only
 *   deployments and last_updated merge in.
 * - Relationships merge by (target, type): public refreshes note /
 *   articulated_in / strength on existing edges and appends new ones; an
 *   overlay patch with `relationships` replaces the merged set outright.
 * - Injected works (overlay `include`) scaffold every schema field, take what
 *   public.json carries, then apply the overlay patch. Works public.json has
 *   no record of (overlay `new_works`) are authored wholesale in the overlay.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { validateWorks } from './validate-works.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Fields the public (derived) side wins on for same-view merges. */
const FRESH_FIELDS = ['last_updated', 'tech_stack', 'word_count', 'status', 'license'];

/**
 * Normalize a repo reference to a public https URL.
 * git@github-no-kaji:org/repo.git → https://github.com/org/repo
 * @param {string | null | undefined} repo
 * @returns {string | null}
 */
export function normalizeRepo(repo) {
  if (repo == null) return null;
  const ssh = repo.match(/^git@[^:]+:([^/]+\/.+?)(\.git)?$/);
  const url = ssh ? `https://github.com/${ssh[1]}` : repo;
  return url.replace(/\.git$/, '');
}

/**
 * Later ISO date of the two (either may be missing).
 * @param {string | null | undefined} a
 * @param {string | null | undefined} b
 * @returns {string | null}
 */
const laterDate = (a, b) => {
  if (a == null) return b ?? null;
  if (b == null) return a;
  return a >= b ? a : b;
};

/**
 * Merge deployment lists, deduplicating by URL and dropping URL-less entries
 * from the incoming side (a CTA needs somewhere to go).
 * @param {any[]} base
 * @param {any[]} incoming
 * @returns {any[]}
 */
export function mergeDeployments(base, incoming) {
  const out = [...(base ?? [])];
  const seen = new Set(out.map((d) => d.url).filter(Boolean));
  for (const d of incoming ?? []) {
    if (!d.url || seen.has(d.url)) continue;
    seen.add(d.url);
    out.push({ label: d.label ?? 'Link', url: d.url });
  }
  return out;
}

/**
 * Merge relationship lists keyed by (target, type). Incoming edges refresh
 * note / articulated_in / strength when they carry values; new keys append.
 * @param {any[]} base
 * @param {any[]} incoming
 * @returns {any[]}
 */
export function mergeRelationships(base, incoming) {
  const key = (/** @type {any} */ r) => `${r.target}|${r.type}`;
  const out = (base ?? []).map((r) => ({ ...r }));
  const byKey = new Map(out.map((r) => [key(r), r]));
  for (const r of incoming ?? []) {
    const hit = byKey.get(key(r));
    if (hit) {
      if (r.note != null) hit.note = r.note;
      if (r.articulated_in != null) hit.articulated_in = r.articulated_in;
      if (r.strength != null) hit.strength = r.strength;
    } else {
      const edge = {
        target: r.target,
        type: r.type,
        strength: r.strength ?? null,
        articulated_in: r.articulated_in ?? null,
        note: r.note ?? null,
      };
      byKey.set(key(edge), edge);
      out.push(edge);
    }
  }
  return out;
}

/**
 * Rewrite a public record's id and internal references through the overlay id map.
 * @param {any} rec
 * @param {Record<string, string>} idMap
 * @returns {any}
 */
function applyIdMap(rec, idMap) {
  const mapped = { ...rec, id: idMap[rec.id] ?? rec.id };
  if (Array.isArray(rec.relationships)) {
    mapped.relationships = rec.relationships.map((/** @type {any} */ r) => ({
      ...r,
      target: idMap[r.target] ?? r.target,
      articulated_in: r.articulated_in == null ? r.articulated_in : (idMap[r.articulated_in] ?? r.articulated_in),
    }));
  }
  return mapped;
}

/**
 * The house style for a work's outlet naming.
 * @param {string | null | undefined} outlet
 * @returns {string | null}
 */
const normalizeOutlet = (outlet) =>
  outlet === 'Substack' ? 'Substack — Constructive Interference' : (outlet ?? null);

/** @param {any[]} a @param {any[]} b @returns {boolean} */
const sameMedia = (a, b) => {
  const x = [...(a ?? [])].sort().join(',');
  const y = [...(b ?? [])].sort().join(',');
  return x === y;
};

/**
 * Merge one public record into an existing local work, per the policy above.
 * @param {any} local
 * @param {any} pub
 * @returns {any}
 */
export function mergeSharedWork(local, pub) {
  const out = { ...local };
  out.last_updated = laterDate(local.last_updated, pub.last_updated);
  out.deployment = mergeDeployments(local.deployment, pub.deployment);
  if (!sameMedia(local.media, pub.media)) return out; // different view: freshness only

  for (const f of FRESH_FIELDS) {
    if (f === 'last_updated') continue; // already merged above
    if (pub[f] != null) out[f] = pub[f];
  }
  // tech_stack only belongs on software/website works, whatever the source says.
  const media = out.media ?? [];
  if (!media.includes('software') && !media.includes('website')) out.tech_stack = null;
  if (Array.isArray(pub.tags) && pub.tags.length > 0) out.tags = pub.tags;
  // Descriptions: each repo's authored description contract flows in via
  // keisaku — when the public record carries the substantive form, both
  // description fields are the newer authored truth.
  if (Array.isArray(pub.substantive_description) && pub.substantive_description.length > 0) {
    out.short_description = pub.short_description ?? local.short_description;
    out.substantive_description = pub.substantive_description;
  }
  out.repo = local.repo ?? normalizeRepo(pub.repo);
  out.relationships = mergeRelationships(local.relationships, pub.relationships);
  return out;
}

/**
 * Scaffold a full schema-shaped record for an injected work from its public record.
 * @param {any} pub
 * @returns {any}
 */
export function scaffoldWork(pub) {
  const repo = normalizeRepo(pub.repo);
  const deployment = mergeDeployments([], pub.deployment);
  if (deployment.length === 0 && repo != null) {
    deployment.push({ label: 'GitHub repo', url: repo });
  }
  return {
    id: pub.id,
    name: pub.name,
    native_script: pub.native_script ?? null,
    native_translation: pub.native_translation ?? null,
    hero: pub.hero ?? null,
    importance: pub.importance ?? 1,
    color: null,
    featured: pub.featured ?? false,
    media: pub.media ?? [],
    group: pub.group ?? null,
    family: null,
    peak: null,
    themes: pub.themes ?? [],
    status: pub.status ?? 'in-development',
    tags: pub.tags ?? [],
    repo,
    license: pub.license ?? null,
    deployment,
    tech_stack: pub.tech_stack ?? null,
    publication_date: pub.publication_date ?? null,
    outlet: normalizeOutlet(pub.outlet),
    word_count: pub.word_count ?? null,
    embed_url: null,
    personal_stake: pub.personal_stake ?? null,
    created: pub.created,
    conceived: pub.conceived ?? null,
    last_updated: pub.last_updated ?? pub.created,
    short_description: pub.short_description ?? '',
    substantive_description: pub.substantive_description ?? [],
    relationships: (pub.relationships ?? []).map((/** @type {any} */ r) => ({
      target: r.target,
      type: r.type,
      strength: r.strength ?? null,
      articulated_in: r.articulated_in ?? null,
      note: r.note ?? null,
    })),
    images: { preview: null, gallery: [] },
    sort_order_within_group: 100,
  };
}

/**
 * Compose the candidate catalog.
 * @param {any} local  parsed works.json
 * @param {any} pub    parsed public.json (keisaku aggregate)
 * @param {any} overlay parsed corpus-overlay.json
 * @returns {{ data: any, report: string[] }}
 */
export function buildWorksNext(local, pub, overlay) {
  /** @type {string[]} */
  const report = [];
  const idMap = overlay.id_map ?? {};

  // Public records grouped by (mapped) id — the pink-teaming duplicate means
  // one id can hold several views.
  const pubById = new Map();
  for (const rec of pub.works ?? []) {
    const mapped = applyIdMap(rec, idMap);
    const list = pubById.get(mapped.id) ?? [];
    list.push(mapped);
    pubById.set(mapped.id, list);
  }

  // 1. Existing works, refreshed.
  const works = [];
  for (const w of local.works ?? []) {
    let merged = { ...w };
    for (const rec of pubById.get(w.id) ?? []) {
      merged = mergeSharedWork(merged, rec);
    }
    works.push(merged);
  }
  const localIds = new Set(works.map((w) => w.id));

  // 2. Overlay-authored new works (no public record exists).
  for (const w of overlay.new_works ?? []) {
    works.push({ ...w });
    report.push(`authored: ${w.id}`);
  }

  // 3. Injected works from the public corpus.
  for (const rawId of overlay.include ?? []) {
    const id = idMap[rawId] ?? rawId;
    if (localIds.has(id)) {
      report.push(`skip (already local): ${rawId} -> ${id}`);
      continue;
    }
    const recs = pubById.get(id) ?? [];
    if (recs.length === 0) {
      report.push(`MISSING in public.json: ${rawId}`);
      continue;
    }
    works.push(scaffoldWork(recs[0]));
    report.push(`injected: ${id}`);
  }

  // 4. Editorial patches, last — judgment wins over both sources.
  const byId = new Map(works.map((w) => [w.id, w]));
  for (const [id, patch] of Object.entries(overlay.patch ?? {})) {
    const w = byId.get(id);
    if (!w) {
      report.push(`PATCH TARGET MISSING: ${id}`);
      continue;
    }
    Object.assign(w, patch);
    report.push(`patched: ${id} (${Object.keys(patch).join(', ')})`);
  }

  const data = {
    ...local,
    document: {
      ...local.document,
      last_updated: new Date().toISOString().slice(0, 10),
    },
    families: overlay.families ?? [],
    works,
  };
  return { data, report };
}

/* v8 ignore start -- CLI entry guard: exercised by humans, not the unit suite.
   The merge logic above is what the tests cover. */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const publicPath =
    process.argv[2] ?? join(ROOT, '..', 'keisaku', 'aggregate', 'public.json');
  /** @type {any} */ // JSON.parse is untyped by nature; validated downstream.
  const local = JSON.parse(readFileSync(join(ROOT, 'works.json'), 'utf8'));
  /** @type {any} */
  const pub = JSON.parse(readFileSync(publicPath, 'utf8'));
  /** @type {any} */
  const overlay = JSON.parse(readFileSync(join(ROOT, 'metadata', 'corpus-overlay.json'), 'utf8'));

  const { data, report } = buildWorksNext(local, pub, overlay);
  const outPath = join(ROOT, 'works.next.json');
  writeFileSync(outPath, `${JSON.stringify(data, null, 2)}\n`);

  for (const line of report) console.log(line);
  console.log(`\n${data.works.length} works, ${data.families.length} families -> ${outPath}`);

  const errors = validateWorks(data);
  if (errors.length > 0) {
    console.error(`\n✗ works.next.json: ${errors.length} error(s)`);
    for (const e of errors) console.error(`  ${e}`);
    process.exit(1);
  }
  console.log('✓ works.next.json valid against the schema contract');
}
/* v8 ignore stop */
