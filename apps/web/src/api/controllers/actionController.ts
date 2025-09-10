import { ActionLogStatus, ActionType } from '@/config/enums';
import { ProtectedContext } from '@/server/trpc/trpc';
import * as actionQueries from '../queries/actionQueries';
import { sendEmail } from '@/lib/email/sendEmail';
import { ActionDefinition, DateRange } from '@/types/types';
import { TRPCError } from '@trpc/server';

export async function executeActions(ctx: ProtectedContext, { answerIds }: { answerIds: number[] }) {
	const actions = await actionQueries.getActions(ctx, answerIds);
	await Promise.all(
		actions.map(async (action) => {
			const definition = action.definition as ActionDefinition;
			let status: ActionLogStatus = ActionLogStatus.SUCCESS;
			try {
				switch (action.type as ActionType) {
					case ActionType.EMAIL:
						if (!definition.title || !definition.message || !definition.recipients?.length) {
							throw new TRPCError({
								code: 'BAD_REQUEST',
								message: 'Missing required email information to execute action',
							});
						}
						// if (definition.template_id) TODO
						await sendEmail({
							to: definition.recipients.join(','),
							subject: definition.title,
							html: definition.message,
						});
						break;
					case ActionType.EVENT:
						// TODO
						break;
					case ActionType.LETTER:
						// TODO
						break;
					case ActionType.TASK:
						// TODO
						break;
					default:
						break;
				}
			} catch (e) {
				status = ActionLogStatus.FAILURE;
				console.error(e);
			} finally {
				actionQueries.logAction(ctx, action.id, status).catch(console.error);
			}
		})
	);
}

export async function getAction(ctx: ProtectedContext, { answerId }: { answerId: number }) {
	const result = await actionQueries.getAction(ctx, answerId);
	return result;
}

export async function getActionStats(ctx: ProtectedContext) {
	const results = await actionQueries.getActionStats(ctx);
	return results;
}

export async function getActionStatsDetail(
	ctx: ProtectedContext,
	{
		filters,
	}: { filters: { checklistId?: number; claimId?: number; users?: string[]; range?: DateRange; searchTerm?: string } }
) {
	const results = await actionQueries.getActionStatsDetail(ctx, filters);
	return results;
}

export async function upsertAction(
	ctx: ProtectedContext,
	{ answerId, type, definition }: { answerId: number; type: ActionType; definition: ActionDefinition }
) {
	const result = await actionQueries.upsertAction(ctx, answerId, type, definition);
	return result;
}
