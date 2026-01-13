import { ActionLogStatus, ActionType } from '@/config/enums';
import { ProtectedContext } from '@/server/trpc/trpc';
import * as actionQueries from '../queries/actionQueries';
import { sendEmail } from '@/lib/email/sendEmail';
import { ActionDefinition, DateRange } from '@/types/types';
import { TRPCError } from '@trpc/server';
import { logAdminAction, AdminAction, EntityName } from '@/api/utils/adminActionLogger';

/**
 * Validate action definition based on action type
 * Throws TRPCError if validation fails
 */
function validateActionDefinition(type: ActionType, definition: ActionDefinition): void {
	switch (type) {
		case ActionType.EMAIL:
			if (!definition.title?.trim()) {
				throw new TRPCError({
					code: 'BAD_REQUEST',
					message: 'Email action requires a title',
				});
			}
			if (!definition.message?.trim()) {
				throw new TRPCError({
					code: 'BAD_REQUEST',
					message: 'Email action requires a message',
				});
			}
			if (!definition.recipients?.length) {
				throw new TRPCError({
					code: 'BAD_REQUEST',
					message: 'Email action requires at least one recipient',
				});
			}
			// Validate email format for recipients
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			for (const recipient of definition.recipients) {
				if (!emailRegex.test(recipient)) {
					throw new TRPCError({
						code: 'BAD_REQUEST',
						message: `Invalid email address: ${recipient}`,
					});
				}
			}
			break;
		case ActionType.EVENT:
			// Event validation - placeholder for future implementation
			break;
		case ActionType.LETTER:
			// Letter validation - placeholder for future implementation
			break;
		case ActionType.TASK:
			// Task validation - placeholder for future implementation
			break;
		default:
			throw new TRPCError({
				code: 'BAD_REQUEST',
				message: `Unknown action type: ${type}`,
			});
	}
}

export async function executeActions(ctx: ProtectedContext, { answerIds }: { answerIds: number[] }) {
	const actions = await actionQueries.getActions(ctx, answerIds);

	// Collect logs from all action executions
	const logs: Array<{ actionId: number; status: ActionLogStatus }> = [];

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
			}
			// Collect log entry instead of writing immediately
			logs.push({ actionId: action.id, status });
		})
	);

	// Batch insert all logs in a single query (fire-and-forget)
	actionQueries.logActions(ctx, logs).catch(console.error);
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
	// Validate action definition before database write
	validateActionDefinition(type, definition);

	// Upsert action and log admin action within transaction
	const result = await ctx.db.transaction().execute(async (trx) => {
		const action = await actionQueries.upsertAction({ ...ctx, db: trx }, answerId, type, definition);

		// Log admin action for action upsert (always treat as UPDATE since it uses onConflict)
		await logAdminAction({ ...ctx, db: trx }, {
			entityId: action.id,
			entityName: EntityName.ACTION,
			action: AdminAction.UPDATE,
			value: { answerId, type, definition },
		});

		return action;
	});

	return result;
}
