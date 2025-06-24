import { randomBytes } from 'crypto';

export function generateToken(length = 48): string {
	return randomBytes(length).toString('hex'); // 96-character hex string
}
