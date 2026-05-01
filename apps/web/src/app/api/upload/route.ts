export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getClerkSession } from '@/lib/auth/clerk-session';
import * as blobStorage from '@/lib/azure/blobStorage';
import {
	validateFileType,
	getAllowedExtensions,
	getAllowedMimeTypes,
} from '@/config/allowedFileTypes';

/**
 * POST /api/upload
 *
 * Uploads a file to Azure Blob Storage and returns the storage key.
 * Requires authentication.
 */
export async function POST(request: NextRequest) {
	try {
		// Check authentication
		const session = await getClerkSession();
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

		// Parse the multipart form data
		const formData = await request.formData();
		const file = formData.get('file') as File;

		if (!file) {
			return NextResponse.json({ error: 'No file provided' }, { status: 400 });
		}

		// Get optional allowed extensions from query params (comma-separated)
		const url = new URL(request.url);
		const allowedExtensionsParam = url.searchParams.get('allowedExtensions');
		const allowedExtensions = allowedExtensionsParam
			? allowedExtensionsParam.split(',').map((ext) => ext.trim().toLowerCase())
			: null;

		// Validate file type (SECURITY: whitelist approach)
		const fileValidation = validateFileType(file.name, file.type);
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
			const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
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

		// Enforce file size limit (100MB)
		const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB in bytes
		if (file.size > MAX_FILE_SIZE) {
			return NextResponse.json(
				{
					error: `File size exceeds maximum allowed size of 100MB. Your file is ${(file.size / 1024 / 1024).toFixed(1)}MB`,
				},
				{ status: 413 } // 413 Payload Too Large
			);
		}

		// Convert File to Buffer
		const bytes = await file.arrayBuffer();
		const buffer = Buffer.from(bytes);

		// Generate unique blob name
		const blobName = blobStorage.generateBlobName(clientId, file.name);

		// Upload to Azure Blob Storage
		const { storageKey } = await blobStorage.uploadDocument(
			blobName,
			buffer,
			file.type || 'application/octet-stream'
		);

		return NextResponse.json({
			success: true,
			storageKey,
			filename: file.name,
			size: file.size,
			mimeType: file.type,
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
