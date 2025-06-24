import NextAuth from 'next-auth';
import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { KyselyAdapter } from '@auth/kysely-adapter';
import { db } from '@/api/database/kysely';
import { compareSync } from 'bcrypt';
import { logAuthMiddleware } from '@/middleware/logAuthMiddleware';
import { AuthEventType } from '@/config/enums';
import { getIP, getUserAgent } from './utils/headerUtils';

export const authOptions: NextAuthOptions = {
	adapter: KyselyAdapter(db),
	providers: [
		CredentialsProvider({
			id: 'credentials',
			name: 'Credentials',
			credentials: {
				username: { label: 'Username', type: 'text' },
				password: { label: 'Password', type: 'password' },
			},
			async authorize(credentials, req) {
				// Check for credentials
				if (!credentials) {
					logAuthMiddleware(null, AuthEventType.MissingCredentials, {
						ip: getIP(req),
						userAgent: getUserAgent(req),
					});
					return null;
				}

				// Find user
				const user = await db
					.selectFrom('users')
					.selectAll()
					.where('email', '=', credentials.username)
					.executeTakeFirst();
				if (user && compareSync(credentials.password, user.password_hash)) {
					// Login success
					logAuthMiddleware(user.id, AuthEventType.LoginSuccess, {
						ip: getIP(req),
						userAgent: getUserAgent(req),
					});
					return {
						id: user.id.toString(),
						email: user.email,
						name: `${user.first} ${user.last}`,
						phone: user.phone ?? null,
						role: user.role ?? null,
						client_id: user.client_id ?? null,
						must_change_password: user.must_change_password,
					};
				} else {
					// Login failure
					logAuthMiddleware(null, AuthEventType.LoginFailure, {
						ip: getIP(req),
						userAgent: getUserAgent(req),
						identityKey: user?.id ?? 'None',
						details: {
							emailAttempted: credentials.username,
						},
					});
					return null;
				}
			},
		}),
		// Add other providers here (e.g., GitHub, Google)
	],
	session: {
		strategy: 'jwt',
		maxAge: 24 * 60 * 60, // 1 day
	},
	pages: {
		signIn: '/login',
		// signOut, error, verifyRequest, newUser
	},
	callbacks: {
		async jwt({ token, user }) {
			if (user) {
				token.id = user.id;
				token.name = user.name;
				token.email = user.email;
				token.phone = user.phone;
				token.role = user.role;
				token.client_id = user.client_id;
				token.must_change_password = user.must_change_password;
			}
			return token;
		},
		async session({ session, token }) {
			session.user = {
				id: token.id,
				name: token.name,
				email: token.email,
				phone: token.phone,
				role: token.role,
				client_id: token.client_id,
				must_change_password: token.must_change_password,
			};
			return session;
		},
	},
	secret: process.env.AUTH_SECRET,
};

export default NextAuth(authOptions);
