import { type NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * GET /auth/callback?code=...&next=/
 *
 * PKCE code exchange endpoint. Used when an auth flow started in this
 * browser redirects back with an authorization code.
 */
export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url);
	const code = searchParams.get('code');
	const next = searchParams.get('next') ?? '/';

	const redirectTo = request.nextUrl.clone();
	redirectTo.search = '';

	if (code) {
		const supabase = await createSupabaseServerClient();
		const { error } = await supabase.auth.exchangeCodeForSession(code);

		if (!error) {
			redirectTo.pathname = next;
			return NextResponse.redirect(redirectTo);
		}
	}

	redirectTo.pathname = '/login';
	redirectTo.searchParams.set('error', 'invalid_link');
	return NextResponse.redirect(redirectTo);
}
