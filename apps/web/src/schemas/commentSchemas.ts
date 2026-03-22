import { z } from 'zod';

const commentFilters = z.object({
	userId: z.string().optional(),
	checklistId: z.string().uuid().optional(),
	claimId: z.string().uuid().optional(),
	instanceId: z.string().uuid().optional(),
	questionId: z.string().uuid().optional(),
});

export const createCommentInput = z.object({
	checklistId: z.string().uuid(),
	claimId: z.string().uuid(),
	instanceId: z.string().uuid().optional(),
	questionId: z.string().uuid().optional(),
	body: z.string().max(500),
});

export const deleteCommentInput = z.object({
	id: z.string().uuid(),
});

export const getCommentInput = z.object({
	id: z.string().uuid(),
});

export const getCommentsInput = z.object({
	filters: commentFilters,
	limit: z.number().optional(),
	offset: z.number().optional(),
});

export const getCommentCountInput = z.object({
	filters: commentFilters,
});

export const getCommentsForPageInput = z.object({
	checklistId: z.string().uuid(),
	claimId: z.string().uuid(),
	instanceId: z.string().uuid(),
});
