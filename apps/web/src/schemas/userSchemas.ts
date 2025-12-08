import config from '@/config/config';
import { parseDate } from '@/lib/parsers/zodParsers';
import { z } from 'zod';

export const getUsersInput = z.object({
	searchTerm: z.string().optional(),
});
export const getUsersPaginatedInput = z.object({
	disabled: z.boolean().optional(),
	inactive: z.boolean().optional(),
	limit: z.number().optional(),
	offset: z.number().optional(),
	searchTerm: z.string().optional(),
});

export const getUsersWithDeskAssignmentsInput = z.object({
	limit: z.number().optional(),
	offset: z.number().optional(),
	searchTerm: z.string().optional(),
	deskLocationTypeId: z.number().int().optional(),
	deskLocationId: z.number().int().optional(),
});
export const getUserInput = z.object({ id: z.string() });

export const getUserActivityInput = z.object({
	filters: z.object({
		range: z.tuple([parseDate(), parseDate()]),
		checklistId: z.number().int().optional(),
		claimId: z.number().int().optional(),
		users: z.array(z.string()).optional(),
		searchTerm: z.string().optional(),
	}),
});

export const getUserActivityDetailInput = z.object({
	date: z.string(),
});

export const getUserCountInput = z.object({
	clientId: z.string().optional(),
});

export const createUsersInput = z.object({
	users: z.array(
		z.object({
			email: z.string().email(),
			role: z.string().optional(),
		})
	),
});

export const updateUserInput = z.object({
	id: z.string(),
	params: z.object({
		first: z.string().optional(),
		last: z.string().optional(),
		email: z.string().email().optional(),
		phone: z.string().optional(),
		role: z.nativeEnum(config.ROLES).optional(),
		disabled: z.boolean().optional(),
	}),
});

export const deleteUserInput = z.object({ id: z.string() });
