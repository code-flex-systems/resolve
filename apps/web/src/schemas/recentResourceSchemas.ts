import { z } from 'zod';

export const trackResourceVisitInput = z.object({
	resource_type: z.string().max(50),
	resource_id: z.string().uuid(),
	resource_label: z.string().nullable().optional(),
	resource_url: z.string(),
});

export const getRecentResourcesInput = z.object({
	limit: z.number().int().min(1).max(50).default(10),
});
