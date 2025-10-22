import * as checklistQueries from '@/api/queries/checklistQueries';
import * as pageQueries from '@/api/queries/pageQueries';
import * as questionQueries from '@/api/queries/questionQueries';
import * as responseQueries from '@/api/queries/responseQueries';
import { getUpdatedPageStatus } from '@/api/utils/utils';
import { ClaimStatus, PageInstanceStatus } from '@/config/enums';
import { ProtectedContext } from '@/server/trpc/trpc';
import { DateRange, DateRangeStrict, Interval, QuestionResponse } from '@/types/types';
import { TRPCError } from '@trpc/server';
import { db } from '../database/kysely';
import { executeActions } from './actionController';

/**
 * Recalculate page instance status based on responses.
 *
 * @param ctx - request context
 * @param input - checklist, claim and instance ids
 */
export async function evaluateResponses(
	ctx: ProtectedContext,
	{
		checklistId,
		claimId,
		instanceId,
	}: {
		checklistId: number;
		claimId: number;
		instanceId: number;
	}
) {
	const pageInstance = await pageQueries.getPageInstance(ctx, instanceId);
	if (!pageInstance) throw new TRPCError({ code: 'NOT_FOUND', message: 'Instance not found' });
	const [questionCount = 0, responseCount = 0] = await Promise.all([
		questionQueries.getQuestionCount(ctx, pageInstance.id),
		responseQueries.getResponseCount(ctx, checklistId, claimId, instanceId),
	]);
	const updatedPageStatus = getUpdatedPageStatus(questionCount, responseCount);
	// Persist the new status for the page instance
	await pageQueries.modifyPageInstanceStatus(ctx, {
		claimId,
		instanceIds: [instanceId],
		newStatus: updatedPageStatus,
		templateVersion: pageInstance.version,
	});
	return updatedPageStatus;
}

/**
 * Get responses selecting a specific answer.
 *
 * @param ctx - request context
 * @param input - answer id and optional interval
 */
export async function getResponsesForAnswer(
	ctx: ProtectedContext,
	{
		answerId,
		filters,
		limit,
		offset,
	}: {
		answerId: number;
		filters: { range: DateRangeStrict; users?: string[] };
		limit: number;
		offset: number;
	}
) {
	const results = await responseQueries.getResponsesForAnswer(ctx, answerId, filters, limit, offset);
	return results;
}

/**
 * Fetch responses for a claim on a checklist.
 *
 * @param ctx - request context
 * @param input - checklist, claim and optional instance id
 */
export async function getResponsesForClaimChecklist(
	ctx: ProtectedContext,
	{
		checklistId,
		claimId,
		instanceId,
	}: {
		checklistId: number;
		claimId: number;
		instanceId?: number;
	}
) {
	const results = await responseQueries.getResponsesForClaimChecklist(ctx, checklistId, claimId, instanceId);
	return results;
}

export async function getResponseAuditLogs(
	ctx: ProtectedContext,
	{
		filters,
		limit,
		offset,
	}: {
		filters: { checklistId?: number; claimId?: number; emails?: string[]; range?: DateRange; searchTerm?: string };
		limit: number;
		offset: number;
	}
) {
	const results = await responseQueries.getResponseAuditLogs(ctx, filters, limit, offset);
	return results;
}

export async function getResponseAuditLogStats(
	ctx: ProtectedContext,
	{
		filters,
	}: {
		filters: {
			range: DateRangeStrict;
			checklistId?: number;
			claimId?: number;
			users?: string[];
			searchTerm?: string;
		};
	}
): Promise<{
	avg: number;
	total: number;
	maxRow: Awaited<ReturnType<typeof responseQueries.getResponseAuditLogStats>>[number] | null;
}> {
	const results = await responseQueries.getResponseAuditLogStats(ctx, filters);
	if (!results) return { avg: 0, total: 0, maxRow: null };
	const total = results.reduce((prev, curr) => prev + curr.event_count, 0);
	const maxRow = results.reduce(
		(prev, curr) => {
			return curr.event_count > prev.event_count ? curr : prev;
		},
		{ event_count: 0, activity_date: '' }
	);
	const avg = results.length ? Math.ceil(total / results.length) : 0;
	return { avg, total, maxRow };
}

/**
 * Insert or update multiple responses at once.
 *
 * @param ctx - request context
 * @param input - array of question responses
 * @returns updated instance visibility and status
 */
export async function upsertQuestionResponses(
	ctx: ProtectedContext,
	{ responses, claimStatus }: { responses: any[]; claimStatus?: ClaimStatus }
) {
	if (!responses?.[0]) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid responses' });
	const parsedResponses = responses as QuestionResponse[];
	const sampleResponse = parsedResponses[0];

	let newStatus: PageInstanceStatus = PageInstanceStatus.UNSTARTED;
	let newClaimStatus: ClaimStatus = ClaimStatus.UNWORKED;
	await db.transaction().execute(async (trx) => {
		newStatus = await responseQueries.upsertQuestionResponses(ctx, responses, trx);
		// Update checklist + claim status when
		// a) this is the first work being done on the checklist, or
		// b) this work is being done post-submission
		if (!claimStatus || [ClaimStatus.UNWORKED, ClaimStatus.SUBMITTED].includes(claimStatus)) {
			newClaimStatus = ClaimStatus.IN_PROGRESS;
			await checklistQueries.modifyChecklistClaim(
				ctx,
				sampleResponse.checklist_id,
				sampleResponse.claim_id,
				ClaimStatus.IN_PROGRESS,
				undefined,
				trx
			);
		}
	});
	const visibleIds: number[] = await pageQueries.getVisiblePageInstances(
		ctx,
		sampleResponse.checklist_id,
		sampleResponse.claim_id
	);

	// Kick off related actions asynchronously
	let answerIds: number[] = [];
	parsedResponses.forEach((r) => {
		answerIds = answerIds.concat(r.selected_answers.map((sa) => sa.answer_id));
	});
	executeActions(ctx, { answerIds }).catch(console.error);

	return {
		updatedInstanceId: sampleResponse.instance_id,
		status: newStatus,
		claimStatus: newClaimStatus,
		visibleIds,
	};
}
