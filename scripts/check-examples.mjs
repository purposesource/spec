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
 * TWO CURRENCIES, ONE RATE A MONTH (added 2026-11-07: `cost-support.v1` 1.7.0, `ledger-export.v1`
 * 1.10.0 and `stats.v1` 1.4.0; ops decisions D84 item 1 and D201 item 2). A table that counts in
 * the fees account's currency and keeps its reserve line in the reserve account's carries the
 * month's rate, its day and its source, and each movement that always crosses the two currencies
 * carries the bank's exchange. An example can only show that the contract admits such a table; that
 * it still REFUSES one without them is held to planted documents, each one edit away from an example
 * the contract admits, and each refusal must stand with every `format` keyword removed as well, so a
 * validator that ignores `format` refuses it too. The admissions prove the rules are no wider than
 * they say: a document without `reserve.currency` reads as it was written. The same holds for the
 * export's `policy.reserveTargetCurrency`, and for the counter's money rules, which moved with
 * `stats.v1`'s renamed member and state and must still bite under the new names.
 *
 * Run: node scripts/check-examples.mjs
 */
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { EXAMPLE_DIR, SCHEMA_DIR, createAjv, createValidatorWithAllSchemas, readJson, readYamlFile, schemaKey, fail } from './lib/spec.mjs';

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

/* ------------------------------------------------------------- planted documents: what a contract still refuses */

/** The schema with every `format` keyword removed: the reading a validator that ignores `format` gives. */
const withoutFormats = (node) => {
  if (Array.isArray(node)) return node.map(withoutFormats);
  if (node && typeof node === 'object') {
    return Object.fromEntries(
      Object.entries(node)
        .filter(([key, value]) => !(key === 'format' && typeof value === 'string'))
        .map(([key, value]) => [key, withoutFormats(value)]),
    );
  }
  return node;
};
const clone = (doc) => JSON.parse(JSON.stringify(doc));
/** A copy of `doc` with `change` applied to it. */
const edit = (doc, change) => {
  const copy = clone(doc);
  change(copy);
  return copy;
};
/** `target` without `members`, in place. */
const strip = (target, members) => {
  for (const member of members) delete target[member];
  return target;
};

const planted = [];
/**
 * Holds one contract to its plants: each refusal is refused by the contract as published and with every `format` keyword
 * removed, each refusal by `format` alone by the contract as published, and each admission is admitted both ways.
 */
function holdToPlants(schemaFile, { refuse, refuseByFormatOnly = [], admit }) {
  const json = readJson(join(SCHEMA_DIR, schemaFile));
  const published = ajv.getSchema(json.$id);
  const loose = createAjv().compile(withoutFormats(json));
  const key = schemaKey(schemaFile);
  for (const [what, doc] of refuse) {
    if (published(doc)) problems.push(`${key}: admits ${what}`);
    if (loose(doc)) problems.push(`${key} without format: admits ${what}`);
  }
  for (const [what, doc] of refuseByFormatOnly) {
    if (published(doc)) problems.push(`${key}: admits ${what}`);
  }
  for (const [what, doc] of admit) {
    if (!published(doc)) problems.push(`${key}: refuses ${what} — ${JSON.stringify(published.errors?.[0] ?? {})}`);
    if (!loose(doc)) problems.push(`${key} without format: refuses ${what} — ${JSON.stringify(loose.errors?.[0] ?? {})}`);
  }
  planted.push(`${key}: ${refuse.length} refusals with and without format, ${refuseByFormatOnly.length} by format alone, ${admit.length} admissions`);
}

/* cost-support.v1 1.7.0: the table in the fees account's currency, the reserve line in the reserve account's, one rate a month.
   Every plant is one edit away from the fees-currency example, a USD table for 2027-02 whose reserve is in CHF. */
