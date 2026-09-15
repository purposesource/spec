#!/usr/bin/env node
/**
 * Gate: every schema has an example, and every example validates against its schema.
 *
 * The examples are not decoration. They are the fixtures the other repositories build
 * against: the index-build job's output is checked against these schemas, and its authors
 * need one known-good instance per artifact class to work from. An example that has
 * drifted out of validity is worse than no example, because someone will copy it.
 *
 * The mapping is by filename, deliberately rigid so nothing can be half-wired:
 *
 *   schemas/badge.v1.json  ->  examples/badge.v1.example.json
 *   schemas/purpose-yml.v1.json  ->  examples/purpose-yml.v1.example.yaml
 *
 * A YAML example is used wherever the real artifact IS YAML — the optional manifest and
 * the curated registry record — because an example in the wrong serialisation is an
 * example nobody can copy. It is parsed and then validated against the same JSON Schema.
 *
 * A schema whose shape has a state its main example cannot show at the same time may carry
 * FURTHER EXAMPLES, named with that state between the schema's key and `.example` (added for
 * ops decision D44):
 *
 *   schemas/certificate-record.v1.json  ->  examples/certificate-record.v1.status-only.example.json
 *   schemas/certificate.v1.json         ->  examples/certificate.v1.sponsorship.example.json
 *
 * Each is validated exactly like the main one, and every `*.example.json` or `*.example.yaml`
 * file must belong to a schema: an example no gate validates is the drifted example this gate
 * exists to prevent.
 *
 * Run: node scripts/check-examples.mjs
 */
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { EXAMPLE_DIR, createValidatorWithAllSchemas, readJson, readYamlFile, schemaKey, fail } from './lib/spec.mjs';

const { ajv, schemas } = createValidatorWithAllSchemas();
const problems = [];
let checked = 0;
let further = 0;

const EXAMPLE_FILE = /\.example\.(?:json|yaml)$/;
const exampleFiles = existsSync(EXAMPLE_DIR) ? readdirSync(EXAMPLE_DIR).filter((name) => EXAMPLE_FILE.test(name)).sort() : [];
/** Every example file some schema claimed; whatever is left over belongs to no schema. */
const claimed = new Set();

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function readExample(name) {
  const path = join(EXAMPLE_DIR, name);
  return name.endsWith('.yaml') ? readYamlFile(path) : readJson(path);
}

function report(validate, name, instance) {
  checked += 1;
  if (!validate(instance)) {
    for (const error of validate.errors ?? []) {
      const at = error.instancePath === '' ? '(root)' : error.instancePath;
      problems.push(`examples/${name}: ${at} ${error.message} ${JSON.stringify(error.params)}`);
    }
  }
}

for (const { file, json } of schemas) {
  const key = schemaKey(file);
  const jsonExample = `${key}.example.json`;
  const yamlExample = `${key}.example.yaml`;

  let mainExample = null;
  if (existsSync(join(EXAMPLE_DIR, jsonExample))) {
    mainExample = jsonExample;
  } else if (existsSync(join(EXAMPLE_DIR, yamlExample))) {
    mainExample = yamlExample;
  } else {
    problems.push(
      `schemas/${file}: no example. Add examples/${key}.example.json — every artifact class ` +
        `owes one known-good instance (VS-05).`,
    );
  }

  const furtherExample = new RegExp(`^${escapeRegExp(key)}\\.([a-z0-9][a-z0-9-]*)\\.example\\.(?:json|yaml)$`);
  const furtherExamples = exampleFiles.filter((name) => furtherExample.test(name));

  if (mainExample) claimed.add(mainExample);
  for (const name of furtherExamples) claimed.add(name);

  const validate = ajv.getSchema(json.$id);
  if (!validate) {
    problems.push(`schemas/${file}: could not be resolved by $id ${json.$id}`);
    continue;
  }

  if (mainExample) report(validate, mainExample, readExample(mainExample));
  for (const name of furtherExamples) {
    further += 1;
    report(validate, name, readExample(name));
  }
}

for (const name of exampleFiles) {
  if (!claimed.has(name)) {
    problems.push(
      `examples/${name}: belongs to no schema. An example is named {schema key}.example.json, or ` +
        '{schema key}.{state}.example.json for a further example of the same schema; one that no ' +
        'gate validates is exactly the drifted example somebody copies.',
    );
  }
}

fail(problems, `${checked} examples validate against their schemas (${further} of them further examples of a schema's shape)`);
