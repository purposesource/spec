#!/usr/bin/env node
/**
 * Gate: every published schema compiles, is addressed correctly, and carries provenance.
 *
 * This is the gate that makes the repository's promise ("machine-readable contracts you
 * can actually consume") mechanically true rather than aspirational. It asserts:
 *
 *   1. the file parses and compiles under JSON Schema draft 2020-12;
 *   2. `$id` is the published URL for that exact filename, derived from spec.config.json
 *      — so renaming the org or the domain is one edit plus a test run, not a hunt;
 *   3. NO EXTERNAL `$ref`. Each schema is self-contained. An OSPO that fetches one file
 *      must be able to validate with that one file — a cross-file reference would turn a
 *      single download into a dependency graph, and a broken link into a broken gate;
 *   4. `title`, a substantive `description`, and an `x-psn` provenance block naming the
 *      spec version, the artifact path, the phase and the FS clauses it implements;
 *   5. a matching section in CHANGELOG.md (VS-05's acceptance test: "schema files carry
 *      versions and changelogs").
 *
 * Run: node scripts/check-schemas.mjs
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ROOT, DIALECT, config, createAjv, listSchemas, changelogAnchor, fail } from './lib/spec.mjs';

const cfg = config();
const schemas = listSchemas();
const changelog = readFileSync(join(ROOT, 'CHANGELOG.md'), 'utf8');
const problems = [];

if (schemas.length === 0) problems.push('schemas/ is empty — this gate would pass vacuously');

const semver = /^[0-9]+\.[0-9]+\.[0-9]+$/;
const seenIds = new Set();

/** Walk every node and collect $ref values, so a nested reference cannot hide. */
function collectRefs(node, out = []) {
  if (Array.isArray(node)) {
    for (const item of node) collectRefs(item, out);
  } else if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      if (key === '$ref' && typeof value === 'string') out.push(value);
      else collectRefs(value, out);
    }
  }
  return out;
}

for (const { file, json } of schemas) {
  const where = `schemas/${file}`;

  if (json.$schema !== DIALECT) {
    problems.push(`${where}: $schema must be ${DIALECT} (found ${JSON.stringify(json.$schema)})`);
  }

  const expectedId = `${cfg.schemaBaseUrl}/${file}`;
  if (json.$id !== expectedId) {
    problems.push(`${where}: $id must be ${expectedId} (found ${JSON.stringify(json.$id)})`);
  }
  if (seenIds.has(json.$id)) problems.push(`${where}: duplicate $id ${json.$id}`);
  seenIds.add(json.$id);

  if (typeof json.title !== 'string' || json.title.length < 5) {
    problems.push(`${where}: needs a title`);
  }
  if (typeof json.description !== 'string' || json.description.length < 120) {
    problems.push(
      `${where}: needs a description that says what the artifact IS and what rule governs it ` +
        `(at least 120 characters — a consumer reads this instead of the FS)`,
    );
  }

  const provenance = json['x-psn'];
  if (!provenance || typeof provenance !== 'object') {
    problems.push(`${where}: missing the x-psn provenance block`);
  } else {
    if (!semver.test(String(provenance.specVersion ?? ''))) {
      problems.push(`${where}: x-psn.specVersion must be a semantic version (found ${JSON.stringify(provenance.specVersion)})`);
    }
    if (typeof provenance.phase !== 'string' || provenance.phase.length === 0) {
      problems.push(`${where}: x-psn.phase must say which milestone this artifact is live from`);
    }
    if (!Array.isArray(provenance.fsRefs) || provenance.fsRefs.length === 0) {
      problems.push(`${where}: x-psn.fsRefs must cite at least one spec clause`);
    }
    const expectedChangelog = `CHANGELOG.md#${changelogAnchor(file)}`;
    if (provenance.changelog !== expectedChangelog) {
      problems.push(`${where}: x-psn.changelog must be ${expectedChangelog} (found ${JSON.stringify(provenance.changelog)})`);
    }
  }

  for (const ref of collectRefs(json)) {
    if (!ref.startsWith('#/')) {
      problems.push(
        `${where}: external $ref ${JSON.stringify(ref)} — schemas must be self-contained so one ` +
          `downloaded file validates on its own. Inline the definition into $defs.`,
      );
    }
  }

  if (!changelog.includes(`## ${file}`)) {
    problems.push(`${where}: CHANGELOG.md has no "## ${file}" section (VS-05: schemas carry versions and changelogs)`);
  }
}

// Compile everything in one instance: this catches a bad keyword, an unresolvable local
// $ref, and a duplicate $id in a single pass.
try {
  const ajv = createAjv();
  for (const { file, json } of schemas) {
    try {
      ajv.compile(json);
    } catch (error) {
      problems.push(`schemas/${file}: does not compile — ${error.message}`);
    }
  }
} catch (error) {
  problems.push(`validator setup failed: ${error.message}`);
}

fail(problems, `${schemas.length} schemas compile, are addressed at ${cfg.schemaBaseUrl}/, are self-contained, and carry provenance + changelog sections`);
