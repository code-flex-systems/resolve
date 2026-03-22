import { TRPCError } from '@trpc/server';
import type { Context } from '@/server/trpc/context';
import { db } from '@/api/database/kysely';

export async function requireAssigned(ctx: Context, checklistId: string, claimId: string) {
	const checklistClaim = await db
		.selectFrom('checklist_claim')
		.select('assignee')
		.where('checklist_id', '=', checklistId)
		.where('claim_id', '=', claimId)
		.executeTakeFirstOrThrow(
			() => new TRPCError({ code: 'BAD_REQUEST', message: 'Checklist + claim does not exist' })
		);

	if (ctx.session?.user.id !== checklistClaim.assignee) {
		throw new TRPCError({ code: 'FORBIDDEN', message: 'User is not currently assigned to this checklist + claim' });
	}
}
