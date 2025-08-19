import { z } from 'zod';

const commentFilters = z.object({
	userId: z.string().optional(),
	checklistId: z.number().optional(),
	claimId: z.number().optional(),
	instanceId: z.number().optional(),
	questionId: z.number().optional(),
});

export const createCommentInput = z.object({
	checklistId: z.number(),
	claimId: z.number(),
	instanceId: z.number().optional(),
	questionId: z.number().optional(),
	body: z.string().max(500),
});

export const deleteCommentInput = z.object({
	id: z.number(),
});

export const getCommentInput = z.object({
	id: z.number(),
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
	checklistId: z.number(),
	claimId: z.number(),
	instanceId: z.number(),
});
