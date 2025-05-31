import { z } from 'zod';

export const getUsersInput = z.object({
	disabled: z.boolean().optional(),
	limit: z.number().optional(),
	offset: z.number().optional(),
});
export const getUserInput = z.object({ id: z.number().int() });

export const createUserInput = z.object({
	first: z.string(),
	last: z.string(),
	email: z.string().email(),
	password_hash: z.string(),
	phone: z.string().optional(),
	role: z.string().optional(),
});

export const updateUserInput = z.object({
	id: z.number().int(),
	params: z.object({
		name: z.string().optional(),
		email: z.string().email().optional(),
		password_hash: z.string().optional(),
		phone_number: z.string().optional(),
		role: z.string().optional(),
		disabled: z.boolean().optional(),
	}),
});

export const deleteUserInput = z.object({ id: z.number().int() });
