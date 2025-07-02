import { faker } from '@faker-js/faker';
import { clientId, adminUserId, companyName } from './createClientAndUser.js';

const numClaims = 50;
const checklistId = 1; // use a UUID instead of an integer ID
const feedId = 1;

export function createChecklistAndClaims() {
	const statements = [];
	const claimIds = [];

	// 1. Insert checklist
	statements.push(
		`INSERT INTO checklist (id, client_id, name, created_by, created_at, updated_at)
     VALUES (
        ${checklistId},
       '${clientId}',
       '${faker.company.catchPhrase()}',
       '${adminUserId}',
       NOW(),
       NOW()
     );`
	);

	statements.push(
		`INSERT INTO feeds (
            id, client_id, name, schedule, feed_type, connection_options, status,
            last_synced_at, created_by, created_at, updated_by, updated_at
        )
        VALUES (
            ${feedId},
            '${clientId}',
            '${companyName}',
            7,
            'database',
            '{}',
            'Online',
            NOW(),
            '${adminUserId}',
            NOW(),
            '${adminUserId}',
            NOW()
        );`
	);

	// 2. Insert claims
	for (let i = 0; i < numClaims; i++) {
		const claimId = i + 1;
		claimIds.push(claimId);

		const claim = {
			id: claimId,
			claim_number: faker.string.alphanumeric(10).toUpperCase(),
			client: faker.company.name(),
			client_adjuster: faker.person.fullName(),
			insured: faker.person.fullName(),
			claim_amount: faker.number.float({ min: 1000, max: 50000, precision: 0.01 }),
			total_incurred: faker.number.float({ min: 6000, max: 100000, precision: 0.01 }),
			date_of_loss: faker.date.past({ years: 2 }).toISOString().slice(0, 10),
			loss_location: `${faker.location.city()}, ${faker.location.state()}`,
			last_updated_by: faker.person.fullName(),
			last_update: faker.date.recent({ days: 30 }).toISOString().slice(0, 10),
			expected_recovery: faker.number.float({ min: 500, max: 100000, precision: 0.01 }),
		};

		// Insert claim
		statements.push(
			`INSERT INTO claim (
        id, client_id, feed_id, created_by, created_at,
        claim_number, client, client_adjuster, insured,
        claim_amount, total_incurred, date_of_loss, loss_location,
        last_updated_by, last_update, expected_recovery
      ) VALUES (
        ${claim.id}, '${clientId}', ${feedId}, '${adminUserId}', NOW(),
        '${claim.claim_number}', '${claim.client}', '${claim.client_adjuster}', '${claim.insured}',
        ${claim.claim_amount}, ${claim.total_incurred}, '${claim.date_of_loss}', '${claim.loss_location}',
        '${claim.last_updated_by}', '${claim.last_update}', ${claim.expected_recovery}
      );`
		);

		// Link to checklist
		statements.push(
			`INSERT INTO checklist_claim (checklist_id, claim_id, client_id, created_by)
       VALUES (${checklistId}, ${claim.id}, '${clientId}', '${adminUserId}');`
		);
	}

	return { statements, checklistId, claimIds };
}
