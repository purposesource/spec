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
 * Run: node scripts/check-examples.mjs
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { EXAMPLE_DIR, createValidatorWithAllSchemas, readJson, readYamlFile, schemaKey, fail } from './lib/spec.mjs';

const { ajv, schemas } = createValidatorWithAllSchemas();
const problems = [];
let checked = 0;

for (const { file, json } of schemas) {
  const key = schemaKey(file);
  const jsonExample = join(EXAMPLE_DIR, `${key}.example.json`);
  const yamlExample = join(EXAMPLE_DIR, `${key}.example.yaml`);

  let examplePath = null;
  let instance = null;
  if (existsSync(jsonExample)) {
    examplePath = jsonExample;
    instance = readJson(jsonExample);
  } else if (existsSync(yamlExample)) {
    examplePath = yamlExample;
    instance = readYamlFile(yamlExample);
  } else {
    problems.push(
      `schemas/${file}: no example. Add examples/${key}.example.json — every artifact class ` +
        `owes one known-good instance (VS-05).`,
    );
    continue;
  }

  const validate = ajv.getSchema(json.$id);
  if (!validate) {
    problems.push(`schemas/${file}: could not be resolved by $id ${json.$id}`);
    continue;
  }

  checked += 1;
  if (!validate(instance)) {
    for (const error of validate.errors ?? []) {
      const at = error.instancePath === '' ? '(root)' : error.instancePath;
      problems.push(`${examplePath.replace(/\\/g, '/')}: ${at} ${error.message} ${JSON.stringify(error.params)}`);
    }
  }
}

fail(problems, `${checked} examples validate against their schemas`);
