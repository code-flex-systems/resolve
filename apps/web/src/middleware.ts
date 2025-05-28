import { withAuth } from 'next-auth/middleware';

export default withAuth(
	// options
	{
		pages: {
			signIn: '/login', // redirect here if not signed in
		},
		callbacks: {
			authorized: ({ token }) => !!token, // only allow if a valid JWT is present
		},
	}
);

// apply to everything except Next.js internals and your auth endpoints
export const config = {
	matcher: [
		/*
		 * Match all request paths except for:
		 *  - next-auth API routes
		 *  - static files (_next/static, _next/image)
		 *  - favicon.ico
		 */
		'/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
	],
};
