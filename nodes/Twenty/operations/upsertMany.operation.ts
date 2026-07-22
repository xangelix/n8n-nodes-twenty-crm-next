import { IExecuteFunctions, NodeOperationError } from 'n8n-workflow';
import { twentyRestApiRequest } from '../TwentyApi.client';
import { buildCreateMutation } from './create.operation';
import { buildUpdateMutation } from './update.operation';
import { findRecordByField } from './upsert.operation';

/**
 * Execute bulk upsert operation - update if exists, create if not.
 * Supports matching by unique field for each record.
 *
 * @param context The n8n execution context
 * @param resource The resource/object name (singular)
 * @param upsertMode How to match records ('id' or 'field')
 * @param upsertData Array of upsert data objects
 * @param objectMetadata The object metadata from schema
 * @returns Array of results with upserted records and actions
 */
export async function executeUpsertMany(
	context: IExecuteFunctions,
	resource: string,
	upsertMode: string,
	upsertData: Array<{
		matchValue: string;
		fieldsData: Record<string, any>;
	}>,
	objectMetadata: any,
	options: {
		matchField?: string;
	},
): Promise<Array<{ success: boolean; record?: any; action?: 'created' | 'updated'; error?: string; index: number }>> {
	const { twentyApiRequest } = await import('../TwentyApi.client');

	// Process each upsert in parallel
	const results = await Promise.allSettled(
		upsertData.map(async ({ matchValue, fieldsData }, index) => {
			let recordId: string | undefined;
			let recordExists = false;

			if (upsertMode === 'id') {
				// MODE 1: Match by Record ID
				recordId = matchValue;

				// Check if the record exists using REST API
				const pluralName = objectMetadata.namePlural;
				const restPath = `/${pluralName}/${recordId}`;

				try {
					const checkResponse: any = await twentyRestApiRequest.call(
						context,
						'GET',
						restPath,
					);
					recordExists = checkResponse.data?.[resource] !== undefined;
				} catch (error) {
					recordExists = false;
				}
			} else {
				// MODE 2: Match by Unique Field
				if (!options.matchField) {
					throw new NodeOperationError(
						context.getNode(),
						'Match field is required for field-based upsert',
					);
				}

				const matchResult = await findRecordByField(
					context,
					resource,
					objectMetadata.namePlural,
					options.matchField,
					matchValue,
				);

				if (matchResult) {
					recordExists = true;
					recordId = matchResult.id;
				}
			}

			if (recordExists && recordId) {
				// Record exists - UPDATE it
				const { query, variables } = await buildUpdateMutation(
					context,
					resource,
					recordId,
					fieldsData,
					objectMetadata,
				);
				const response: any = await twentyApiRequest.call(
					context,
					'graphql',
					query,
					variables,
				);

				const operationName = `update${resource.charAt(0).toUpperCase() + resource.slice(1)}`;
				return {
					success: true,
					record: response[operationName],
					action: 'updated' as const,
					index,
				};
			} else {
				// Record doesn't exist - CREATE it
				const { query, variables } = await buildCreateMutation(
					context,
					resource,
					fieldsData,
					objectMetadata,
				);
				const response: any = await twentyApiRequest.call(
					context,
					'graphql',
					query,
					variables,
				);

				const operationName = `create${resource.charAt(0).toUpperCase() + resource.slice(1)}`;
				return {
					success: true,
					record: response[operationName],
					action: 'created' as const,
					index,
				};
			}
		}),
	);

	// Map results to consistent format
	return results.map((result, index) => {
		if (result.status === 'fulfilled') {
			return result.value;
		} else {
			return {
				success: false,
				error: result.reason?.message || String(result.reason),
				index,
			};
		}
	});
}
