'use client';

/**
 * Client-side upload helper.
 *
 * Asks the server (/api/upload) to validate the file metadata and issue a
 * signed upload URL, then PUTs the file directly to Supabase Storage.
 * File bytes never pass through the Next.js server, which keeps uploads
 * within Vercel's request body limits.
 */
export async function uploadFileToStorage(
	file: File,
	opts?: { allowedExtensions?: string[] }
): Promise<{ storageKey: string }> {
	// Step 1: validate + get a signed upload URL from the server
	const response = await fetch('/api/upload', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({
			filename: file.name,
			mimeType: file.type || 'application/octet-stream',
			size: file.size,
			allowedExtensions: opts?.allowedExtensions,
		}),
	});

	if (!response.ok) {
		const error = await response.json().catch(() => null);
		throw new Error(error?.error || 'Upload failed');
	}

	const { signedUrl, storageKey } = await response.json();

	// Step 2: upload the file directly to storage
	const uploadResponse = await fetch(signedUrl, {
		method: 'PUT',
		headers: {
			'content-type': file.type || 'application/octet-stream',
			'x-upsert': 'false',
		},
		body: file,
	});

	if (!uploadResponse.ok) {
		throw new Error(`File upload to storage failed (${uploadResponse.status})`);
	}

	return { storageKey };
}
