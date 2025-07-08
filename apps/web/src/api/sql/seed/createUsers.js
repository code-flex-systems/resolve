import { faker } from '@faker-js/faker';
import bcrypt from 'bcrypt';

const clientId = '444be49a-110d-40c3-b09b-e81b1c59a274';
const adminUserId = '045395e4-38b7-4bda-b560-153e1e6e26f3';
const booleans = [true, false, false, false];

export async function createUsers() {
	const statements = [];
	for (let i = 0; i < 100; i++) {
		const email = faker.internet.email({ provider: 'manifest' });
		const password = await bcrypt.hash('password', 10);
		const first = faker.person.firstName().replace("'", '');
		const last = faker.person.lastName().replace("'", '');
		const phone = faker.phone.number({ style: 'national' });
		statements.push(
			`
            insert into users(
                client_id,
                email,
                email_verified,
                password_hash,
                first,
                last,
                phone,
                phone_verified,
                role,
                disabled,
                created_by,
                must_change_password,
                onboarding_email_sent
            )
            values (
                '${clientId}',
                '${email}',
                now(),
                '${password}',
                '${first}',
                '${last}',
                '${phone}',
                now(),
                'Contributor',
                ${booleans[Math.floor(Math.random() * 4)]},
                '${adminUserId}',
                ${booleans[Math.floor(Math.random() * 4)]},
                true
            );`
		);
	}
	return statements;
}
