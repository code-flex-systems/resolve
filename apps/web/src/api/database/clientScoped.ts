import { type SelectQueryBuilder } from 'kysely';
import type { DB } from './types';

// This type represents the union of all tables that contain client-partitioned data
export type ClientScopedTable = Extract<
	keyof DB,
	| 'action'
	| 'action_log'
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
	| 'comment'
>;

// Used to wrap all Kysely select queries that reference tables listed in the above union type
// Enforces "where client_id = [pass client ID from user session]" with an optional table alias
export function applyClientScope<T extends ClientScopedTable, QB extends SelectQueryBuilder<DB, T, any>>(
	qb: QB,
	clientId: DB[T]['client_id'] | null,
	tableAlias?: T
): QB {
	if (clientId === null) return qb;
	const column = tableAlias ? `${tableAlias}.client_id` : 'client_id';
	return qb.where(column as any, '=', clientId as any) as QB;
}
