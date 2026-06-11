import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Public routes that don't require authentication
// Note: sign-up is intentionally excluded - this is an invite-only application
const PUBLIC_ROUTES = [/^\/login(\/.*)?$/, /^\/auth(\/.*)?$/];

function isPublicRoute(pathname: string): boolean {
	return PUBLIC_ROUTES.some((route) => route.test(pathname));
}

export async function middleware(request: NextRequest) {
	let response = NextResponse.next({ request });

	const supabase = createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
		{
			cookies: {
				getAll() {
					return request.cookies.getAll();
				},
				setAll(cookiesToSet) {
					cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
					response = NextResponse.next({ request });
					cookiesToSet.forEach(({ name, value, options }) =>
						response.cookies.set(name, value, options)
					);
				},
			},
		}
	);

	// Refresh the auth token if needed (must call getUser, not getSession)
	const {
		data: { user },
	} = await supabase.auth.getUser();

	const { pathname } = request.nextUrl;

	// API routes enforce auth themselves (tRPC protectedProcedure, route handlers)
	if (!user && !isPublicRoute(pathname) && !pathname.startsWith('/api')) {
		const loginUrl = request.nextUrl.clone();
		loginUrl.pathname = '/login';
		loginUrl.search = '';
		return NextResponse.redirect(loginUrl);
	}

	return response;
}

export const config = {
	matcher: [
		// Skip Next.js internals and static files
		'/((?!api/health|_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
		// Always run for API routes
		'/(api|trpc)(.*)',
	],
};
