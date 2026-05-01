import { TRPCError } from '@trpc/server';
import type { Context } from '@/server/trpc/context';
import { db } from '@/api/database/kysely';

export async function requireOwnership(ctx: Context, checklistId: string, claimId: string) {
	const checklistClaim = await db
		.selectFrom('checklist_claim')
		.select(['created_by', 'assignee'])
		.where('checklist_id', '=', checklistId)
		.where('claim_id', '=', claimId)
		.executeTakeFirstOrThrow(
			() => new TRPCError({ code: 'BAD_REQUEST', message: 'Checklist + claim does not exist' })
		);

	if (
		!ctx.session?.user.id ||
		![checklistClaim.created_by, checklistClaim.assignee].includes(ctx.session?.user.id)
	) {
		throw new TRPCError({
			code: 'FORBIDDEN',
			message: 'User is neither the creator nor the current assignee on this checklist + claim',
		});
	}
}
