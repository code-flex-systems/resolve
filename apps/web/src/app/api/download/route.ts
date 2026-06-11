export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import * as documentStorage from '@/lib/storage/documentStorage';
import { db } from '@/api/database/kysely';

/**
 * GET /api/download?docId=123
 *
 * Verifies the user has access to the document, then redirects to a
 * short-lived signed Supabase Storage URL. Serving via redirect keeps
 * file bytes off the Next.js server (Vercel response size limits) and
 * works transparently for <img src> and link consumers.
 */
export async function GET(request: NextRequest) {
	try {
		// Check authentication
		const session = await getSession();
		if (!session?.user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const clientId = session.user.client_id;
		if (!clientId) {
			return NextResponse.json({ error: 'Client ID not found' }, { status: 400 });
		}

		// Get document ID from query params
		const searchParams = request.nextUrl.searchParams;
		const docId = searchParams.get('docId');

		if (!docId) {
			return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
		}

		// Get document from database and verify access
		const doc = await db
			.selectFrom('doc')
			.select(['id', 'storage_key'])
			.where('id', '=', docId)
			.where('client_id', '=', clientId)
			.executeTakeFirst();

		if (!doc) {
			return NextResponse.json({ error: 'Document not found or access denied' }, { status: 404 });
		}

		// Sanitize storage key to remove any non-ASCII characters that might have slipped through
		const sanitizedStorageKey = doc.storage_key.replace(/[^\x00-\x7F]/g, '_');

		// Redirect to a short-lived signed URL (served inline by storage)
		const signedUrl = await documentStorage.createSignedDownloadUrl(sanitizedStorageKey);

		return NextResponse.redirect(signedUrl, {
			headers: {
				// Signed URLs expire - don't let browsers cache the redirect
				'Cache-Control': 'no-store',
			},
		});
	} catch (error) {
		console.error('File download error:', error);
		return NextResponse.json(
			{
				error: 'Failed to download file',
				details: error instanceof Error ? error.message : 'Unknown error',
			},
			{ status: 500 }
		);
	}
}
