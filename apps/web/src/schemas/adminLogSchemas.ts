import { z } from 'zod';
import { EntityName } from '@/api/utils/adminActionLogger';

export const getAdminLogsByClaimInput = z.object({
	claimId: z.number().int(),
	limit: z.number().int().min(1).max(100).optional().default(10),
});
export type GetAdminLogsByClaimInput = z.infer<typeof getAdminLogsByClaimInput>;

export const getAdminLogsByEntityInput = z.object({
	entityName: z.nativeEnum(EntityName),
	entityId: z.string(),
	limit: z.number().int().min(1).max(100).optional().default(10),
});
export type GetAdminLogsByEntityInput = z.infer<typeof getAdminLogsByEntityInput>;

export const listAdminConfigLogsInput = z.object({
	limit: z.number().int().min(1).max(100).optional().default(25),
	cursor: z
		.object({
			createdAt: z.string().datetime(),
			id: z.number().int(),
		})
		.optional(),
	startDate: z.string().datetime().optional(),
	endDate: z.string().datetime().optional(),
	entityName: z.nativeEnum(EntityName).optional(),
	userId: z.string().optional(),
});
export type ListAdminConfigLogsInput = z.infer<typeof listAdminConfigLogsInput>;

export const listClaimActivityLogsInput = z.object({
	limit: z.number().int().min(1).max(100).optional().default(25),
	cursor: z
		.object({
			createdAt: z.string().datetime(),
			id: z.number().int(),
		})
		.optional(),
	startDate: z.string().datetime().optional(),
	endDate: z.string().datetime().optional(),
	entityName: z.nativeEnum(EntityName).optional(),
	userId: z.string().optional(),
	claimId: z.number().int().optional(),
	actorType: z.enum(['admin', 'user']).optional(),
});
export type ListClaimActivityLogsInput = z.infer<typeof listClaimActivityLogsInput>;
