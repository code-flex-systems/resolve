import { trpc } from '@/lib/trpc';
import type { RouterOutput } from '@/types/routerTypes';

type AdminLogsOutput = RouterOutput['adminLogs'];

export type AdminLogItem = AdminLogsOutput['getAdminLogsByClaim'][number];

export function useAdminLogsTrpc() {
	return {
		listByClaim: trpc.adminLogs.getAdminLogsByClaim.useQuery,
		listByEntity: trpc.adminLogs.getAdminLogsByEntity.useQuery,
	};
}
