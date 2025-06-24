import { TRPCError } from '@trpc/server';
import {
	createPasswordResetToken,
	getPasswordResetToken,
	markPasswordResetTokenUsed,
	canRequestPasswordReset,
} from '@/api/queries/passwordResetQueries';
import { db } from '@/api/database/kysely';
import { generateToken } from '@/lib/auth/generateToken';
import { sendEmail } from '@/lib/email/sendEmail';
import { logAuthEvent } from '@/lib/logs/logAuthEvents';
import { AuthEventType } from '@/config/enums';
import { enqueueLog } from '@/lib/logs/logQueue';
import { safeLog } from '@/lib/logs/safeLog';
import { hashPasswordIfPresent } from '../utils/hasherUtils';

const RESET_EXPIRATION_MINUTES = 15;

export async function requestPasswordReset({ email }: { email: string }) {
	const user = await db.selectFrom('users').selectAll().where('email', '=', email).executeTakeFirst();

	if (!user) return; // Silently ignore to avoid leaking user existence

	const canRequest = await canRequestPasswordReset(email);
	if (!canRequest) throw new TRPCError({ code: 'TOO_MANY_REQUESTS' });

	const token = generateToken();
	const expiresAt = new Date(Date.now() + RESET_EXPIRATION_MINUTES * 60 * 1000);

	await createPasswordResetToken(user.id, token, expiresAt);

	await sendEmail({
		to: user.email,
		subject: 'Reset your password',
		html: `<p>Click <a href="${process.env.BASE_URL}/reset-password?token=${token}">here</a> to reset your password. This link expires in ${RESET_EXPIRATION_MINUTES} minutes.</p>`,
	});

	enqueueLog(() =>
		safeLog(() => logAuthEvent(user.id, AuthEventType.PasswordResetRequested, { details: { email } }), 'logAuth')
	);
}

export async function validateResetToken({ token }: { token: string }) {
	const record = await getPasswordResetToken(token);
	if (!record || record.used || new Date(record.expires_at) < new Date()) {
		throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid or expired token' });
	}
	return record;
}

export async function completePasswordReset({ token, password }: { token: string; password: string }) {
	const record = await getPasswordResetToken(token);
	if (!record || record.used || new Date(record.expires_at) < new Date()) {
		throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid or expired token' });
	}
	const hashedInput = await hashPasswordIfPresent({ password });

	await db.transaction().execute(async (trx) => {
		await trx
			.updateTable('users')
			.set({ password_hash: hashedInput.password_hash, must_change_password: false })
			.where('id', '=', record.user_id)
			.execute();
		await markPasswordResetTokenUsed(token, trx);
	});

	enqueueLog(() => safeLog(() => logAuthEvent(record.user_id, AuthEventType.PasswordChanged), 'logAuth'));

	return { success: true };
}
