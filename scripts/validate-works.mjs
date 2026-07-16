#!/usr/bin/env node
/**
 * Structural validator for works.json against the schema.json contract.
 *
 * schema.json is a descriptive contract (prose-annotated reference), not a strict
 * JSON Schema document, so off-the-shelf validators can't enforce it — the rules
 * live here as executable checks instead. Ported from the ephemeral checks run
 * during ho-01's editorial session (see ho-process/hos/ho-01-surfacings.md).
 *
 * Consumers: pre-commit, the test suite, and (later) the GitHub Action pipeline.
 */
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const MEDIA = new Set(['software', 'writing', 'website', 'image', 'talk', 'methodology']);

const STATUS = new Set([
  'shipped',
  'live',
  'in-development',
  'scaffolded',
  'archived',
  'published',
  'near-publication',
]);

const REL_TYPES = new Set([
  'descends_from',
  'paired_with',
  'companion_to',
  'operationalizes',
  'personalizes',
  'integrates',
  'succeeded_by',
  'succeeds',
  'validates',
  'uses_pedagogy_of',
  'documents',
  'argues_for',
  'responds_to',
  'illustrates',
]);

const REQUIRED_FIELDS = [
  'id',
  'name',
  'native_script',
  'native_translation',
  'hero',
  'importance',
  'color',
  'featured',
  'media',
  'group',
  'themes',
  'status',
  'tags',
  'repo',
  'license',
  'deployment',
  'tech_stack',
  'publication_date',
  'outlet',
  'word_count',
  'embed_url',
  'personal_stake',
  'created',
  'last_updated',
  'short_description',
  'substantive_description',
  'relationships',
  'images',
  'sort_order_within_group',
];

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A well-formed ISO-8601 calendar date (`YYYY-MM-DD`) that also parses.
 * @param {any} v
 * @returns {boolean}
 */
const isIsoDate = (v) => typeof v === 'string' && DATE_RE.test(v) && !Number.isNaN(Date.parse(v));

/**
 * Validate a parsed works.json document. Returns a list of human-readable errors;
 * an empty list means the document conforms.
 * @param {any} data
 * @returns {string[]}
 */