const feesCurrency = readJson(join(EXAMPLE_DIR, 'cost-support.v1.fees-currency.example.json'));
const RATE_MEMBERS = ['rate', 'rateDate', 'rateSource'];
const EXCHANGE = ['srcAmountMinor', 'srcCurrency', 'fxRate', 'fxSource', 'fxDate'];
const INVOICE_MEMBERS = ['invoiceAmountMinor', 'invoiceCurrency', 'invoiceRate'];
/** The example's one movement: January's retention, sent in US dollars, booked in francs. */
const retention = (d) => d.reserve.movements.find((m) => m.kind === 'retention-from-fees');
/** The example's invoice in euros, which a supporter settled: converted on paper. */
const inEuros = (d) => d.directCosts.find((c) => c.invoiceCurrency === 'EUR');
/** A document of the example's month whose reserve names no currency and which carries no rate. */
const oneCurrency = (d) => {
  strip(d, RATE_MEMBERS);
  delete d.reserve.currency;
};
/** A refill of an advance of January, paid back in US dollars and booked in francs at the bank's rate. */
const refill = (more = {}) => ({
  amountMinor: 1712,
  kind: 'refill-from-fees',
  date: '2027-02-17',
  invoiceRef: 'INV-STATUS-2027-01-0004',
  advancedIn: '2027-01',
  srcAmountMinor: 2000,
  srcCurrency: 'USD',
  fxRate: '0.856',
  fxSource: "The reserve account's statement line STMT-RES-2027-02-0002",
  fxDate: '2027-02-17',
  ...more,
});
/** An advance of a USD invoice for which the bank changed the reserve's francs into the dollars it paid out. */
const exchangedAdvance = (more = {}) => ({
  amountMinor: -8615,
  kind: 'direct-cost-out',
  date: '2027-02-12',
  invoiceRef: 'INV-STATUS-2027-02-0005',
  advancedIn: '2027-02',
  srcAmountMinor: 10000,
  srcCurrency: 'USD',
  fxRate: '0.8615',
  fxSource: "The reserve account's statement line STMT-RES-2027-02-0003",
  fxDate: '2027-02-12',
  ...more,
});
/** Income a sponsor paid in US dollars, which the reserve account booked in francs. */
const exchangedIncome = (more = {}) => ({
  amountMinor: 8535,
  kind: 'unrestricted-income',
  date: '2027-02-19',
  srcAmountMinor: 10000,
  srcCurrency: 'USD',
  fxRate: '0.8535',
  fxSource: "The reserve account's statement line STMT-RES-2027-02-0004",
  fxDate: '2027-02-19',
  ...more,
});
const adding = (movement) => edit(feesCurrency, (d) => { d.reserve.movements.push(movement); });

