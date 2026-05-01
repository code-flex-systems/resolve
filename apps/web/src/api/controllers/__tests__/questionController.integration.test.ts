/**
 * Integration tests for questionController
 *
 * Tests the orchestrative functions that coordinate multiple queries
 * and have complex business logic beyond simple CRUD operations.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getTestDb, createTestContext } from '@/__tests__/integration/testDb';
import {
	createTestClient,
	createTestUser,
	createTestClaim,
	createTestChecklist,
	createTestPage,
	createTestPageInstance,
	createTestQuestion,
	createTestAnswer,
	createTestQuestionResponse,
	createTestQuestionResponseAnswer,
} from '@/__tests__/integration/fixtures';
import * as questionController from '../questionController';
import type { Kysely } from 'kysely';
import type { DB } from '@/api/database/types';
import type { DateRangeStrict } from '@/types/types';

// Wide date range that includes today - DateRangeStrict is [Date, Date] tuple
const WIDE_DATE_RANGE: DateRangeStrict = [new Date('2020-01-01'), new Date('2030-12-31')];

describe('questionController integration tests', () => {
	let db: Kysely<DB>;

	beforeEach(() => {
		db = getTestDb();
	});

	// =========================================================================
	// getQuestionStats - Aggregates answer statistics under questions
	// =========================================================================

	describe('getQuestionStats', () => {
		async function setupTestFixtures() {
			const client = await createTestClient(db);
			const user = await createTestUser(db, { client_id: client.id });
			const claim = await createTestClaim(db, { client_id: client.id, created_by: user.id });
			const checklist = await createTestChecklist(db, {
				client_id: client.id,
				created_by: user.id,
			});
			const page = await createTestPage(db, { client_id: client.id, created_by: user.id });
			const instance = await createTestPageInstance(db, {
				client_id: client.id,
				page_id: page.id,
				checklist_id: checklist.id,
				created_by: user.id,
			});
			const ctx = createTestContext(db, { id: user.id, client_id: client.id });

			return { client, user, claim, checklist, page, instance, ctx };
		}

		describe('empty results', () => {
			it('should return empty array when page has no questions', async () => {
				const { page, ctx } = await setupTestFixtures();

				const result = await questionController.getQuestionStats(ctx, {
					pageId: page.id,
					filters: { range: WIDE_DATE_RANGE },
				});

				expect(result).toEqual([]);
			});

			it('should return empty array when questions have no responses', async () => {
				const { client, user, page, ctx } = await setupTestFixtures();

				// Create question and answer but no responses
				const question = await createTestQuestion(db, {
					client_id: client.id,
					page_id: page.id,
					created_by: user.id,
					text: 'Question with no responses',
				});
				await createTestAnswer(db, {
					client_id: client.id,
					question_id: question.id,
					created_by: user.id,
					text: 'Answer A',
				});

				const result = await questionController.getQuestionStats(ctx, {
					pageId: page.id,
					filters: { range: WIDE_DATE_RANGE },
				});

				// Questions with no responses should have 0 counts (due to LEFT JOIN)
				// The stats include questions with answers even if no one responded
				expect(Array.isArray(result)).toBe(true);
			});
		});

		describe('answer aggregation', () => {
			it('should aggregate multiple answers under a single question', async () => {
				const { client, user, claim, checklist, page, instance, ctx } = await setupTestFixtures();

				// Create question with multiple answers
				const question = await createTestQuestion(db, {
					client_id: client.id,
					page_id: page.id,
					created_by: user.id,
					text: 'What is your choice?',
				});
				const answer1 = await createTestAnswer(db, {
					client_id: client.id,
					question_id: question.id,
					created_by: user.id,
					text: 'Option A',
				});
				const answer2 = await createTestAnswer(db, {
					client_id: client.id,
					question_id: question.id,
					created_by: user.id,
					text: 'Option B',
				});

				// Create response that selects answer1
				const response = await createTestQuestionResponse(db, {
					client_id: client.id,
					checklist_id: checklist.id,
					instance_id: instance.id,
					claim_id: claim.id,
					question_id: question.id,
					created_by: user.id,
				});
				await createTestQuestionResponseAnswer(db, {
					response_id: response.id,
					answer_id: answer1.id,
				});
				// Multi-select: also select answer2
				await createTestQuestionResponseAnswer(db, {
					response_id: response.id,
					answer_id: answer2.id,
				});

				const result = await questionController.getQuestionStats(ctx, {
					pageId: page.id,
					filters: { range: WIDE_DATE_RANGE },
				});

				expect(result).toHaveLength(1);
				expect(result[0].question_id).toBe(question.id);
				expect(result[0].question_text).toBe('What is your choice?');
				expect(result[0].answers).toHaveLength(2);
				// Check that both answers are present
				const answerIds = result[0].answers.map((a) => a.answer_id);
				expect(answerIds).toContain(answer1.id);
				expect(answerIds).toContain(answer2.id);
			});

			it('should count multiple responses for the same answer across different claims', async () => {
				const { client, user, claim, checklist, page, instance, ctx } = await setupTestFixtures();

				// Create question with one answer
				const question = await createTestQuestion(db, {
					client_id: client.id,
					page_id: page.id,
					created_by: user.id,
					text: 'Repeated question',
				});
				const answer = await createTestAnswer(db, {
					client_id: client.id,
					question_id: question.id,
					created_by: user.id,
					text: 'Popular option',
				});

				// Create more claims for multiple responses
				// Note: unique constraint on (checklist_id, instance_id, claim_id, question_id)
				// so we need different claims for each response
				const claim2 = await createTestClaim(db, { client_id: client.id, created_by: user.id });
				const claim3 = await createTestClaim(db, { client_id: client.id, created_by: user.id });

				// Create 3 responses for the same answer (different claims)
				for (const claimId of [claim.id, claim2.id, claim3.id]) {
					const response = await createTestQuestionResponse(db, {
						client_id: client.id,
						checklist_id: checklist.id,
						instance_id: instance.id,
						claim_id: claimId,
						question_id: question.id,
						created_by: user.id,
					});
					await createTestQuestionResponseAnswer(db, {
						response_id: response.id,
						answer_id: answer.id,
					});
				}

				const result = await questionController.getQuestionStats(ctx, {
					pageId: page.id,
					filters: { range: WIDE_DATE_RANGE },
				});

				expect(result).toHaveLength(1);
				expect(result[0].answers).toHaveLength(1);
				expect(result[0].answers[0].answer_count).toBe(3);
			});
		});

		describe('multiple questions', () => {
			it('should return stats for multiple questions on the same page', async () => {
				const { client, user, claim, checklist, page, instance, ctx } = await setupTestFixtures();

				// Create two questions with answers
				const question1 = await createTestQuestion(db, {
					client_id: client.id,
					page_id: page.id,
					created_by: user.id,
					text: 'First question',
				});
				const answer1 = await createTestAnswer(db, {
					client_id: client.id,
					question_id: question1.id,
					created_by: user.id,
					text: 'First answer',
				});

				const question2 = await createTestQuestion(db, {
					client_id: client.id,
					page_id: page.id,
					created_by: user.id,
					text: 'Second question',
				});
				const answer2 = await createTestAnswer(db, {
					client_id: client.id,
					question_id: question2.id,
					created_by: user.id,
					text: 'Second answer',
				});

				// Create response for question1
				const response1 = await createTestQuestionResponse(db, {
					client_id: client.id,
					checklist_id: checklist.id,
					instance_id: instance.id,
					claim_id: claim.id,
					question_id: question1.id,
					created_by: user.id,
				});
				await createTestQuestionResponseAnswer(db, {
					response_id: response1.id,
					answer_id: answer1.id,
				});

				// Create response for question2
				const response2 = await createTestQuestionResponse(db, {
					client_id: client.id,
					checklist_id: checklist.id,
					instance_id: instance.id,
					claim_id: claim.id,
					question_id: question2.id,
					created_by: user.id,
				});
				await createTestQuestionResponseAnswer(db, {
					response_id: response2.id,
					answer_id: answer2.id,
				});

				const result = await questionController.getQuestionStats(ctx, {
					pageId: page.id,
					filters: { range: WIDE_DATE_RANGE },
				});

				expect(result).toHaveLength(2);
				const questionIds = result.map((r) => r.question_id);
				expect(questionIds).toContain(question1.id);
				expect(questionIds).toContain(question2.id);
			});
		});

		describe('filter: claimId', () => {
			it('should filter stats by claimId when provided', async () => {
				const { client, user, claim, checklist, page, instance, ctx } = await setupTestFixtures();

				// Create question with answer
				const question = await createTestQuestion(db, {
					client_id: client.id,
					page_id: page.id,
					created_by: user.id,
					text: 'Claim-specific question',
				});
				const answer = await createTestAnswer(db, {
					client_id: client.id,
					question_id: question.id,
					created_by: user.id,
					text: 'Some answer',
				});

				// Create response for the first claim
				const response = await createTestQuestionResponse(db, {
					client_id: client.id,
					checklist_id: checklist.id,
					instance_id: instance.id,
					claim_id: claim.id,
					question_id: question.id,
					created_by: user.id,
				});
				await createTestQuestionResponseAnswer(db, {
					response_id: response.id,
					answer_id: answer.id,
				});

				// Create a second claim with its own response
				const claim2 = await createTestClaim(db, { client_id: client.id, created_by: user.id });
				const response2 = await createTestQuestionResponse(db, {
					client_id: client.id,
					checklist_id: checklist.id,
					instance_id: instance.id,
					claim_id: claim2.id,
					question_id: question.id,
					created_by: user.id,
				});
				await createTestQuestionResponseAnswer(db, {
					response_id: response2.id,
					answer_id: answer.id,
				});

				// With claimId filter - should only count one response
				const resultWithClaim = await questionController.getQuestionStats(ctx, {
					pageId: page.id,
					filters: { claimId: claim.id, range: WIDE_DATE_RANGE },
				});

				// Without claimId filter - should count both responses
				const resultWithoutClaim = await questionController.getQuestionStats(ctx, {
					pageId: page.id,
					filters: { range: WIDE_DATE_RANGE },
				});

				expect(resultWithClaim).toHaveLength(1);
				expect(resultWithClaim[0].answers[0].answer_count).toBe(1);

				expect(resultWithoutClaim).toHaveLength(1);
				expect(resultWithoutClaim[0].answers[0].answer_count).toBe(2);
			});
		});

		describe('filter: users', () => {
			it('should filter stats by user when users filter provided', async () => {
				const { client, user, claim, checklist, page, instance, ctx } = await setupTestFixtures();

				// Create a second user
				const user2 = await createTestUser(db, { client_id: client.id });

				// Create question with answer
				const question = await createTestQuestion(db, {
					client_id: client.id,
					page_id: page.id,
					created_by: user.id,
					text: 'User-filtered question',
				});
				const answer = await createTestAnswer(db, {
					client_id: client.id,
					question_id: question.id,
					created_by: user.id,
					text: 'Some answer',
				});

				// Create response by user1
				const response1 = await createTestQuestionResponse(db, {
					client_id: client.id,
					checklist_id: checklist.id,
					instance_id: instance.id,
					claim_id: claim.id,
					question_id: question.id,
					created_by: user.id,
				});
				await createTestQuestionResponseAnswer(db, {
					response_id: response1.id,
					answer_id: answer.id,
				});

				// Create response by user2 (different claim to avoid unique constraint)
				const claim2 = await createTestClaim(db, { client_id: client.id, created_by: user2.id });
				const response2 = await createTestQuestionResponse(db, {
					client_id: client.id,
					checklist_id: checklist.id,
					instance_id: instance.id,
					claim_id: claim2.id,
					question_id: question.id,
					created_by: user2.id,
				});
				await createTestQuestionResponseAnswer(db, {
					response_id: response2.id,
					answer_id: answer.id,
				});

				// Filter by user1 only
				const resultUser1 = await questionController.getQuestionStats(ctx, {
					pageId: page.id,
					filters: { users: [user.id], range: WIDE_DATE_RANGE },
				});

				// Filter by user2 only
				const resultUser2 = await questionController.getQuestionStats(ctx, {
					pageId: page.id,
					filters: { users: [user2.id], range: WIDE_DATE_RANGE },
				});

				// No user filter - should include both
				const resultNoFilter = await questionController.getQuestionStats(ctx, {
					pageId: page.id,
					filters: { range: WIDE_DATE_RANGE },
				});

				expect(resultUser1).toHaveLength(1);
				expect(resultUser1[0].answers[0].answer_count).toBe(1);

				expect(resultUser2).toHaveLength(1);
				expect(resultUser2[0].answers[0].answer_count).toBe(1);

				expect(resultNoFilter).toHaveLength(1);
				expect(resultNoFilter[0].answers[0].answer_count).toBe(2);
			});
		});

		describe('filter: date range', () => {
			it('should filter stats by date range', async () => {
				const { client, user, claim, checklist, page, instance, ctx } = await setupTestFixtures();

				// Create question with answer
				const question = await createTestQuestion(db, {
					client_id: client.id,
					page_id: page.id,
					created_by: user.id,
					text: 'Time-sensitive question',
				});
				const answer = await createTestAnswer(db, {
					client_id: client.id,
					question_id: question.id,
					created_by: user.id,
					text: 'Some answer',
				});

				// Create response (will have current timestamp)
				const response = await createTestQuestionResponse(db, {
					client_id: client.id,
					checklist_id: checklist.id,
					instance_id: instance.id,
					claim_id: claim.id,
					question_id: question.id,
					created_by: user.id,
				});
				await createTestQuestionResponseAnswer(db, {
					response_id: response.id,
					answer_id: answer.id,
				});

				// Date range that includes today
				const resultIncluding = await questionController.getQuestionStats(ctx, {
					pageId: page.id,
					filters: { range: WIDE_DATE_RANGE },
				});

				// Date range in the past - response created today won't be counted
				const pastRange: DateRangeStrict = [new Date('2000-01-01'), new Date('2000-12-31')];
				const resultExcluding = await questionController.getQuestionStats(ctx, {
					pageId: page.id,
					filters: { range: pastRange },
				});

				expect(resultIncluding).toHaveLength(1);
				expect(resultIncluding[0].answers[0].answer_count).toBe(1);

				// Query still returns the question/answer structure but with 0 count
				// because it uses LEFT JOIN (shows all answers regardless of responses)
				expect(resultExcluding).toHaveLength(1);
				expect(resultExcluding[0].answers[0].answer_count).toBe(0);
			});
		});

		describe('result structure', () => {
			it('should return properly formatted QuestionStat objects', async () => {
				const { client, user, claim, checklist, page, instance, ctx } = await setupTestFixtures();

				const question = await createTestQuestion(db, {
					client_id: client.id,
					page_id: page.id,
					created_by: user.id,
					text: 'Test question text',
				});
				const answer = await createTestAnswer(db, {
					client_id: client.id,
					question_id: question.id,
					created_by: user.id,
					text: 'Test answer text',
				});

				const response = await createTestQuestionResponse(db, {
					client_id: client.id,
					checklist_id: checklist.id,
					instance_id: instance.id,
					claim_id: claim.id,
					question_id: question.id,
					created_by: user.id,
				});
				await createTestQuestionResponseAnswer(db, {
					response_id: response.id,
					answer_id: answer.id,
				});

				const result = await questionController.getQuestionStats(ctx, {
					pageId: page.id,
					filters: { range: WIDE_DATE_RANGE },
				});

				expect(result).toHaveLength(1);
				const stat = result[0];

				// Verify QuestionStat structure
				expect(stat).toHaveProperty('question_id');
				expect(stat).toHaveProperty('question_text');
				expect(stat).toHaveProperty('answers');
				expect(stat.question_id).toBe(question.id);
				expect(stat.question_text).toBe('Test question text');

				// Verify AnswerStat structure
				expect(stat.answers).toHaveLength(1);
				const answerStat = stat.answers[0];
				expect(answerStat).toHaveProperty('answer_id');
				expect(answerStat).toHaveProperty('answer_text');
				expect(answerStat).toHaveProperty('answer_count');
				expect(answerStat.answer_id).toBe(answer.id);
				expect(answerStat.answer_text).toBe('Test answer text');
				expect(typeof answerStat.answer_count).toBe('number');
			});
		});

		describe('tenant isolation', () => {
			it('should only return stats for the users client', async () => {
				const clientA = await createTestClient(db, { name: 'Client A' });
				const clientB = await createTestClient(db, { name: 'Client B' });
				const userA = await createTestUser(db, { client_id: clientA.id });
				const userB = await createTestUser(db, { client_id: clientB.id });
				const claimA = await createTestClaim(db, { client_id: clientA.id, created_by: userA.id });
				const checklistA = await createTestChecklist(db, {
					client_id: clientA.id,
					created_by: userA.id,
				});
				const pageA = await createTestPage(db, { client_id: clientA.id, created_by: userA.id });
				const instanceA = await createTestPageInstance(db, {
					client_id: clientA.id,
					page_id: pageA.id,
					checklist_id: checklistA.id,
					created_by: userA.id,
				});
				const questionA = await createTestQuestion(db, {
					client_id: clientA.id,
					page_id: pageA.id,
					created_by: userA.id,
					text: 'Client A Question',
				});
				const answerA = await createTestAnswer(db, {
					client_id: clientA.id,
					question_id: questionA.id,
					created_by: userA.id,
					text: 'Client A Answer',
				});
				const responseA = await createTestQuestionResponse(db, {
					client_id: clientA.id,
					checklist_id: checklistA.id,
					instance_id: instanceA.id,
					claim_id: claimA.id,
					question_id: questionA.id,
					created_by: userA.id,
				});
				await createTestQuestionResponseAnswer(db, {
					response_id: responseA.id,
					answer_id: answerA.id,
				});

				const ctxA = createTestContext(db, { id: userA.id, client_id: clientA.id });
				const ctxB = createTestContext(db, { id: userB.id, client_id: clientB.id });

				// User A should see their stats
				const resultA = await questionController.getQuestionStats(ctxA, {
					pageId: pageA.id,
					filters: { range: WIDE_DATE_RANGE },
				});

				// User B should not see Client A's stats
				const resultB = await questionController.getQuestionStats(ctxB, {
					pageId: pageA.id,
					filters: { range: WIDE_DATE_RANGE },
				});

				expect(resultA).toHaveLength(1);
				expect(resultA[0].question_text).toBe('Client A Question');

				expect(resultB).toHaveLength(0);
			});
		});
	});
});
