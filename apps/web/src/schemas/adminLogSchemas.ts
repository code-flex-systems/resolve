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