holdToPlants('cost-support.v1.json', {
  refuse: [
    ["a reserve line in its own currency without the month's rate, its day and its source", edit(feesCurrency, (d) => strip(d, RATE_MEMBERS))],
    ["a reserve line in its own currency without the month's rate", edit(feesCurrency, (d) => strip(d, ['rate']))],
    ["the month's rate without its day", edit(feesCurrency, (d) => strip(d, ['rateDate']))],
    ["the month's rate without its source", edit(feesCurrency, (d) => strip(d, ['rateSource']))],
    ["a rate's day alone, on a document whose reserve names no currency", edit(feesCurrency, (d) => { oneCurrency(d); d.rateDate = feesCurrency.rateDate; })],
    ["a rate's source alone, on a document whose reserve names no currency", edit(feesCurrency, (d) => { oneCurrency(d); d.rateSource = clone(feesCurrency.rateSource); })],
    ['a rate of seven places', edit(feesCurrency, (d) => { d.rate = '0.8640552'; })],
    ['a rate as a number', edit(feesCurrency, (d) => { d.rate = 0.864055; })],
    ['a rate with a sign', edit(feesCurrency, (d) => { d.rate = '-0.864055'; })],
    ['a rate with an exponent', edit(feesCurrency, (d) => { d.rate = '8.64055e-1'; })],
    ['a rate with a comma', edit(feesCurrency, (d) => { d.rate = '0,864055'; })],
    ['a source of another name', edit(feesCurrency, (d) => { d.rateSource.name = 'ECB reference rates'; })],
    ['a source without its quotes', edit(feesCurrency, (d) => strip(d.rateSource, ['perEuro']))],
    ['a source with no quote', edit(feesCurrency, (d) => { d.rateSource.perEuro = {}; })],
    ['a quote as a number', edit(feesCurrency, (d) => { d.rateSource.perEuro.USD = 1.085; })],
    ['a quote with a comma', edit(feesCurrency, (d) => { d.rateSource.perEuro.CHF = '0,9375'; })],
    ['a quote under a currency code in lowercase', edit(feesCurrency, (d) => { d.rateSource.perEuro = { usd: '1.0850', CHF: '0.9375' }; })],
    ['a member of the source no rule names', edit(feesCurrency, (d) => { d.rateSource.url = 'https://www.ecb.europa.eu/'; })],
    ['a reserve currency in lowercase', edit(feesCurrency, (d) => { d.reserve.currency = 'chf'; })],
    ["a retention without the bank's exchange, under a reserve currency", edit(feesCurrency, (d) => strip(retention(d), [...EXCHANGE, 'retainedIn']))],
    ["a retention without its exchange's other side, under a reserve currency", edit(feesCurrency, (d) => strip(retention(d), ['srcAmountMinor']))],
    ['a retention without the month it receives, under a reserve currency', edit(feesCurrency, (d) => strip(retention(d), ['retainedIn']))],
    ["a retention without the bank's day, under a reserve currency", edit(feesCurrency, (d) => strip(retention(d), ['fxDate']))],
    ["a refill without the bank's exchange, under a reserve currency", adding(strip(refill(), EXCHANGE))],
    ["a refill without the bank's source, under a reserve currency", adding(strip(refill(), ['fxSource']))],
    ['the month a retention receives, on a direct-cost-out', adding(exchangedAdvance({ retainedIn: '2027-01' }))],
    ['the month a retention receives, on a refill', adding(refill({ retainedIn: '2027-01' }))],
    ['the month a retention receives, on unrestricted income', adding(exchangedIncome({ retainedIn: '2027-01' }))],
    ["the month a retention receives without the exchange, on a document whose reserve names no currency", edit(feesCurrency, (d) => { oneCurrency(d); strip(retention(d), EXCHANGE); })],
    ["the bank's rate without its source", adding(strip(exchangedIncome(), ['fxSource']))],
    ["the bank's rate without its day", adding(strip(exchangedIncome(), ['fxDate']))],
    ["the bank's rate without the exchange's other side", adding(strip(exchangedIncome(), ['srcAmountMinor', 'srcCurrency']))],
    ["an exchange's other side without its currency", adding(strip(exchangedIncome(), ['srcCurrency']))],
    ["an exchange's other side without the bank's rate", adding(strip(exchangedIncome(), ['fxRate', 'fxSource', 'fxDate']))],
    ["an exchange's currency alone", adding(strip(exchangedIncome(), ['srcAmountMinor', 'fxRate', 'fxSource', 'fxDate']))],
    ["an exchange's other side of 0", adding(exchangedIncome({ srcAmountMinor: 0 }))],
    ["an exchange's other side in fractions of a minor unit", adding(exchangedIncome({ srcAmountMinor: 10000.5 }))],
    ["an exchange's currency in lowercase", adding(exchangedIncome({ srcCurrency: 'usd' }))],
    ["the bank's rate as a number", adding(exchangedIncome({ fxRate: 0.8535 }))],
    ["the bank's rate with a comma", adding(exchangedIncome({ fxRate: '0,8535' }))],
    ['an empty source sentence', adding(exchangedIncome({ fxSource: '' }))],
    ['a source sentence of more than 200 characters', adding(exchangedIncome({ fxSource: 'S'.repeat(201) }))],
    ['the month a retention receives, not a month', edit(feesCurrency, (d) => { retention(d).retainedIn = '2027-13'; })],
    ["an invoice's own currency without its rate", edit(feesCurrency, (d) => strip(inEuros(d), ['invoiceRate']))],
    ["an invoice's own amount without its currency", edit(feesCurrency, (d) => strip(inEuros(d), ['invoiceCurrency']))],
    ["an invoice's rate without its own amount", edit(feesCurrency, (d) => strip(inEuros(d), ['invoiceAmountMinor']))],
    ["an invoice's own amount alone", edit(feesCurrency, (d) => strip(inEuros(d), ['invoiceCurrency', 'invoiceRate']))],
    ["an invoice's own amount of 0", edit(feesCurrency, (d) => { inEuros(d).invoiceAmountMinor = 0; })],
    ["an invoice's rate of seven places", edit(feesCurrency, (d) => { inEuros(d).invoiceRate = '0.9216589'; })],
    ["an invoice's rate as a number", edit(feesCurrency, (d) => { inEuros(d).invoiceRate = 0.921658; })],
    ["an invoice's own currency in lowercase", edit(feesCurrency, (d) => { inEuros(d).invoiceCurrency = 'eur'; })],
  ],
  refuseByFormatOnly: [
    ['a rate of the 30th of February', edit(feesCurrency, (d) => { d.rateDate = '2027-02-30'; })],
    ['an exchange booked on the 30th of February', edit(feesCurrency, (d) => { retention(d).fxDate = '2027-02-30'; })],
  ],
  admit: [
    ['a table in the fees account\'s currency with its reserve in francs (the fees-currency example as it stands)', feesCurrency],
    ['the same month in the shape a document before 1.7.0 has: no reserve currency, no rate, no exchange, no invoice of another currency', edit(feesCurrency, (d) => {
      oneCurrency(d);
      strip(retention(d), [...EXCHANGE, 'retainedIn']);
      for (const invoice of d.directCosts) strip(invoice, INVOICE_MEMBERS);
    })],
    ['an invoice in francs the fees account paid, at its debit, on a document whose reserve names no currency', edit(feesCurrency, (d) => {
      oneCurrency(d);
      strip(retention(d), [...EXCHANGE, 'retainedIn']);
      strip(inEuros(d), INVOICE_MEMBERS);
    })],
    ['a refill paid back across the two currencies', adding(refill())],
    ['an advance the bank exchanged into the table\'s currency', adding(exchangedAdvance())],
    ['an advance the reserve paid in its own currency, with no exchange', adding(strip(exchangedAdvance({ amountMinor: -1900 }), EXCHANGE))],
    ['unrestricted income the bank exchanged', adding(exchangedIncome())],
    ['unrestricted income in the reserve\'s own currency, with no exchange', adding(strip(exchangedIncome({ amountMinor: 5000 }), EXCHANGE))],
  ],
});

