import { parseDate } from '@/lib/parsers/zodParsers';
import { z } from 'zod';

export const getUsersInput = z.object({
	disabled: z.boolean().optional(),
	limit: z.number().optional(),
	offset: z.number().optional(),
	searchTerm: z.string().optional(),
});
export const getUserInput = z.object({ id: z.string() });

export const createUsersInput = z.object({
	users: z.array(
		z.object({
			first: z.string(),
			last: z.string(),
			email: z.string().email(),
			phone: z.string().optional(),
			role: z.string().optional(),
		})
	),
});

export const updateUserInput = z.object({
	id: z.string(),
	params: z.object({
		name: z.string().optional(),
		email: z.string().email().optional(),
		password: z.string().optional(),
		phone_number: z.string().optional(),
		role: z.string().optional(),
		disabled: z.boolean().optional(),
		email_verified: parseDate().optional(),
		phone_verified: parseDate().optional(),
		must_change_password: z.boolean().optional(),
	}),
});

export const deleteUserInput = z.object({ id: z.string() });
