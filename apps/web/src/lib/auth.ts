import NextAuth from 'next-auth';
import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { KyselyAdapter } from '@auth/kysely-adapter';
import { db } from '@/api/database/kysely';
import { compareSync } from 'bcrypt';

// NextAuth configuration options
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
			async authorize(credentials) {
				if (!credentials) return null;
				// Replace with your user lookup & password verification logic
				const user = await db
					.selectFrom('users')
					.selectAll()
					.where('email', '=', credentials.username)
					.executeTakeFirst();
				if (user && compareSync(credentials.password, user.password_hash)) {
					return {
						id: user.id.toString(),
						email: user.email,
						name: `${user.first} ${user.last}`,
						phone: user.phone,
					};
				}
				return null;
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
				token.phone = (user as any).phone;
			}
			return token;
		},
		async session({ session, token }) {
			session.user = {
				id: token.id as string,
				name: token.name as string,
				email: token.email as string,
				phone: token.phone as string,
			};
			return session;
		},
	},
	secret: process.env.AUTH_SECRET,
};

// Export NextAuth handler
export default NextAuth(authOptions);
