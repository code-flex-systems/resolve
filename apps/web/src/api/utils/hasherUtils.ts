import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

export async function hashPasswordIfPresent<T extends { password: string }>(
	user: T
): Promise<Omit<T, 'password'> & { password_hash: string }> {
	const { password, ...rest } = user;
	if (!password) throw new Error('Password required');

	const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
	return { ...rest, password_hash };
}

export async function hashAllPasswords<T extends { password: string }>(
	users: T[]
): Promise<(Omit<T, 'password'> & { password_hash: string })[]> {
	return Promise.all(users.map(hashPasswordIfPresent));
}
