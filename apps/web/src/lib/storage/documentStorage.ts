import { getSupabaseAdminClient } from '@/lib/supabase/admin';

/**
 * Document storage backed by Supabase Storage (private bucket).
 *
 * Uploads happen client-side via signed upload URLs (see /api/upload and
 * uploadClient.ts) so file bytes never pass through the Next.js server -
 * required on Vercel, where request bodies are capped at ~4.5MB.
 * Downloads are served via short-lived signed URLs.
 */

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'documents';

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

let bucketEnsured = false;

/**
 * Get the storage API for the documents bucket, creating the bucket on
 * first use (idempotent, mirrors the old container createIfNotExists).
 */
async function getBucket() {
	const supabase = getSupabaseAdminClient();

	if (!bucketEnsured) {
		const { error } = await supabase.storage.createBucket(BUCKET, {
			public: false,
			fileSizeLimit: MAX_FILE_SIZE,
		});
		// 'already exists' errors are expected after first run
		if (error && !/already exists/i.test(error.message)) {
			throw new Error(`Failed to ensure storage bucket "${BUCKET}": ${error.message}`);
		}
		bucketEnsured = true;
	}

	return supabase.storage.from(BUCKET);
}

/**
 * Generate a unique storage key based on client ID and original filename.
 * Format: {clientId}/{timestamp}-{uuid}-{filename}
 *
 * @param clientId - Client UUID
 * @param filename - Original filename
 * @returns Unique storage key
 */
export function generateStorageKey(clientId: string, filename: string): string {
	const timestamp = Date.now();
	const uuid = crypto.randomUUID();
	// Sanitize filename - normalize Unicode and only allow ASCII alphanumeric, dots, and hyphens
	// This prevents issues with special Unicode characters like U+202F (narrow no-break space)
	const normalized = filename.normalize('NFD');
	const sanitized = normalized.replace(/[^\x20-\x7E]/g, '').replace(/[^a-zA-Z0-9.-]/g, '_');
	return `${clientId}/${timestamp}-${uuid}-${sanitized}`;
}

/**
 * Create a signed URL that allows the browser to upload a file directly
 * to storage (valid for ~2 hours).
 *
 * @param storageKey - Unique storage key (use generateStorageKey)
 * @returns Signed upload URL and token
 */
export async function createSignedUploadUrl(
	storageKey: string
): Promise<{ signedUrl: string; token: string }> {
	const bucket = await getBucket();

	const { data, error } = await bucket.createSignedUploadUrl(storageKey);
	if (error || !data) {
		throw new Error(`Failed to create signed upload URL: ${error?.message}`);
	}

	return { signedUrl: data.signedUrl, token: data.token };
}

/**
 * Create a short-lived signed URL for reading a document.
 *
 * @param storageKey - Storage key
 * @param expiresInSeconds - URL lifetime (default: 1 hour)
 * @param downloadName - If set, the URL forces download with this filename
 *                       (otherwise the file is served inline)
 * @returns Temporary signed URL
 */
export async function createSignedDownloadUrl(
	storageKey: string,
	expiresInSeconds: number = 3600,
	downloadName?: string
): Promise<string> {
	const bucket = await getBucket();

	const { data, error } = await bucket.createSignedUrl(storageKey, expiresInSeconds, {
		download: downloadName ?? false,
	});
	if (error || !data) {
		throw new Error(`Failed to create signed download URL: ${error?.message}`);
	}

	return data.signedUrl;
}

/**
 * Upload a document from the server (small server-generated files only -
 * user uploads go directly from the browser via signed upload URLs).
 *
 * @param storageKey - Unique storage key (use generateStorageKey)
 * @param fileBuffer - File content as Buffer
 * @param contentType - MIME type of the file
 * @returns Object containing the storage key
 */
export async function uploadDocument(
	storageKey: string,
	fileBuffer: Buffer,
	contentType: string
): Promise<{ storageKey: string }> {
	const bucket = await getBucket();

	const { error } = await bucket.upload(storageKey, fileBuffer, {
		contentType,
		upsert: false,
	});
	if (error) {
		throw new Error(`Failed to upload document: ${error.message}`);
	}

	return { storageKey };
}

/**
 * Download a document from storage.
 *
 * @param storageKey - Storage key
 * @returns File content as Buffer
 */
export async function downloadDocument(storageKey: string): Promise<Buffer> {
	const bucket = await getBucket();

	const { data, error } = await bucket.download(storageKey);
	if (error || !data) {
		throw new Error(`Failed to download document: ${error?.message}`);
	}

	return Buffer.from(await data.arrayBuffer());
}

/**
 * Delete a document from storage.
 *
 * @param storageKey - Storage key
 * @returns True if deleted
 */
export async function deleteDocument(storageKey: string): Promise<boolean> {
	const bucket = await getBucket();

	const { error } = await bucket.remove([storageKey]);
	return !error;
}
