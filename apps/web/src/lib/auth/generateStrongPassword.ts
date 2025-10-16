import { randomInt } from 'crypto';

/**
 * Generates a cryptographically secure random password.
 *
 * Character set includes:
 * - Uppercase: A-Z (26 chars)
 * - Lowercase: a-z (26 chars)
 * - Numbers: 0-9 (10 chars)
 * - Symbols: !@#$%^&*()_+-=[]{}|;:,.<>? (27 chars)
 *
 * Note: Includes potentially ambiguous characters (0/O, 1/l/I).
 * Consider excluding these if passwords will be manually typed.
 *
 * @param length - Desired password length (minimum 4)
 * @returns Random password string
 * @throws {Error} If length < 4 or invalid
 */
export function generateStrongPassword(length: number = 16): string {
	// Validate input
	if (!Number.isFinite(length)) {
		throw new Error('Password length must be a finite number');
	}

	if (!Number.isInteger(length)) {
		length = Math.floor(length);
	}

	if (length < 4) {
		throw new Error('Password length must be at least 4 to include all character classes');
	}

	const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
	const lowercase = 'abcdefghijklmnopqrstuvwxyz';
	const numbers = '0123456789';
	const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

	const all = uppercase + lowercase + numbers + symbols;

	// Use cryptographically secure random number generator
	const getRandomChar = (pool: string) => pool[randomInt(0, pool.length)];

	// Ensure each class is represented at least once
	const required = [
		getRandomChar(uppercase),
		getRandomChar(lowercase),
		getRandomChar(numbers),
		getRandomChar(symbols),
	];

	const remaining = Array.from({ length: length - required.length }, () => getRandomChar(all));

	// Use Fisher-Yates shuffle for uniform distribution
	const password = shuffle([...required, ...remaining]).join('');

	return password;
}

/**
 * Fisher-Yates shuffle algorithm for uniform randomization.
 *
 * @param array - Array to shuffle
 * @returns Shuffled copy of the array
 */
function shuffle<T>(array: T[]): T[] {
	const shuffled = [...array];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = randomInt(0, i + 1);
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
}
