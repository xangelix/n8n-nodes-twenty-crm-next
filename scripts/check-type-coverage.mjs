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

const { TWENTY_TYPE_TO_N8N_TYPE } = await import('../dist/nodes/Twenty/fieldTypeMap.js');

const missing = upstreamValues.filter((value) => !(value in TWENTY_TYPE_TO_N8N_TYPE));

console.log(`Upstream FieldMetadataType: ${upstreamValues.length} values`);
console.log(`Mapped in fieldTypeMap.ts: ${upstreamValues.length - missing.length}/${upstreamValues.length}`);

if (missing.length > 0) {
	console.error(`\nMissing explicit mappings for: ${missing.join(', ')}`);
	console.error('Add each one to TWENTY_TYPE_TO_N8N_TYPE in nodes/Twenty/fieldTypeMap.ts');
	process.exit(1);
}

console.log('Full type coverage: every upstream FieldMetadataType value is explicitly mapped.');
