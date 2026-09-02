// Shared plumbing for the gate scripts. One place to configure the validator, so the
// schema check, the example check and the vector check cannot silently disagree about
// what "valid" means.
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';

import Ajv2020Module from 'ajv/dist/2020.js';
import addFormatsModule from 'ajv-formats';
import { load as loadYaml } from 'js-yaml';

// ajv and ajv-formats ship CommonJS; both shapes appear in the wild depending on the
// bundler that touched them last, so normalise once here rather than at five call sites.
const Ajv2020 = Ajv2020Module.default ?? Ajv2020Module;
const addFormats = addFormatsModule.default ?? addFormatsModule;

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const SCHEMA_DIR = join(ROOT, 'schemas');
export const EXAMPLE_DIR = join(ROOT, 'examples');
export const DIALECT = 'https://json-schema.org/draft/2020-12/schema';

export function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function readYamlFile(path) {
  return loadYaml(readFileSync(path, 'utf8'));
}

export function config() {
  return readJson(join(ROOT, 'spec.config.json'));
}

/** Every published schema, sorted, as { file, path, json }. */
export function listSchemas() {
  return readdirSync(SCHEMA_DIR)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => ({ file: name, path: join(SCHEMA_DIR, name), json: readJson(join(SCHEMA_DIR, name)) }));
}

/**
 * The validator, configured identically for every gate.
 *
 * `strict: true` stays on — it is the setting that catches a typo'd keyword, which is
 * the single most common way a schema quietly stops constraining anything. Two
 * deliberate relaxations:
 *
 *   · `x-psn` is registered as a known keyword. It is the provenance block every schema
 *     in this repository carries (spec version, artifact path, FS references, phase),
 *     and it is an annotation: it never affects validation.
 *   · `strictTypes` is off. Several artifact fields are genuinely `["integer","null"]`
 *     — an honest null is the whole point of the counters artifact — and strictTypes
 *     objects to union types on principle.
 *   · `strictRequired` is off. Conditional rules here are written as
 *     `allOf: [{ if: {...}, then: { required: [...] } }]`, with the properties themselves
 *     declared once at the object root. That is the idiomatic 2020-12 shape and keeps a
 *     property's description in one place; strictRequired wants every conditional branch
 *     to redeclare the property it requires, which would triple the size of the
 *     certificate schema and give the same field three descriptions to drift apart.
 */
export function createAjv() {
  const ajv = new Ajv2020({
    strict: true,
    strictTypes: false,
    strictRequired: false,
    allErrors: true,
    allowUnionTypes: true,
  });
  addFormats(ajv);
  ajv.addKeyword({ keyword: 'x-psn', metaSchema: { type: 'object' } });
  return ajv;
}

/** The validator with every published schema compiled and addressable by $id. */
export function createValidatorWithAllSchemas() {
  const ajv = createAjv();
  const schemas = listSchemas();
  for (const schema of schemas) ajv.addSchema(schema.json, schema.json.$id);
  return { ajv, schemas };
}

/** `purpose-yml.v1.json` -> `purpose-ymlv1json` (the GitHub heading anchor). */
export function changelogAnchor(schemaFile) {
  return schemaFile.toLowerCase().replace(/[^a-z0-9-]/g, '');
}

/** `purpose-yml.v1.json` -> `purpose-yml.v1` */
export function schemaKey(schemaFile) {
  return basename(schemaFile, '.json');
}

export function fail(problems, whatPassed) {
  if (problems.length > 0) {
    for (const problem of problems) console.error(`  ✗ ${problem}`);
    console.error(`\n${problems.length} problem(s).`);
    process.exit(1);
  }
  console.log(whatPassed);
}
