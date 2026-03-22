import { z } from 'zod';
import { EntityName } from '@/api/utils/activityLogger';

export const getClaimActivityLogsInput = z.object({
	claimId: z.string().uuid(),
	actorType: z.enum(['admin', 'user']).optional(),
	limit: z.number().int().min(1).max(500).optional().default(100),
});
export type GetClaimActivityLogsInput = z.infer<typeof getClaimActivityLogsInput>;

export const getCompleteClaimTimelineInput = z.object({
	claimId: z.string().uuid(),
	limit: z.number().int().min(1).max(500).optional().default(100),
});
export type GetCompleteClaimTimelineInput = z.infer<typeof getCompleteClaimTimelineInput>;

export const getUserActivityLogsInput = z.object({
	userId: z.string().optional(),
	startDate: z.date().optional(),
	endDate: z.date().optional(),
	limit: z.number().int().min(1).max(500).optional().default(100),
});
export type GetUserActivityLogsInput = z.infer<typeof getUserActivityLogsInput>;

export const getEntityConfigLogsInput = z.object({
	entityName: z.nativeEnum(EntityName),
	entityId: z.union([z.string(), z.number()]),
	limit: z.number().int().min(1).max(500).optional().default(100),
});
export type GetEntityConfigLogsInput = z.infer<typeof getEntityConfigLogsInput>;

export const getRecentConfigLogsInput = z.object({
	entityName: z.string().optional(),
	limit: z.number().int().min(1).max(100).optional().default(50),
});
export type GetRecentConfigLogsInput = z.infer<typeof getRecentConfigLogsInput>;