/* ledger-export.v1 1.10.0: a month whose frozen table keeps its reserve in the reserve account's currency names that currency
   beside the target. The plants edit the credit-month export, the one example that carries a policy block. */
const creditExport = readJson(join(EXAMPLE_DIR, 'ledger-export.v1.credit-month.example.json'));
const inDollars = (d) => {
  d.currency = 'USD';
  d.policy.reserveTargetCurrency = 'CHF';
};
holdToPlants('ledger-export.v1.json', {
  refuse: [
    ["a reserve target's currency without the target", edit(creditExport, (d) => { inDollars(d); delete d.policy.reserveTargetMinor; })],
    ["a reserve target's currency in lowercase", edit(creditExport, (d) => { inDollars(d); d.policy.reserveTargetCurrency = 'chf'; })],
  ],
  admit: [
    ["a month locked in the fees account's currency, its reserve target in the reserve account's", edit(creditExport, inDollars)],
    ['a policy block as 1.9.1 wrote it (the credit-month example as it stands)', creditExport],
  ],
});

/* stats.v1 1.4.0: the money member is `routedMinor` and the third state `post-first-transfer`, both renamed in place. The three
   state rules moved with them, and a rule left behind on the old name would constrain nothing, so each must still bite under
   the new names. The plants edit the two examples. */
const launched = readJson(join(EXAMPLE_DIR, 'stats.v1.example.json'));
const afterFirst = readJson(join(EXAMPLE_DIR, 'stats.v1.post-first-transfer.example.json'));
const beforeLaunch = (d) => {
  d.state = 'pre-launch';
  for (const member of ['projectsRegistered', 'contributorsClaimed', 'companiesCovered', 'routedMinor', 'firstDisbursementScheduledFor']) {
    d[member] = null;
  }
};
holdToPlants('stats.v1.json', {
  refuse: [
    ['a money figure of 0 before the launch', edit(launched, (d) => { beforeLaunch(d); d.routedMinor = 0; })],
    ['a money figure of 0 before the first transfer', edit(launched, (d) => { d.routedMinor = 0; })],
    ['no money figure after the first transfer', edit(afterFirst, (d) => { delete d.routedMinor; })],
    ['a null money figure after the first transfer', edit(afterFirst, (d) => { d.routedMinor = null; })],
    ['the money figure under its name before 1.4.0', edit(afterFirst, (d) => { d.chfRoutedMinor = d.routedMinor; delete d.routedMinor; })],
    ['the third state under its name before 1.4.0', edit(afterFirst, (d) => { d.state = 'post-first-franc'; })],
    ['a currency code in lowercase', edit(afterFirst, (d) => { d.cur = 'usd'; })],
  ],
  admit: [
    ['before the launch, every counter null', edit(launched, beforeLaunch)],
    ["before the first transfer, in the fees account's currency (the main example as it stands)", launched],
    ['after the first transfer, its total in the currency of the months it adds (the further example as it stands)', afterFirst],
  ],
});

fail(
  problems,
  `${checked} examples validate against their schemas (${further} of them further examples of a schema's shape); ` +
    `planted documents: ${planted.join('; ')}`,
);
