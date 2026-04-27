export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getClerkSession } from '@/lib/auth/clerk-session';
import * as blobStorage from '@/lib/azure/blobStorage';
import { db } from '@/api/database/kysely';

/**
 * GET /api/download?docId=123
 *
 * Downloads a document from Azure Blob Storage.
 * Requires authentication and verifies user has access to the document.
 */
export async function GET(request: NextRequest) {
	try {
		// Check authentication
		const session = await getClerkSession();
		if (!session?.user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const clientId = session.user.client_id;
		if (!clientId) {
			return NextResponse.json(
				{ error: 'Client ID not found' },
				{ status: 400 }
			);
		}

		// Get document ID from query params
		const searchParams = request.nextUrl.searchParams;
		const docIdStr = searchParams.get('docId');

		if (!docIdStr) {
			return NextResponse.json(
				{ error: 'Document ID is required' },
				{ status: 400 }
			);
		}

		const docId = docIdStr;

		// Get document from database and verify access
		const doc = await db
			.selectFrom('doc')
			.selectAll()
			.where('id', '=', docId)
			.where('client_id', '=', clientId)
			.executeTakeFirst();

		if (!doc) {
			return NextResponse.json(
				{ error: 'Document not found or access denied' },
				{ status: 404 }
			);
		}

		console.log('Downloading document:', {
			docId,
			storage_key: doc.storage_key,
			storage_key_length: doc.storage_key?.length,
			storage_key_chars: doc.storage_key?.split('').map((c, i) => ({ i, c, code: c.charCodeAt(0) })),
		});

		// Sanitize storage key to remove any non-ASCII characters that might have slipped through
		const sanitizedStorageKey = doc.storage_key.replace(/[^\x00-\x7F]/g, '_');

		if (sanitizedStorageKey !== doc.storage_key) {
			console.warn('Storage key contained non-ASCII characters:', {
				original: doc.storage_key,
				sanitized: sanitizedStorageKey,
			});
		}

		// Download from Azure Blob Storage
		const fileBuffer = await blobStorage.downloadDocument(sanitizedStorageKey);

		// Sanitize filename for Content-Disposition header
		// HTTP headers must be ASCII-only, so we need to:
		// 1. Remove/replace any non-ASCII characters for the ASCII fallback
		// 2. Use RFC 5987 encoding for the UTF-8 version
		const asciiFilename = doc.filename
			.replace(/[^\x20-\x7E]/g, '_') // Replace non-ASCII with underscore
			.replace(/["\\]/g, '') // Remove quotes and backslashes
			.substring(0, 255); // Limit length

		// RFC 5987 encoding for non-ASCII filenames
		const encodedFilename = encodeURIComponent(doc.filename);

		// Return file with appropriate headers
		return new NextResponse(fileBuffer, {
			headers: {
				'Content-Type': doc.mime_type || 'application/octet-stream',
				// Use both ASCII fallback and RFC 5987 encoded filename
				'Content-Disposition': `inline; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`,
				'Content-Length': fileBuffer.length.toString(),
			},
		});
	} catch (error) {
		console.error('File download error:', error);
		return NextResponse.json(
			{ error: 'Failed to download file', details: error instanceof Error ? error.message : 'Unknown error' },
			{ status: 500 }
		);
	}
}
