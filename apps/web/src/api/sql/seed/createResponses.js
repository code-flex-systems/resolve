import { faker } from '@faker-js/faker';
import { clientId, adminUserId } from './createClientAndUser.js';

const narrativeTemplates = [
	'The insured reported a sudden burst pipe that flooded the basement.',
	'Claimant witnessed a lightning strike combined with heavy rain damage.',
	'Multiple roof tiles were dislodged due to high winds during the storm.',
	'Fire originated in the kitchen; cause under investigation.',
	'Small electrical fire spread to adjacent walls before extinguisher was used.',
	'Water intrusion noted around window frames after heavy rainfall.',
];

/**
 * Generate responses and response-answers for each claim + question.
 */
export function createResponses(checklistId, claimIds, questionMap) {
	const statements = [];
	const responseIds = [];
	let i = 1;

	for (const claimId of claimIds) {
		for (const [instanceId, questions] of Object.entries(questionMap)) {
			for (const { questionId, type, answerIds } of questions) {
				responseIds.push(i);

				// Determine response text (if applicable)
				const responseText =
					type === 'freeform' ? `'${faker.helpers.arrayElement(narrativeTemplates)}'` : 'NULL';

				// Insert question_response
				statements.push(
					`INSERT INTO question_response (
             id, client_id, checklist_id, instance_id, claim_id, question_id, response_text,
             created_by, created_at, updated_at
           ) VALUES (
             ${i}, '${clientId}', ${checklistId}, ${instanceId}, ${claimId},
             ${questionId}, ${responseText}, '${adminUserId}', NOW(), NOW()
           );`
				);

				// Insert question_response_answer(s) if non-freeform
				if (type !== 'freeform') {
					const selectedAnswers =
						type === 'single' || type === 'dropdown'
							? [faker.helpers.arrayElement(answerIds)]
							: faker.helpers.arrayElements(
									answerIds,
									faker.number.int({ min: 1, max: answerIds.length })
								);

					for (const aid of selectedAnswers) {
						statements.push(
							`INSERT INTO question_response_answer (
                 response_id, answer_id, additional_info
               ) VALUES (${i}, ${aid}, NULL);`
						);
					}
				}
				i++;
			}
		}
	}

	return { statements, responseIds };
}
