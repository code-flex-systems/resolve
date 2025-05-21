import { z } from 'zod';

export const docParams = z.record(z.unknown());
export type DocParams = z.infer<typeof docParams>;

export const createDocInput = z.object({
	params: docParams,
});
export type CreateDocInput = z.infer<typeof createDocInput>;

export const deleteDocInput = z.object({
	id: z.number().int(),
});
export type DeleteDocInput = z.infer<typeof deleteDocInput>;

export const getDocInput = z.object({
	id: z.number().int(),
});
export type GetDocInput = z.infer<typeof getDocInput>;
