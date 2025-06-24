export function generateStrongPassword(length = 16): string {
	const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
	const lowercase = 'abcdefghijklmnopqrstuvwxyz';
	const numbers = '0123456789';
	const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

	const all = uppercase + lowercase + numbers + symbols;

	const getRandomChar = (pool: string) => pool[Math.floor(Math.random() * pool.length)];

	// Ensure each class is represented at least once
	const required = [
		getRandomChar(uppercase),
		getRandomChar(lowercase),
		getRandomChar(numbers),
		getRandomChar(symbols),
	];

	const remaining = Array.from({ length: length - required.length }, () => getRandomChar(all));

	// Shuffle to avoid predictable prefix
	const password = [...required, ...remaining].sort(() => Math.random() - 0.5).join('');

	return password;
}
