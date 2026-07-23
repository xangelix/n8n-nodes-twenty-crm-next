#!/usr/bin/env node
/**
 * Type coverage check
 *
 * Verifies that every value of Twenty's upstream FieldMetadataType enum has an
 * explicit entry in this package's type map (nodes/Twenty/fieldTypeMap.ts).
 * Catches the case where a Twenty update adds a new field type that would
 * otherwise silently fall through to the 'simple' input.
 *
 * Usage: pnpm build && node scripts/check-type-coverage.mjs
 * (requires dist/ to be built, since it loads the compiled type map)
 *
 * Exit code 0 = full coverage, 1 = missing mappings or fetch failure.
 */

const UPSTREAM_ENUM_URL =
	'https://raw.githubusercontent.com/twentyhq/twenty/main/packages/twenty-shared/src/types/FieldMetadataType.ts';

const response = await fetch(UPSTREAM_ENUM_URL);
if (!response.ok) {
	console.error(`Failed to fetch upstream enum: HTTP ${response.status}`);
	process.exit(1);
}
const source = await response.text();

// Parse `NAME = 'VALUE',` entries from the enum body
const upstreamValues = [...source.matchAll(/^\s*(\w+)\s*=\s*'(\w+)'/gm)].map((m) => m[2]);
if (upstreamValues.length === 0) {
	console.error('Could not parse any enum values from the upstream source - format may have changed.');
	process.exit(1);
}

const { TWENTY_TYPE_TO_N8N_TYPE, COMPOUND_MATCH_SUB_FIELDS } = await import(
	'../dist/nodes/Twenty/fieldTypeMap.js'
);

const missing = upstreamValues.filter((value) => !(value in TWENTY_TYPE_TO_N8N_TYPE));

console.log(`Upstream FieldMetadataType: ${upstreamValues.length} values`);
console.log(`Mapped in fieldTypeMap.ts: ${upstreamValues.length - missing.length}/${upstreamValues.length}`);

if (missing.length > 0) {
	console.error(`\nMissing explicit mappings for: ${missing.join(', ')}`);
	console.error('Add each one to TWENTY_TYPE_TO_N8N_TYPE in nodes/Twenty/fieldTypeMap.ts');
	process.exit(1);
}

console.log('Full type coverage: every upstream FieldMetadataType value is explicitly mapped.');

// ---------------------------------------------------------------------------
// Part 2: verify compound match sub-fields against upstream composite types
// ---------------------------------------------------------------------------

const COMPOSITE_TYPE_BASE_URL =
	'https://raw.githubusercontent.com/twentyhq/twenty/main/packages/twenty-shared/src/types/composite-types';

// n8n input category -> upstream composite type file name
const CATEGORY_TO_COMPOSITE_FILE = {
	emails: 'emails',
	phones: 'phones',
	link: 'links',
	fullName: 'full-name',
	currency: 'currency',
	address: 'address',
};

let subFieldFailures = 0;

for (const [category, subFields] of Object.entries(COMPOUND_MATCH_SUB_FIELDS)) {
	const fileName = CATEGORY_TO_COMPOSITE_FILE[category];
	if (!fileName) {
		console.error(`\nNo upstream composite type file mapped for category "${category}"`);
		subFieldFailures++;
		continue;
	}

	const compositeResponse = await fetch(`${COMPOSITE_TYPE_BASE_URL}/${fileName}.composite-type.ts`);
	if (!compositeResponse.ok) {
		console.error(`\nFailed to fetch ${fileName}.composite-type.ts: HTTP ${compositeResponse.status}`);
		subFieldFailures++;
		continue;
	}
	const compositeSource = await compositeResponse.text();
	const upstreamSubFields = new Set(
		[...compositeSource.matchAll(/name:\s*'(\w+)'/g)].map((m) => m[1]),
	);

	for (const { subField } of subFields) {
		if (!upstreamSubFields.has(subField)) {
			console.error(`\n"${subField}" not found in upstream ${fileName} composite type`);
			console.error(`  Upstream provides: ${[...upstreamSubFields].join(', ')}`);
			subFieldFailures++;
		}
	}

	console.log(
		`Compound "${category}": ${subFields.length} sub-field(s) verified against upstream ${fileName} composite type`,
	);
}

if (subFieldFailures > 0) {
	console.error('\nCompound sub-field verification failed - update COMPOUND_MATCH_SUB_FIELDS in fieldTypeMap.ts');
	process.exit(1);
}

console.log('Full compound coverage: every match sub-field exists in the upstream composite definitions.');
