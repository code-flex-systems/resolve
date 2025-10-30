import { sql } from 'kysely';
import { Context } from '@/server/trpc/context';

export async function createPasswordResetToken(ctx: Context, userId: string, token: string, expiresAt: Date) {
	return ctx.db
		.insertInto('password_reset_tokens')
		.values({
			user_id: userId,
			token,
			expires_at: expiresAt,
			used: false,
		})
		.returningAll()
		.executeTakeFirst();
}

export async function getPasswordResetToken(ctx: Context, token: string) {
	return ctx.db.selectFrom('password_reset_tokens').selectAll().where('token', '=', token).executeTakeFirst();
}

export async function markPasswordResetTokenUsed(ctx: Context, token: string) {
	return ctx.db
		.updateTable('password_reset_tokens')
		.set({
			used: true,
			expires_at: sql`now()`,
		})
		.where('token', '=', token)
		.execute();
}

export async function deleteExpiredPasswordResetTokens(ctx: Context) {
	return ctx.db
		.deleteFrom('password_reset_tokens')
		.where('expires_at', '<', sql`now()`.$castTo<Date>())
		.execute();
}

export async function canRequestPasswordReset(ctx: Context, email: string, limit = 3, windowMinutes = 15) {
	const recentRequests = await ctx.db
		.selectFrom('password_reset_tokens')
		.innerJoin('users', 'users.id', 'password_reset_tokens.user_id')
		.select(({ fn }) => fn.countAll().as('count'))
		.where('users.email', '=', email)
		.where(
			'password_reset_tokens.created_at',
			'>=',
			sql`now() - interval '${sql.raw(windowMinutes.toString())} minutes'`.$castTo<Date>()
		)
		.executeTakeFirst();

	return (Number(recentRequests?.count) ?? 0) < limit;
}
