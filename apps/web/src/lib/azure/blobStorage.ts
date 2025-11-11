import { BlobServiceClient, ContainerClient, BlockBlobClient } from '@azure/storage-blob';

/**
 * Get the Blob Service Client for Azure Storage.
 * Works with both Azurite (local) and Azure Storage (deployed).
 *
 * @returns BlobServiceClient instance
 * @throws Error if AZURE_STORAGE_CONNECTION_STRING is not configured
 */
function getBlobServiceClient(): BlobServiceClient {
	const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

	if (!connectionString) {
		throw new Error('AZURE_STORAGE_CONNECTION_STRING environment variable is not set');
	}

	return BlobServiceClient.fromConnectionString(connectionString);
}

/**
 * Get the container client for document storage.
 * Creates the container if it doesn't exist.
 *
 * @returns ContainerClient instance
 */
async function getContainerClient(): Promise<ContainerClient> {
	const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'documents';
	const blobServiceClient = getBlobServiceClient();
	const containerClient = blobServiceClient.getContainerClient(containerName);

	// Create container if it doesn't exist (idempotent operation)
	// No access parameter means private (no public access)
	await containerClient.createIfNotExists();

	return containerClient;
}

/**
 * Generate a unique blob name based on client ID and original filename.
 * Format: {clientId}/{timestamp}-{uuid}-{filename}
 *
 * @param clientId - Client UUID
 * @param filename - Original filename
 * @returns Unique blob name
 */
export function generateBlobName(clientId: string, filename: string): string {
	const timestamp = Date.now();
	const uuid = crypto.randomUUID();
	// Sanitize filename - normalize Unicode and only allow ASCII alphanumeric, dots, and hyphens
	// This prevents issues with special Unicode characters like U+202F (narrow no-break space)
	const normalized = filename.normalize('NFD');
	const sanitized = normalized.replace(/[^\x20-\x7E]/g, '').replace(/[^a-zA-Z0-9.-]/g, '_');
	return `${clientId}/${timestamp}-${uuid}-${sanitized}`;
}

/**
 * Upload a document to Azure Blob Storage.
 *
 * @param blobName - Unique blob name (use generateBlobName)
 * @param fileBuffer - File content as Buffer
 * @param contentType - MIME type of the file
 * @returns Object containing blob URL and storage key
 */
export async function uploadDocument(
	blobName: string,
	fileBuffer: Buffer,
	contentType: string
): Promise<{ url: string; storageKey: string }> {
	const containerClient = await getContainerClient();
	const blockBlobClient = containerClient.getBlockBlobClient(blobName);

	await blockBlobClient.upload(fileBuffer, fileBuffer.length, {
		blobHTTPHeaders: {
			blobContentType: contentType,
		},
	});

	return {
		url: blockBlobClient.url,
		storageKey: blobName,
	};
}

/**
 * Download a document from Azure Blob Storage.
 *
 * @param storageKey - Blob name/key
 * @returns File content as Buffer
 */
export async function downloadDocument(storageKey: string): Promise<Buffer> {
	const containerClient = await getContainerClient();
	const blockBlobClient = containerClient.getBlockBlobClient(storageKey);

	const downloadResponse = await blockBlobClient.download();

	if (!downloadResponse.readableStreamBody) {
		throw new Error('Failed to download document - no stream body');
	}

	// Convert stream to buffer
	const chunks: Buffer[] = [];
	for await (const chunk of downloadResponse.readableStreamBody) {
		chunks.push(Buffer.from(chunk));
	}

	return Buffer.concat(chunks);
}

/**
 * Delete a document from Azure Blob Storage.
 *
 * @param storageKey - Blob name/key
 * @returns True if deleted, false if not found
 */
export async function deleteDocument(storageKey: string): Promise<boolean> {
	const containerClient = await getContainerClient();
	const blockBlobClient = containerClient.getBlockBlobClient(storageKey);

	const deleteResponse = await blockBlobClient.deleteIfExists();
	return deleteResponse.succeeded;
}

/**
 * Check if a document exists in Azure Blob Storage.
 *
 * @param storageKey - Blob name/key
 * @returns True if exists, false otherwise
 */
export async function documentExists(storageKey: string): Promise<boolean> {
	const containerClient = await getContainerClient();
	const blockBlobClient = containerClient.getBlockBlobClient(storageKey);

	return await blockBlobClient.exists();
}

/**
 * Generate a SAS (Shared Access Signature) URL for temporary access to a document.
 * Useful for generating preview URLs or time-limited download links.
 *
 * @param storageKey - Blob name/key
 * @param _expiresInMinutes - Number of minutes until the URL expires (default: 60) - currently unused
 * @returns Temporary URL with SAS token
 */
export async function generateSasUrl(storageKey: string, _expiresInMinutes: number = 60): Promise<string> {
	const containerClient = await getContainerClient();
	const blockBlobClient = containerClient.getBlockBlobClient(storageKey);

	// For local Azurite, SAS tokens may not work perfectly
	// In that case, just return the blob URL
	if (process.env.AZURE_STORAGE_CONNECTION_STRING?.includes('devstoreaccount1')) {
		return blockBlobClient.url;
	}

	// For production Azure Storage, implement SAS token generation
	// This requires additional configuration with account key or managed identity
	// For now, return the blob URL (will need authentication)
	return blockBlobClient.url;
}

/**
 * Get metadata about a blob without downloading its content.
 *
 * @param storageKey - Blob name/key
 * @returns Blob properties including size, content type, etc.
 */
export async function getBlobMetadata(storageKey: string) {
	const containerClient = await getContainerClient();
	const blockBlobClient = containerClient.getBlockBlobClient(storageKey);

	const properties = await blockBlobClient.getProperties();

	return {
		contentLength: properties.contentLength,
		contentType: properties.contentType,
		lastModified: properties.lastModified,
		etag: properties.etag,
	};
}
