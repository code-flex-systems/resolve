#!/usr/bin/env node

/**
 * Seed script for the insurance-claims checklist schema.
 * Usage: node seed.js <numPages>
 * Output: SQL INSERT statements written to stdout.
 */
import { faker } from '@faker-js/faker';

// Utility to escape single quotes in SQL strings
const esc = (s) => s.replace(/'/g, "''");

// 1) Input parameters
const numPages = parseInt(process.argv[2], 10) || 10;
const numClaims = 10000;
const checklistId = 1;

// 2) Domain-specific pools
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

const narrativeTemplates = [
	'The insured reported a sudden burst pipe that flooded the basement.',
	'Claimant witnessed a lightning strike combined with heavy rain damage.',
	'Multiple roof tiles were dislodged due to high winds during the storm.',
	'Fire originated in the kitchen; cause under investigation.',
	'Small electrical fire spread to adjacent walls before extinguisher was used.',
	'Water intrusion noted around window frames after heavy rainfall.',
];

// Containers
let statements = [];
let questionId = 1;
let answerId = 1;
let respId = 1;
let respAnsId = 1;

// 3) One checklist
// statements.push(
// 	`INSERT INTO checklist (id,name,created_by) VALUES (${checklistId}, '${esc(
// 		faker.company.catchPhrase()
// 	)}', 'Owen Farthing');`
// );
function randomDate(start, end) {
	const ts = randomInt(start.getTime(), end.getTime());
	return new Date(ts);
}
// 4) Fifty claims
for (let i = 1; i <= numClaims; i++) {
	const claimNumber = esc(faker.string.alphanumeric(10).toUpperCase());
	const client = esc(faker.person.fullName());
	const adjuster = esc(faker.person.fullName());
	const insured = esc(faker.person.fullName());
	const claimAmount = faker.number.float({ min: 1000, max: 50000, precision: 0.01 });
	const totalIncurred = faker.number.float({ min: claimAmount, max: 100000, precision: 0.01 });
	const dateOfLoss = faker.date.past({ years: 2 }).toISOString().slice(0, 10);
	const lossLocation = esc(`${faker.location.city()}, ${faker.location.state()}`);
	const updater = esc(faker.person.fullName());
	const lastUpdate = faker.date.recent({ days: 30 }).toISOString().slice(0, 10);
	const expectedRec = faker.number.float({ min: 500, max: totalIncurred, precision: 0.01 });
	const createdDate = faker.date.past({ years: 2 }).toISOString().slice(0, 10);
	const users = ['82c1aaec-ef0d-4b95-9234-e1ad31e0d3ce', '215814cd-aa6a-43f3-9985-ce554f3b6889'];
	const randomUser = users[Math.round(Math.random())];

	statements.push(
		`INSERT INTO claim (id,client_id,feed_id,claim_number,client,client_adjuster,insured,claim_amount,total_incurred,date_of_loss,loss_location,last_updated_by,last_update,expected_recovery,created_by,created_at) ` +
			`VALUES (${i},'1c118f90-3153-4dfb-b350-953e42f0d1aa',2,'${claimNumber}','${client}','${adjuster}','${insured}',${claimAmount},${totalIncurred},'${dateOfLoss}','${lossLocation}','${updater}','${lastUpdate}',${expectedRec},'${randomUser}','${createdDate}');`
	);
}

// 5) Pages & Instances, Questions & Answers
const questionsByPage = {};
// for (let p = 1; p <= numPages; p++) {
// 	// Page & instance
// 	statements.push(
// 		`INSERT INTO page (id,title,hidden) VALUES (${p},'${esc(faker.helpers.arrayElement(pageTitles))}',false);`
// 	);
// 	statements.push(
// 		`INSERT INTO page_instance (id,page_id,checklist_id,parent_instance_id,position) VALUES (${p},${p},${checklistId},NULL,${p});`
// 	);

// 	// Questions
// 	const numQ = faker.number.int({ min: 5, max: 20 });
// 	questionsByPage[p] = [];

// 	for (let qi = 0; qi < numQ; qi++) {
// 		const qid = questionId++;
// 		const type = faker.helpers.arrayElement(Object.keys(questionTemplates));
// 		const text = faker.helpers.arrayElement(questionTemplates[type]);

// 		statements.push(
// 			`INSERT INTO question (id,page_id,text,position,type,description_text,description_image_url,placeholder,hidden) ` +
// 				`VALUES (${qid},${p},'${esc(text)}',${qi + 1},'${type}',NULL,NULL,NULL,false);`
// 		);

// 		// Answers for this question
// 		const opts = optionsMap[text] || ['Option A', 'Option B'];
// 		let numA;
// 		if (type === 'freeform') numA = 1;
// 		else if (type === 'multi') numA = faker.number.int({ min: 2, max: Math.min(6, opts.length) });
// 		else numA = opts.length;

// 		const chosen = faker.helpers.arrayElements(opts, numA);
// 		const aids = [];

// 		chosen.forEach((opt, ai) => {
// 			const aid = answerId++;
// 			const callsInst = p; // match this page instance
// 			statements.push(
// 				`INSERT INTO answer (id,question_id,text,position,grade,description_text,description_image_url,has_additional_info,additional_info_placeholder,additional_info_num_lines,calls_instance_id,hidden) ` +
// 					`VALUES (${aid},${qid},'${esc(opt)}',${ai + 1},${faker.number.float({
// 						min: 0,
// 						max: 100,
// 						precision: 0.01,
// 					})},NULL,NULL,false,NULL,NULL,${callsInst},false);`
// 			);
// 			aids.push(aid);
// 		});

// 		questionsByPage[p].push({ qid, type, aids });
// 	}
// }

// // 6) Responses & question_response_answer
// for (let cid = 1; cid <= numClaims; cid++) {
// 	for (let pi = 1; pi <= numPages; pi++) {
// 		for (const { qid, type, aids } of questionsByPage[pi]) {
// 			let respText = 'NULL';
// 			if (type === 'freeform') {
// 				respText = `'${esc(faker.helpers.arrayElement(narrativeTemplates))}'`;
// 			}

// 			statements.push(
// 				`INSERT INTO question_response (id,checklist_id,instance_id,claim_id,question_id,response_text) ` +
// 					`VALUES (${respId},${checklistId},${pi},${cid},${qid},${respText});`
// 			);

// 			if (type !== 'freeform') {
// 				let selected;
// 				if (type === 'single' || type === 'dropdown') {
// 					selected = [faker.helpers.arrayElement(aids)];
// 				} else {
// 					selected = faker.helpers.arrayElements(aids, faker.number.int({ min: 1, max: aids.length }));
// 				}
// 				selected.forEach((aid) => {
// 					statements.push(
// 						`INSERT INTO question_response_answer (id,response_id,answer_id,additional_info) ` +
// 							`VALUES (${respAnsId++},${respId},${aid},NULL);`
// 					);
// 				});
// 			}
// 			respId++;
// 		}
// 	}
// }

// 7) Output SQL
console.log(statements.join('\n'));
