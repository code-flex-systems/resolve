import { z } from 'zod';

export const StrongPasswordSchema = z
	.string()
	.min(12)
	.max(100)
	.regex(
		/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).*$/,
		'Password must contain uppercase, lowercase, number, and special character'
	);

export const RequestPasswordResetSchema = z.object({
	email: z.string().email(),
});

export const ValidateResetTokenSchema = z.object({
	token: z.string().min(32),
});

export const CompletePasswordResetSchema = z.object({
	token: z.string().min(32),
	password: StrongPasswordSchema,
});
