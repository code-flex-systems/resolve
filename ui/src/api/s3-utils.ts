import * as axiosRoutes from './axios-routes';
import { v4 as uuidv4 } from 'uuid';
import * as utils from '../utils/utils';

export async function downloadFile(filename: string) {
	try {
		const presignedUrlData = await axiosRoutes.generateS3SignedUrl('getObject', filename);
		if (!presignedUrlData.data) throw new Error('Failed to generate presigned url');
		const downloadResponse = await fetch(presignedUrlData.data, { method: 'GET' });
	} catch (e) {
		console.error(e);
	}
}

export async function uploadFile(file: File) {
	try {
		const filename = `${uuidv4()}${utils.getExtension(file.name)}`;
		const presignedUrlData = await axiosRoutes.generateS3SignedUrl('putObject', filename);
		if (!presignedUrlData.data) throw new Error('Failed to generate presigned url');
		const uploadResponse = await fetch(presignedUrlData.data, {
			method: 'PUT',
			body: file,
			headers: {
				'Content-Type': file.type,
			},
		});
	} catch (e) {
		console.error(e);
	}
}
