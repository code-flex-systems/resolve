import { faker } from '@faker-js/faker';

export const clientId = '444be49a-110d-40c3-b09b-e81b1c59a274';
export const adminUserId = '375c7652-69db-4b16-9c35-d6ae06f7354c';
export const companyName = faker.company.name();

/**
 * Generate SQL to insert a test client and admin user.
 */
export function createClientAndUser() {
	const statements = [];

	// 1. Insert client
	statements.push(`INSERT INTO client (id, name) VALUES ('${clientId}', '${companyName}');`);

	// 2. Insert admin user
	statements.push(
		`INSERT INTO users (id, client_id, email, email_verified, password_hash, first, last, role, disabled, created_at, updated_at)
     VALUES (
       '${adminUserId}',
       '${clientId}',
       'admin@${faker.internet.domainName()}',
       NOW(),
       '$2b$10$QwZkEh2X2Y0fW7Dn9x8EqeJZCGCKE3x6s0D9m4AEI/f0vA6G6bLS2', -- hashed "password"
       '${faker.person.firstName()}',
       '${faker.person.lastName()}',
       'Admin',
       false,
       NOW(),
       NOW()
     );`
	);

	return statements;
}
