export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import * as documentStorage from '@/lib/storage/documentStorage';
import {
	validateFileType,
	getAllowedExtensions,
	getAllowedMimeTypes,
} from '@/config/allowedFileTypes';

/**
 * POST /api/upload
 *
 * Validates file metadata and issues a signed URL for uploading the file
 * directly to Supabase Storage from the browser (see uploadClient.ts).
 * Requires authentication.
 *
 * Body: { filename, mimeType, size, allowedExtensions? }
 */
export async function POST(request: NextRequest) {
	try {
		// Check authentication
		const session = await getSession();
		if (!session?.user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// NOTE: Role authorization removed to allow regular users to upload files
		// as part of their checklist responses. Security is enforced through:
		// 1. Auto-organization into user-specific folders
		// 2. Document creation permissions in docController
		// 3. Response validation in responseQueries

		const clientId = session.user.client_id;
		if (!clientId) {
			return NextResponse.json({ error: 'Client ID not found' }, { status: 400 });
		}

		const body = await request.json().catch(() => null);
		const filename: string | undefined = body?.filename;
		const mimeType: string = body?.mimeType || 'application/octet-stream';
		const size: number = Number(body?.size) || 0;
		const allowedExtensions: string[] | null = Array.isArray(body?.allowedExtensions)
			? body.allowedExtensions.map((ext: string) => ext.trim().toLowerCase())
			: null;

		if (!filename) {
			return NextResponse.json({ error: 'No filename provided' }, { status: 400 });
		}

		// Validate file type (SECURITY: whitelist approach)
		const fileValidation = validateFileType(filename, mimeType);
		if (!fileValidation.valid) {
			return NextResponse.json(
				{
					error: fileValidation.reason,
					allowedExtensions: getAllowedExtensions(),
					allowedMimeTypes: getAllowedMimeTypes(),
				},
				{ status: 415 } // 415 Unsupported Media Type
			);
		}

		// Additional validation: check against allowed extensions if specified
		if (allowedExtensions && allowedExtensions.length > 0) {
			const fileExtension = filename.substring(filename.lastIndexOf('.')).toLowerCase();
			if (!allowedExtensions.includes(fileExtension)) {
				return NextResponse.json(
					{
						error: `File type not allowed. Only the following extensions are permitted: ${allowedExtensions.join(', ')}`,
						allowedExtensions: allowedExtensions,
					},
					{ status: 415 } // 415 Unsupported Media Type
				);
			}
		}

		// Enforce file size limit (also enforced by the storage bucket)
		if (size > documentStorage.MAX_FILE_SIZE) {
			return NextResponse.json(
				{
					error: `File size exceeds maximum allowed size of 100MB. Your file is ${(size / 1024 / 1024).toFixed(1)}MB`,
				},
				{ status: 413 } // 413 Payload Too Large
			);
		}

		// Generate unique storage key and a signed URL for direct upload
		const storageKey = documentStorage.generateStorageKey(clientId, filename);
		const { signedUrl, token } = await documentStorage.createSignedUploadUrl(storageKey);

		return NextResponse.json({
			success: true,
			storageKey,
			signedUrl,
			token,
			filename,
			size,
			mimeType,
		});
	} catch (error) {
		console.error('File upload error:', error);
		return NextResponse.json(
			{
				error: 'Failed to upload file',
				details: error instanceof Error ? error.message : 'Unknown error',
			},
			{ status: 500 }
		);
	}
}
