import { trpc } from '@/lib/trpc';
import type { RouterInput, RouterOutput } from '@/types/routerTypes';

type AdminLogsOutput = RouterOutput['adminLogs'];
type AdminLogsInput = RouterInput['adminLogs'];

export type AdminLogItem = AdminLogsOutput['getAdminLogsByClaim'][number];
export type AdminConfigLogItem = AdminLogsOutput['listAdminConfigLogs']['rows'][number];
export type AdminConfigLogCursor = AdminLogsOutput['listAdminConfigLogs']['nextCursor'];
export type AdminConfigLogsInput = AdminLogsInput['listAdminConfigLogs'];
export type ClaimActivityLogItem = AdminLogsOutput['listClaimActivityLogs']['rows'][number];
export type ClaimActivityLogCursor = AdminLogsOutput['listClaimActivityLogs']['nextCursor'];
export type ClaimActivityLogsInput = AdminLogsInput['listClaimActivityLogs'];
export type SystemStats = AdminLogsOutput['getSystemStats'];

export function useAdminLogsTrpc() {
	return {
		listByClaim: trpc.adminLogs.getAdminLogsByClaim.useQuery,
		listByEntity: trpc.adminLogs.getAdminLogsByEntity.useQuery,
		listConfigLogs: trpc.adminLogs.listAdminConfigLogs.useQuery,
		listClaimActivityLogs: trpc.adminLogs.listClaimActivityLogs.useQuery,
		getSystemStats: trpc.adminLogs.getSystemStats.useQuery,
	};
}
