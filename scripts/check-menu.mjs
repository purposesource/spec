#!/usr/bin/env node
/**
 * Gate: the category menu is published ONCE, and every copy of it is identical.
 *
 * The seven public-benefit categories are the one vocabulary that decides where money
 * goes. They therefore have exactly one publication — `examples/category-menu.v1.example.json`
 * — and everything else that names a category carries a COPY of the slug set:
 *
 *   · `schemas/category-menu.v1.json`      `$defs.slug`, `$defs.categoryId`
 *   · `schemas/registry-v0-record.v1.json` `$defs.categorySlug`
 *   · `schemas/repo-record.v1.json`           `$defs.categorySlug`
 *   · the curated registry repository       a byte-identical vendored copy of the menu
 *
 * The copies exist because `check-schemas.mjs` forbids an external `$ref`: a published
 * schema must validate on its own download, so a shared enum cannot be referenced across
 * files. That is a deliberate trade — self-containment for a consumer, drift risk for us —
 * and this gate is the other half of it. Two lists kept level by convention drift; two
 * lists with an equality assertion between them cannot.
 *
 * What is checked:
 *
 *   1. the menu example validates as an instance (that is `check-examples.mjs`'s job) AND
 *      its slugs are exactly `category-menu.v1.json#/$defs/slug`, in no particular order;
 *   2. `category_id` is `cat-{slug}` for every row, and the `$defs.categoryId` enum is the
 *      same seven ids — the agreement JSON Schema cannot express;
 *   3. every OTHER schema in this repository that carries a closed category-slug enum
 *      carries the SAME seven values. A new schema with a category enum is picked up
 *      automatically: the rule is "any `$defs` entry whose name mentions category and
 *      whose form is an enum", so nobody has to remember to register it here;
 *   4. the published `categories` order is the order Art. 7 of the statutes lists them,
 *      because the surfaces render it in that order.
 *
 * Run: node scripts/check-menu.mjs
 */
import { join } from 'node:path';

import { EXAMPLE_DIR, listSchemas, readJson, fail } from './lib/spec.mjs';

const MENU_SCHEMA = 'category-menu.v1.json';
const MENU_EXAMPLE = 'category-menu.v1.example.json';

// The statutes' own order (Art. 7). Written out rather than derived, because "the order
// the file happens to be in" is not an assertion — this is the published sequence and a
// reordering of the menu must be a deliberate edit here too.
const PUBLISHED_ORDER = [
  'health',
  'education',
  'poverty-relief',
  'humanitarian-aid',
  'environment',
  'animal-welfare',
  'research',
];

const problems = [];
const schemas = listSchemas();

const menuSchema = schemas.find((s) => s.file === MENU_SCHEMA)?.json;
if (!menuSchema) {
  fail([`schemas/${MENU_SCHEMA} is missing — it is the publication of the category menu`], '');
}

const slugEnum = menuSchema.$defs?.slug?.enum;
const idEnum = menuSchema.$defs?.categoryId?.enum;
if (!Array.isArray(slugEnum) || slugEnum.length === 0) {
  problems.push(`schemas/${MENU_SCHEMA}: $defs.slug must be a non-empty enum — it is the canonical slug set`);
}
if (!Array.isArray(idEnum) || idEnum.length === 0) {
  problems.push(`schemas/${MENU_SCHEMA}: $defs.categoryId must be a non-empty enum`);
}

const sorted = (values) => [...values].sort().join(',');

/* ------------------------------------------------------- 1 + 2: the menu itself */

const menu = readJson(join(EXAMPLE_DIR, MENU_EXAMPLE));
const rows = Array.isArray(menu.categories) ? menu.categories : [];

if (rows.length === 0) {
  problems.push(`examples/${MENU_EXAMPLE}: no categories — this gate would pass vacuously`);
} else if (Array.isArray(slugEnum)) {
  const menuSlugs = rows.map((row) => row.slug);
  if (sorted(menuSlugs) !== sorted(slugEnum)) {
    problems.push(
      `examples/${MENU_EXAMPLE}: the slug set (${sorted(menuSlugs)}) differs from ` +
        `schemas/${MENU_SCHEMA}#/$defs/slug (${sorted(slugEnum)}). The menu and its schema are ` +
        `one publication; change them in the same commit.`,
    );
  }
  const seen = new Set();
  for (const row of rows) {
    if (seen.has(row.slug)) problems.push(`examples/${MENU_EXAMPLE}: duplicate slug ${row.slug}`);
    seen.add(row.slug);
    if (row.category_id !== `cat-${row.slug}`) {
      problems.push(
        `examples/${MENU_EXAMPLE}: category_id for "${row.slug}" must be "cat-${row.slug}", ` +
          `found ${JSON.stringify(row.category_id)}. The ledger's identifier is derived from the ` +
          `slug, never chosen.`,
      );
    }
  }
  if (Array.isArray(idEnum)) {
    const derived = menuSlugs.map((slug) => `cat-${slug}`);
    if (sorted(derived) !== sorted(idEnum)) {
      problems.push(
        `schemas/${MENU_SCHEMA}: $defs.categoryId (${sorted(idEnum)}) is not $defs.slug with the ` +
          `\`cat-\` prefix (${sorted(derived)})`,
      );
    }
  }
}

/* --------------------------------------- 3: every other copy of the closed slug set */

let copies = 0;
for (const { file, json } of schemas) {
  if (file === MENU_SCHEMA) continue;
  for (const [name, def] of Object.entries(json.$defs ?? {})) {
    if (!/categor/i.test(name)) continue;
    if (!Array.isArray(def.enum)) continue; // a pattern-based slug type is deliberately open
    copies += 1;
    const expected = /id$/i.test(name) && Array.isArray(idEnum) ? idEnum : slugEnum;
    if (Array.isArray(expected) && sorted(def.enum) !== sorted(expected)) {
      problems.push(
        `schemas/${file}: $defs.${name} (${sorted(def.enum)}) differs from the published menu ` +
          `(${sorted(expected)}). Schemas here are self-contained, so each carries its own copy of ` +
          `the enum — and every copy must be the same seven categories.`,
      );
    }
  }
}

/* ----------------------------------------------------------- 4: the published order */

if (rows.length > 0 && rows.map((row) => row.slug).join(',') !== PUBLISHED_ORDER.join(',')) {
  problems.push(
    `examples/${MENU_EXAMPLE}: the categories are published in the order the statutes list them ` +
      `(${PUBLISHED_ORDER.join(', ')}), because the allocation surfaces render them in that order. ` +
      `Found: ${rows.map((row) => row.slug).join(', ')}.`,
  );
}

fail(
  problems,
  `the category menu is one list of ${rows.length}: schemas/${MENU_SCHEMA}, examples/${MENU_EXAMPLE}, ` +
    `and ${copies} in-schema cop${copies === 1 ? 'y' : 'ies'} all carry the same slugs`,
);
