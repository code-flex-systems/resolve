import { faker } from '@faker-js/faker';
import { clientId, adminUserId } from './createClientAndUser.js';

/**
 * Generate fake response audit logs for each question_response.
 * @param {string[]} responseIds
 */
export function createResponseAuditLogs(responseIds) {
	const statements = [];
	let i = 1;
	for (const responseId of responseIds) {
		const numLogs = faker.number.int({ min: 1, max: 3 });

		for (let i = 0; i < numLogs; i++) {
			const reason = faker.helpers.arrayElement([
				'Initial response entered',
				'Updated after claim review',
				'Corrected data entry error',
			]);

			const snapshot = {
				text: faker.lorem.sentence(),
				updated_by: adminUserId,
				simulated_values: faker.helpers.arrayElements(['Option A', 'Option B', 'Option C'], 2),
			};

			statements.push(
				`INSERT INTO response_audit_logs (
           id, client_id, response_id, change_reason, snapshot_json,
           created_by, created_at
         ) VALUES (
           ${i}, '${clientId}', '${responseId}', '${reason}', '${JSON.stringify(snapshot).replace(/'/g, "''")}',
           '${adminUserId}', NOW()
         );`
			);
		}
		i++;
	}

	return statements;
}
