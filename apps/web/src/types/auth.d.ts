import NextAuth from 'next-auth';

declare module 'next-auth' {
	interface Session {
		user: {
			id: string;
			name: string;
			email: string;
			phone: string | null;
			role: string | null;
			client_id: string | null;
		};
	}

	interface User {
		id: string;
		name: string;
		email: string;
		phone: string | null;
		role: string | null;
		client_id: string | null;
	}
}

declare module 'next-auth/adapters' {
	interface AdapterUser {
		phone: string | null;
		role: string | null;
		client_id: string | null;
	}
}

declare module 'next-auth/jwt' {
	interface JWT {
		id: string;
		name: string;
		email: string;
		phone: string | null;
		role: string | null;
		client_id: string | null;
	}
}
