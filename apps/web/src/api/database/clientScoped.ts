// lib/data/helpers/clientScoped.ts
import { sql, ValueExpression, type SelectQueryBuilder } from 'kysely';
import type { DB } from './types';
import { db } from './kysely';

// Optional: restrict to only tables with client_id
export type ClientScopedTable = Extract<
	keyof DB,
	| 'answer'
	| 'checklist'
	| 'checklist_claim'
	| 'claim'
	| 'doc'
	| 'feeds'
	| 'page'
	| 'page_instance'
	| 'page_instance_status'
	| 'question'
	| 'question_response'
	| 'question_response_answer'
	| 'response_audit_logs'
>;

// Applies WHERE client_id = [clientId] to any select query
export function applyClientScope<T extends ClientScopedTable, QB extends SelectQueryBuilder<DB, T, any>>(
	qb: QB,
	clientId: DB[T]['client_id'] | null,
	tableAlias?: T
): QB {
	if (clientId === null) return qb;
	const column = tableAlias ? `${tableAlias}.client_id` : 'client_id';
	return qb.where(column as any, '=', clientId as any) as QB;
}

// Adds client_id field to any insert/update input
export function withClientId<T extends { client_id?: ValueExpression<DB, any, string> | undefined }>(
	input: T,
	clientId: string | null
): T & { client_id: string } {
	return { ...input, client_id: clientId };
}
