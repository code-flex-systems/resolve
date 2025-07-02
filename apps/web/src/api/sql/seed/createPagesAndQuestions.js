import { faker } from '@faker-js/faker';
import { clientId, adminUserId } from './createClientAndUser.js';

const pageTitles = [
	'Policy Information',
	'Claimant Details',
	'Incident Description',
	'Damage Assessment',
	'Repair Estimates',
	'Witness Statements',
	'Supporting Documents',
];

const questionTemplates = {
	freeform: [
		'Please describe the sequence of events:',
		'Provide any additional comments:',
		'Explain the nature of the damage:',
	],
	single: [
		'Was the claim water-related?',
		'Is there any third-party liability?',
		'Has an estimate been received?',
		'Was the policy active at time of loss?',
	],
	dropdown: ['Select cause of loss:', 'Choose property type:', 'Select claim status:'],
	multi: [
		'Select all damages that apply:',
		'Which areas of the property were affected?',
		'Choose all relevant policy endorsements:',
	],
};

const optionsMap = {
	'Was the claim water-related?': ['Yes', 'No', 'Unknown'],
	'Is there any third-party liability?': ['Yes', 'No'],
	'Has an estimate been received?': ['Yes', 'No'],
	'Was the policy active at time of loss?': ['Yes', 'No'],
	'Select cause of loss:': ['Fire', 'Water', 'Wind', 'Theft', 'Vandalism', 'Other'],
	'Choose property type:': ['Residential', 'Commercial', 'Industrial', 'Agricultural'],
	'Select claim status:': ['Open', 'Closed', 'Under Investigation', 'Reopened'],
	'Select all damages that apply:': [
		'Roof damage',
		'Basement flooding',
		'Fire damage',
		'Structural cracks',
		'Mold growth',
		'Electrical issues',
	],
	'Which areas of the property were affected?': [
		'Kitchen',
		'Living room',
		'Bedroom',
		'Bathroom',
		'Garage',
		'Exterior walls',
	],
	'Choose all relevant policy endorsements:': [
		'Flood coverage',
		'Hail coverage',
		'Windstorm coverage',
		'Earthquake endorsement',
		'Theft endorsement',
	],
};

let startingPageId = 0;
let startingInstanceId = 0;
let startingQuestionId = 0;
let startingAnswerId = 0;

export function createPagesAndQuestions(checklistId, claimIds) {
	const statements = [];
	const questionMap = {};
	const pageInstanceIds = [];

	const maxDepth = 3;
	const branching = 2;

	const allPages = [];
	const pageQueue = [];

	// Create the root
	const rootPageId = ++startingPageId;
	const rootInstanceId = ++startingInstanceId;
	allPages.push({
		pageId: rootPageId,
		instanceId: rootInstanceId,
		parentPageId: null,
		referencesPageId: null,
		depth: 1,
	});
	pageQueue.push({ pageId: rootPageId, instanceId: rootInstanceId, depth: 1 });

	let pageCounter = 1;

	// BFS-style tree creation
	while (pageQueue.length) {
		const { pageId: parentId, instanceId: parentInstanceId, depth } = pageQueue.shift();
		if (depth >= maxDepth) continue;

		for (let i = 0; i < branching; i++) {
			const pageId = ++startingPageId;
			const instanceId = ++startingInstanceId;

			allPages.push({
				pageId,
				instanceId,
				parentPageId: instanceId,
				referencesPageId: instanceId,
				depth: depth + 1,
			});

			pageQueue.push({ pageId, instanceId, depth: depth + 1 });
		}
	}

	// Create pages and questions
	for (const { pageId, instanceId, parentPageId, referencesPageId, depth } of allPages) {
		const title = faker.helpers.arrayElement(pageTitles);
		const position = pageCounter++;

		// Page
		statements.push(
			`INSERT INTO page (id, client_id, title, hidden, created_by, created_at, updated_at)
       VALUES (${pageId}, '${clientId}', '${title}', false, '${adminUserId}', NOW(), NOW());`
		);

		// Page instance
		statements.push(
			`INSERT INTO page_instance (
         id, client_id, checklist_id, page_id, parent_instance_id,
         position, created_by, created_at
       ) VALUES (
         ${instanceId}, '${clientId}', ${checklistId}, ${pageId},
         ${parentPageId ?? 'NULL'},
         ${position}, '${adminUserId}', NOW()
       );`
		);

		pageInstanceIds.push(instanceId);
		questionMap[instanceId] = [];

		// Questions
		const numQuestions = faker.number.int({ min: 5, max: 10 });

		for (let q = 0; q < numQuestions; q++) {
			const type = faker.helpers.arrayElement(Object.keys(questionTemplates));
			const text = faker.helpers.arrayElement(questionTemplates[type]);
			const questionId = ++startingQuestionId;

			statements.push(
				`INSERT INTO question (
           id, client_id, page_id, text, type, position, hidden,
           created_by, created_at, updated_at
         ) VALUES (
           ${questionId}, '${clientId}', ${pageId}, '${text}', '${type}', ${q + 1}, false,
           '${adminUserId}', NOW(), NOW()
         );`
			);

			const options = optionsMap[text] || ['Option A', 'Option B'];
			const answerIds = [];

			const answersToInsert =
				type === 'freeform'
					? ['']
					: type === 'multi'
						? faker.helpers.arrayElements(
								options,
								faker.number.int({ min: 2, max: Math.min(5, options.length) })
							)
						: options;

			answersToInsert.forEach((text, i) => {
				const answerId = ++startingAnswerId;
				answerIds.push(answerId);
				statements.push(
					`INSERT INTO answer (
             id, client_id, question_id, calls_instance_id, text, position, grade, hidden,
             created_by, created_at, updated_at
           ) VALUES (
             ${answerId}, '${clientId}', ${questionId}, ${referencesPageId}, '${text}', ${i + 1}, ${faker.number.float({ min: 0, max: 100, precision: 0.01 })}, false,
             '${adminUserId}', NOW(), NOW()
           );`
				);
			});

			questionMap[instanceId].push({ questionId, type, answerIds });
		}
	}

	return { statements, pageInstanceIds, questionMap };
}