export function validateWorks(data) {
  /** @type {string[]} */
  const errors = [];
  const works = Array.isArray(data?.works) ? data.works : [];
  const groups = new Set((data?.work_groups ?? []).map((/** @type {any} */ g) => g.id));
  const themes = new Set(Object.keys(data?.theme_vocabulary ?? {}));

  const numbers = (data?.work_groups ?? [])
    .map((/** @type {any} */ g) => g.number)
    .sort((/** @type {number} */ a, /** @type {number} */ b) => a - b);
  if (!numbers.every((/** @type {number} */ n, /** @type {number} */ i) => n === i + 1)) {
    errors.push(`work_groups numbers are not contiguous 1..N: ${numbers.join(', ')}`);
  }

  const ids = new Set();
  for (const w of works) {
    if (ids.has(w.id)) errors.push(`duplicate id: ${w.id}`);
    ids.add(w.id);
  }
  const byId = new Map(works.map((/** @type {any} */ w) => [w.id, w]));

  // families (schema v5, keisaku-derived — optional until the data lands;
  // validated strictly wherever present).
  const CLOSENESS = new Set(['bonded', 'shared-code', 'suite', 'kindred']);
  const HEX_RE = /^#[0-9a-fA-F]{6}$/;
  const familyIds = new Set();
  const familyById = new Map();
  for (const f of data?.families ?? []) {
    const fid = f.id ?? '<missing family id>';
    if (typeof f.id !== 'string' || !SLUG_RE.test(f.id)) {
      errors.push(`family ${fid}: id is not a kebab-case slug`);
    }
    if (familyIds.has(f.id)) errors.push(`duplicate family id: ${f.id}`);
    familyIds.add(f.id);
    familyById.set(f.id, f);
    if (typeof f.name !== 'string' || f.name.length === 0) {
      errors.push(`family ${fid}: name is required`);
    }
    if (!CLOSENESS.has(f.closeness)) {
      errors.push(`family ${fid}: closeness must be bonded | shared-code | suite | kindred`);
    }
    if (f.peak_id != null && !byId.has(f.peak_id)) {
      errors.push(`family ${fid}: dangling peak_id ${f.peak_id}`);
    }
    if (f.description != null && typeof f.description !== 'string') {
      errors.push(`family ${fid}: description must be a string or null`);
    }
    if (f.color != null && (typeof f.color !== 'string' || !HEX_RE.test(f.color))) {
      errors.push(`family ${fid}: color must be a #rrggbb hex string or null`);
    }
  }
  // parent (schema v5.1): a range within a range, one level deep. Validated
  // after the first pass so forward references between families resolve.
  for (const f of data?.families ?? []) {
    if (f.parent == null) continue;
    const fid = f.id ?? '<missing family id>';
    const parent = familyById.get(f.parent);
    if (f.parent === f.id) {
      errors.push(`family ${fid}: parent references itself`);
    } else if (!parent) {
      errors.push(`family ${fid}: dangling parent ${f.parent}`);
    } else if (parent.parent != null) {
      errors.push(`family ${fid}: parent ${f.parent} is itself a child range — one level deep only`);
    }
  }

  for (const w of works) {
    const id = w.id ?? '<missing id>';
    for (const f of REQUIRED_FIELDS) {
      if (!(f in w)) errors.push(`${id}: missing field ${f}`);
    }
    if (typeof w.id !== 'string' || !SLUG_RE.test(w.id)) {
      errors.push(`${id}: id is not a kebab-case slug`);
    }
    if (!Number.isInteger(w.importance) || w.importance < 1 || w.importance > 10) {
      errors.push(`${id}: importance must be an integer 1-10`);
    }
    const media = Array.isArray(w.media) ? w.media : [];
    if (media.length === 0 || !media.every((/** @type {string} */ m) => MEDIA.has(m))) {
      errors.push(`${id}: media must be a non-empty subset of the media vocabulary`);
    }
    if (!groups.has(w.group)) errors.push(`${id}: unknown group ${w.group}`);
    // family / peak (schema v5) — optional fields; strict when present.
    if (w.family != null && !familyIds.has(w.family)) {
      errors.push(`${id}: unknown family ${w.family}`);
    }
    if (w.peak != null) {
      if (w.peak !== 'peak' && w.peak !== 'sub-peak') {
        errors.push(`${id}: peak must be 'peak' | 'sub-peak' | null`);
      }
      if (w.family == null) {
        errors.push(`${id}: peak is set but family is null — peak is a role within a family`);
      }
    }
    // peak_of (schema v5.1): a sub-peak's anchor when it nests against a named
    // sibling rather than the family summit.
    if (w.peak_of != null) {
      if (w.peak !== 'sub-peak') {
        errors.push(`${id}: peak_of is set but peak is not 'sub-peak'`);
      }
      const anchor = byId.get(w.peak_of);
      if (w.peak_of === w.id) {
        errors.push(`${id}: peak_of references itself`);
      } else if (!anchor) {
        errors.push(`${id}: dangling peak_of ${w.peak_of}`);
      } else if (anchor.family !== w.family) {
        errors.push(`${id}: peak_of ${w.peak_of} is not in the same family`);
      }
    }
    const wThemes = Array.isArray(w.themes) ? w.themes : [];
    if (
      wThemes.length < 1 ||
      wThemes.length > 3 ||
      !wThemes.every((/** @type {string} */ t) => themes.has(t))
    ) {
      errors.push(`${id}: themes must be 1-3 entries from the theme vocabulary`);
    }
    if (!STATUS.has(w.status)) errors.push(`${id}: unknown status ${w.status}`);
    for (const f of ['created', 'last_updated']) {
      if (!isIsoDate(w[f])) {
        errors.push(`${id}: ${f} is not an ISO date`);
      }
    }
    // conceived: origin date (ho-07.1 — the ho-07.2 emergence rise). Required and
    // ISO for non-archived works; archived pre-history may predate reliable
    // records, so it is optional there but still ISO-validated when present.
    if (w.status === 'archived') {
      if (w.conceived != null && !isIsoDate(w.conceived)) {
        errors.push(`${id}: conceived is not an ISO date`);
      }
    } else if (!isIsoDate(w.conceived)) {
      errors.push(`${id}: conceived is required and must be an ISO date for non-archived works`);
    }
    // named: optional later-naming date (the ho-07.2 pulse); ISO when present.
    if (w.named != null && !isIsoDate(w.named)) {
      errors.push(`${id}: named is not an ISO date`);
    }
    if (media.includes('writing') && !w.publication_date) {
      errors.push(`${id}: writing media requires publication_date`);
    }
    if (!media.includes('software') && !media.includes('website') && w.tech_stack != null) {
      errors.push(`${id}: tech_stack populated on a non-software, non-website work`);
    }
    if (!Number.isInteger(w.sort_order_within_group)) {
      errors.push(`${id}: sort_order_within_group must be an integer`);
    }

    for (const r of w.relationships ?? []) {
      const label = `${id} -> ${r.target} (${r.type})`;
      if (!REL_TYPES.has(r.type)) errors.push(`${label}: unknown relationship type`);
      if (r.type === 'documents') {
        if (![1, 2, 3].includes(r.strength)) {
          errors.push(`${label}: documents edge requires strength 1, 2, or 3`);
        }
      } else if (r.strength != null) {
        errors.push(`${label}: strength must be null for non-documents edges`);
      }
      if (!byId.has(r.target)) errors.push(`${label}: dangling target`);
      if (r.articulated_in != null) {
        const art = byId.get(r.articulated_in);
        if (!art) {
          errors.push(`${label}: dangling articulated_in ${r.articulated_in}`);
        } else if (!(art.media ?? []).includes('writing')) {
          errors.push(`${label}: articulated_in ${r.articulated_in} is not a writing work`);
        }
      }
    }
  }
  return errors;
}

/* v8 ignore start -- CLI entry guard, the __main__ analog: exercised by humans and
   pre-commit, not by the unit suite. The validation logic above is fully tested. */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const path = process.argv[2] ?? 'works.json';
  const data = JSON.parse(readFileSync(path, 'utf8'));
  const errors = validateWorks(data);
  if (errors.length > 0) {
    console.error(`✗ ${path}: ${errors.length} error(s)`);
    for (const e of errors) console.error(`  ${e}`);
    process.exit(1);
  }
  console.log(`✓ ${path}: ${data.works.length} works valid`);
}
/* v8 ignore stop */
