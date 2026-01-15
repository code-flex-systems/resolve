import { listAdminConfigLogs } from '@/api/queries/adminLogQueries';
import type { ListAdminConfigLogsInput } from '@/schemas/adminLogSchemas';
import type { ProtectedContext } from '@/server/trpc/trpc';

export async function getAdminConfigLogs(ctx: ProtectedContext, input: ListAdminConfigLogsInput) {
	return listAdminConfigLogs(ctx, input);
}
