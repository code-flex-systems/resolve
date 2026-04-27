/**
 * Allowed file types for document uploads.
 * This whitelist provides security by restricting uploads to safe, common document formats.
 */

export const ALLOWED_FILE_TYPES = {
	// Images
	'image/jpeg': ['.jpg', '.jpeg'],
	'image/png': ['.png'],
	'image/gif': ['.gif'],
	'image/webp': ['.webp'],
	'image/bmp': ['.bmp'],
	'image/svg+xml': ['.svg'],

	// Documents
	'application/pdf': ['.pdf'],
	'application/msword': ['.doc'],
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
	'application/vnd.ms-excel': ['.xls'],
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
	'application/vnd.ms-powerpoint': ['.ppt'],
	'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],

	// Text
	'text/plain': ['.txt'],
	'text/csv': ['.csv'],
	'text/html': ['.html', '.htm'],
	'text/markdown': ['.md'],

	// Archives (common for bundling multiple files)
	'application/zip': ['.zip'],
	'application/x-zip-compressed': ['.zip'],
	'application/x-rar-compressed': ['.rar'],
	'application/x-7z-compressed': ['.7z'],

	// Other common formats
	'application/json': ['.json'],
	'application/xml': ['.xml'],
	'text/xml': ['.xml'],
} as const;

/**
 * Get all allowed MIME types as an array
 */
export function getAllowedMimeTypes(): string[] {
	return Object.keys(ALLOWED_FILE_TYPES);
}

/**
 * Get all allowed file extensions as an array
 */
export function getAllowedExtensions(): string[] {
	return Object.values(ALLOWED_FILE_TYPES).flat();
}

/**
 * Check if a MIME type is allowed
 */
export function isAllowedMimeType(mimeType: string): boolean {
	return mimeType in ALLOWED_FILE_TYPES;
}

/**
 * Check if a file extension is allowed
 */
export function isAllowedExtension(extension: string): boolean {
	const lowerExt = extension.toLowerCase();
	return Object.values(ALLOWED_FILE_TYPES).some((extensions) =>
		(extensions as readonly string[]).includes(lowerExt)
	);
}

/**
 * Get the file extension from a filename
 */
export function getFileExtension(filename: string): string {
	const lastDot = filename.lastIndexOf('.');
	return lastDot === -1 ? '' : filename.substring(lastDot).toLowerCase();
}

/**
 * Validate a file based on both MIME type and extension
 */
export function validateFileType(filename: string, mimeType: string): {
	valid: boolean;
	reason?: string;
} {
	// Check MIME type
	if (!isAllowedMimeType(mimeType)) {
		return {
			valid: false,
			reason: `File type "${mimeType}" is not allowed. Please upload a supported file format.`,
		};
	}

	// Check extension
	const extension = getFileExtension(filename);
	if (!extension) {
		return {
			valid: false,
			reason: 'File must have a valid extension.',
		};
	}

	if (!isAllowedExtension(extension)) {
		return {
			valid: false,
			reason: `File extension "${extension}" is not allowed.`,
		};
	}

	// Verify MIME type matches extension
	const expectedExtensions = ALLOWED_FILE_TYPES[mimeType as keyof typeof ALLOWED_FILE_TYPES];
	if (!(expectedExtensions as readonly string[]).includes(extension)) {
		return {
			valid: false,
			reason: `File extension "${extension}" does not match the file type "${mimeType}".`,
		};
	}

	return { valid: true };
}

/**
 * Image-specific MIME types
 */
export const IMAGE_MIME_TYPES = [
	'image/jpeg',
	'image/png',
	'image/gif',
	'image/webp',
	'image/bmp',
	'image/svg+xml',
];

/**
 * Image-specific extensions
 */
export const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
