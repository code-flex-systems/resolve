import { type EmailOtpType } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * GET /auth/confirm?token_hash=...&type=invite|recovery&next=/auth/set-password
 *
 * Verifies email link tokens (invites, password recovery) and establishes
 * a session, then redirects to the `next` path. Supabase email templates
 * must point at this route (see .env.example notes).
 */
export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url);
	const tokenHash = searchParams.get('token_hash');
	const type = searchParams.get('type') as EmailOtpType | null;
	const next = searchParams.get('next') ?? '/';

	const redirectTo = request.nextUrl.clone();
	redirectTo.search = '';

	if (tokenHash && type) {
		const supabase = await createSupabaseServerClient();
		const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

		if (!error) {
			redirectTo.pathname = next;
			return NextResponse.redirect(redirectTo);
		}
	}

	redirectTo.pathname = '/login';
	redirectTo.searchParams.set('error', 'invalid_link');
	return NextResponse.redirect(redirectTo);
}
