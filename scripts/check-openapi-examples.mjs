#!/usr/bin/env node
/**
 * Gate: every example in the API description validates against its own schema.
 *
 * WHY THIS EXISTS INSTEAD OF THE LINTER'S OWN RULE
 * ------------------------------------------------
 * Redocly ships `no-invalid-media-type-examples`, which does exactly this job, and it is
 * switched off in redocly.yaml. Not because the rule is unwelcome — because its validator
 * mis-scopes `unevaluatedProperties` inside `if`/`then` branches and reports a false
 * failure for every conditionally-constrained artifact we publish.
 *
 * The reproduction, so nobody has to take that on trust: take `schemas/stats.v1.json`,
 * inject `unevaluatedProperties: false` into each `allOf[i].then`, and validate the
 * pre-launch example. Under JSON Schema 2020-12, `unevaluatedProperties` inside a
 * subschema sees only the annotations produced *within that subschema* — so every
 * property declared at the object root becomes "unevaluated" and the example fails, one
 * error per field. That is precisely the error list the linter produces, and it is
 * exactly what our conditional rules look like:
 *
 *     allOf: [{ if: { properties: { state: { const: pre-launch } } },
 *               then: { properties: { chfRoutedMinor: { const: null } } } }]
 *
 * Rather than restructure correct schemas to satisfy an incorrect check, or shrug and
 * lose the guarantee, this script keeps the guarantee with a conformant validator: the
 * same ajv 2020-12 instance the schema and example gates use.
 *
 * WHAT IT CHECKS
 * --------------
 * Every named example under `responses.*.content.*.examples.*.value` and
 * `requestBody.content.*.examples.*.value`, against whichever schema that media type
 * declares — an external artifact schema, a component schema, or an inline one.
 *
 * Run: node scripts/check-openapi-examples.mjs
 */
import { join } from 'node:path';

import { ROOT, config, createValidatorWithAllSchemas, readYamlFile, fail } from './lib/spec.mjs';

const cfg = config();
const doc = readYamlFile(join(ROOT, 'openapi', 'edge-public.v1.yaml'));
const { ajv } = createValidatorWithAllSchemas();

// OpenAPI permits a handful of annotation keywords inside a Schema Object that plain
// JSON Schema does not know. They affect nothing; teach the validator to ignore them
// rather than loosening strict mode, which is what catches a genuinely typo'd keyword.
for (const keyword of ['example', 'xml', 'externalDocs', 'discriminator', 'deprecated']) {
  try {
    ajv.addKeyword({ keyword });
  } catch {
    // Already known to this dialect (`deprecated` is standard in 2020-12). Fine.
  }
}

const CONTAINER_ID = 'urn:purposesource:openapi:components';

/**
 * Rewrite the two reference styles the API description uses into absolute ones the
 * validator can resolve: component references become container references, and the
 * relative file references become the schemas' own published `$id`s. Both must be
 * absolute, because a URN base cannot resolve a relative path.
 */
function rewriteRefs(node) {
  if (Array.isArray(node)) return node.map(rewriteRefs);
  if (node && typeof node === 'object') {
    const out = {};
    for (const [key, value] of Object.entries(node)) {
      if (key === '$ref' && typeof value === 'string' && value.startsWith('#/components/schemas/')) {
        out[key] = `${CONTAINER_ID}#/$defs/${value.slice('#/components/schemas/'.length)}`;
      } else if (key === '$ref' && typeof value === 'string' && value.startsWith('../schemas/')) {
        out[key] = `${cfg.schemaBaseUrl}/${value.slice('../schemas/'.length)}`;
      } else {
        out[key] = rewriteRefs(value);
      }
    }
    return out;
  }
  return node;
}

const componentSchemas = doc?.components?.schemas ?? {};
ajv.addSchema({ $id: CONTAINER_ID, $defs: rewriteRefs(componentSchemas) });

const problems = [];
let checked = 0;

/** Resolve the validator for one media type's `schema`, or null when there is none. */
function validatorFor(schema, where) {
  if (!schema || typeof schema !== 'object') return null;

  if (typeof schema.$ref === 'string') {
    const ref = schema.$ref;
    if (ref.startsWith('../schemas/')) {
      const id = `${cfg.schemaBaseUrl}/${ref.slice('../schemas/'.length)}`;
      const validate = ajv.getSchema(id);
      if (!validate) problems.push(`${where}: $ref ${ref} does not resolve to a published schema ($id ${id})`);
      return validate ?? null;
    }
    if (ref.startsWith('#/components/schemas/')) {
      try {
        return ajv.compile(rewriteRefs({ $ref: ref }));
      } catch (error) {
        problems.push(`${where}: component schema ${ref} does not compile — ${error.message}`);
        return null;
      }
    }
    problems.push(`${where}: unexpected $ref target ${ref}`);
    return null;
  }

  try {
    return ajv.compile(rewriteRefs(schema));
  } catch (error) {
    problems.push(`${where}: inline schema does not compile — ${error.message}`);
    return null;
  }
}

function checkContent(content, where) {
  for (const [mediaType, media] of Object.entries(content ?? {})) {
    const examples = media?.examples;
    if (!examples || typeof examples !== 'object') continue;
    const validate = validatorFor(media.schema, `${where} ${mediaType}`);
    if (!validate) continue;
    for (const [name, example] of Object.entries(examples)) {
      if (!example || !('value' in example)) continue;
      checked += 1;
      if (!validate(example.value)) {
        for (const error of validate.errors ?? []) {
          const at = error.instancePath === '' ? '(root)' : error.instancePath;
          problems.push(`${where} ${mediaType} example "${name}": ${at} ${error.message} ${JSON.stringify(error.params)}`);
        }
      }
    }
  }
}

const METHODS = ['get', 'put', 'post', 'delete', 'patch', 'head', 'options', 'trace'];

for (const [path, item] of Object.entries(doc?.paths ?? {})) {
  for (const method of METHODS) {
    const operation = item?.[method];
    if (!operation) continue;
    const label = `${method.toUpperCase()} ${path}`;
    if (operation.requestBody?.content) checkContent(operation.requestBody.content, `${label} requestBody`);
    for (const [status, response] of Object.entries(operation.responses ?? {})) {
      if (response?.content) checkContent(response.content, `${label} ${status}`);
    }
  }
}

// The shared error/rate-limit responses live under components and are referenced by
// every operation, so their examples would otherwise never be reached by the walk above.
for (const [name, response] of Object.entries(doc?.components?.responses ?? {})) {
  if (response?.content) checkContent(response.content, `components.responses.${name}`);
}

if (checked === 0) problems.push('no examples were checked — this gate would pass vacuously');

fail(problems, `${checked} API-description examples validate against their schemas`);
