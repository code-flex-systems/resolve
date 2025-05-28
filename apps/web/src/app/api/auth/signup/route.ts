import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcrypt';
import { db } from '@/api/database/kysely';

export async function POST(req: NextRequest) {
	console.log(req);
	const { email, password, first, last, phone } = await req.json();
	if (!email || !password || !first || !last || !phone) {
		return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
	}
	// 1) Hash the password
	const password_hash = await hash(password, 10);
	try {
		// 2) Insert into your users table
		await db.insertInto('users').values({ email, password_hash, first, last, phone }).executeTakeFirst();
		return NextResponse.json({ ok: true });
	} catch (e: any) {
		// handle duplicate key, etc.
		return NextResponse.json(
			{ error: e.message.includes('duplicate') ? 'User exists' : 'DB error' },
			{ status: 500 }
		);
	}
}
