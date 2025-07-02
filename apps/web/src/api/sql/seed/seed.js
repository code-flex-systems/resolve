#!/usr/bin/env node

import { createClientAndUser } from './createClientAndUser.js';
import { createChecklistAndClaims } from './createChecklistAndClaims.js';
import { createPagesAndQuestions } from './createPagesAndQuestions.js';
import { createResponses } from './createResponses.js';
import { createResponseAuditLogs } from './createResponseAuditLogs.js';

const numPages = 7;

function main() {
	const statements = [];

	// 1. Create base client + user
	statements.push(...createClientAndUser());

	// 2. Checklist + claims + checklist_claim
	const { statements: claimStatements, checklistId, claimIds } = createChecklistAndClaims();
	statements.push(...claimStatements);

	// 3. Pages, page_instances, questions, answers, and statuses
	const {
		statements: pageStatements,
		pageInstanceIds,
		questionMap,
	} = createPagesAndQuestions(checklistId, claimIds, numPages);
	statements.push(...pageStatements);

	// 4. Responses + question_response_answer
	const { statements: responseStatements, responseIds } = createResponses(checklistId, claimIds, questionMap);
	statements.push(...responseStatements);

	// 5. Audit logs
	// const auditStatements = createResponseAuditLogs(responseIds);
	// statements.push(...auditStatements);

	// 6. Output SQL
	console.log(statements.join('\n'));
}

main();
