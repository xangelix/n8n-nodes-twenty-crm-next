/**
 * Twenty field type mapping
 *
 * Maps every Twenty field type to the n8n input category used by the node's
 * Fields collection (see the `fieldType` hidden parameter in Twenty.node.ts).
 *
 * SOURCE OF TRUTH: the upstream FieldMetadataType enum at
 * packages/twenty-shared/src/types/FieldMetadataType.ts in twentyhq/twenty.
 * Every enum value MUST have an explicit entry here so nothing falls through
 * to a default silently. Run `pnpm check:types` to verify coverage against
 * the current upstream enum.
 *
 * The map also includes the GraphQL introspection composite type names
 * (camelCase) which the data schema uses instead of the enum values.
 *
 * Categories with dedicated UI inputs: fullName, link, currency, address,
 * emails, phones, select, multiSelect, boolean, simple.
 * Category 'relation' renders no value input and is skipped during write
 * transformation - use it for composite/read-only types that cannot be
 * written with a plain value.
 */
export const TWENTY_TYPE_TO_N8N_TYPE: Record<string, string> = {
	// ---- Upstream FieldMetadataType enum values (SCREAMING_CASE) ----
	ACTOR: 'relation', // Composite {source, name, ...}, system-managed
	ADDRESS: 'address',
	ARRAY: 'simple', // Rare; accepts user-provided value as-is
	BOOLEAN: 'boolean',
	CURRENCY: 'currency',
	DATE: 'simple',
	DATE_TIME: 'simple',
	EMAILS: 'emails',
	FILES: 'relation', // Composite file reference, not writable via plain value
	FULL_NAME: 'fullName',
	LINKS: 'link',
	MORPH_RELATION: 'relation', // Polymorphic relation, not writable via plain value
	MULTI_SELECT: 'multiSelect',
	NUMBER: 'simple',
	NUMERIC: 'simple', // Arbitrary-precision decimal
	PHONES: 'phones',
	POSITION: 'simple', // Lexorank float for ordering, rarely set manually
	RATING: 'simple', // Integer 1-5
	RAW_JSON: 'simple',
	RELATION: 'relation',
	RICH_TEXT: 'simple', // Pre-existing behavior (raw string body)
	SELECT: 'select',
	TEXT: 'simple',
	TS_VECTOR: 'relation', // Read-only search vector
	UUID: 'simple',

	// ---- GraphQL introspection composite type names (data schema) ----
	FullName: 'fullName',
	Links: 'link',
	Currency: 'currency',
	Address: 'address',
	Emails: 'emails',
	Phones: 'phones',
	Actor: 'relation',
};

/**
 * Map a Twenty field type (metadata enum value or GraphQL type name) to the
 * n8n input category. Unknown types fall back to 'simple'.
 *
 * @param {string} twentyType The Twenty field type.
 * @returns {string} The n8n input category.
 */
export function mapTwentyTypeToN8nType(twentyType: string): string {
	return TWENTY_TYPE_TO_N8N_TYPE[twentyType] || 'simple';
}

/**
 * Filterable sub-fields for compound types, used by the Upsert "Match Field"
 * dropdowns. Twenty's REST filter matches compound sub-field paths
 * (e.g. `emails.primaryEmail[eq]:"..."`), never whole compound objects.
 *
 * SOURCE OF TRUTH: the composite type definitions at
 * packages/twenty-shared/src/types/composite-types/*.ts and Twenty's REST
 * filter validation tests in twentyhq/twenty. Keys are n8n input categories
 * from TWENTY_TYPE_TO_N8N_TYPE. `pnpm check:types` verifies the sub-field
 * names against the live upstream definitions.
 */
export const COMPOUND_MATCH_SUB_FIELDS: Record<string, Array<{ subField: string; label: string }>> = {
	emails: [{ subField: 'primaryEmail', label: 'Primary Email' }],
	phones: [{ subField: 'primaryPhoneNumber', label: 'Primary Phone Number' }],
	link: [{ subField: 'primaryLinkUrl', label: 'Link URL' }],
	fullName: [
		{ subField: 'firstName', label: 'First Name' },
		{ subField: 'lastName', label: 'Last Name' },
	],
	currency: [
		{ subField: 'amountMicros', label: 'Amount (Micros)' },
		{ subField: 'currencyCode', label: 'Currency Code' },
	],
	address: [
		{ subField: 'addressStreet1', label: 'Street 1' },
		{ subField: 'addressStreet2', label: 'Street 2' },
		{ subField: 'addressCity', label: 'City' },
		{ subField: 'addressPostcode', label: 'Postcode' },
		{ subField: 'addressState', label: 'State' },
		{ subField: 'addressCountry', label: 'Country' },
	],
};
