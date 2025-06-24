import { AdminActionLogType } from '@/config/enums';
import { Transaction } from 'kysely';
import { DB } from '../../api/database/types';
import { ProtectedContext } from '@/server/trpc/trpc';

export interface AdminActionLog {
	action: AdminActionLogType;
	created_at: Date;
	entity_id: number;
	entity_name: string;
	value: Record<string, any> | null;
}

export async function log(ctx: ProtectedContext, entry: AdminActionLog, trx: Transaction<DB>) {
	await trx
		.insertInto('admin_action_logs')
		.values({
			...entry,
			created_by: ctx.session.user.id,
			client_id: ctx.session.user.client_id,
		})
		.execute();
}
