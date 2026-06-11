import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TRPCError } from '@trpc/server';
import type { Context } from '@/server/trpc/context';
import config from '@/config/config';
import { db } from '@/api/database/kysely';
import { QuestionType, PageInstanceStatus, ClaimStatus } from '@/config/enums';

// Import all routers
import { userRouter } from '../user';
import { commentRouter } from '../comment';
import { responseRouter } from '../response';
import { checklistRouter } from '../checklist';
import { claimRouter } from '../claim';
import { feedRouter } from '../feed';
import { actionRouter } from '../action';
import { questionRouter } from '../question';
import { pageRouter } from '../page';
import { answerRouter } from '../answer';
import { partyRouter } from '../party';
import { statuteRouter } from '../statute';

// Mock the database
vi.mock('@/api/database/kysely', () => ({
	db: {
		selectFrom: vi.fn(),
		insertInto: vi.fn(),
		updateTable: vi.fn(),
		deleteFrom: vi.fn(),
	},
}));

// Mock all controller functions
vi.mock('@/api/controllers/userController', () => ({
	getUser: vi.fn(),
	getUsers: vi.fn(),
	getUserCount: vi.fn(),
	getInactiveUserCount: vi.fn(),
	getUsersPaginated: vi.fn(),
	getUserActivity: vi.fn(),
	getUserActivityDetail: vi.fn(),
	createUsers: vi.fn(),
	updateUser: vi.fn(),
	deleteUser: vi.fn(),
}));

vi.mock('@/api/controllers/commentController', () => ({
	createComment: vi.fn(),
	deleteComment: vi.fn(),
	getComment: vi.fn(),
	getComments: vi.fn(),
	getCommentCount: vi.fn(),
	getCommentsForPage: vi.fn(),
}));

vi.mock('@/api/controllers/responseController', () => ({
	evaluateResponses: vi.fn(),
	getResponsesForAnswer: vi.fn(),
	getResponsesForPageInstance: vi.fn(),
	getResponseAuditLogs: vi.fn(),
	getResponseAuditLogStats: vi.fn(),
	upsertQuestionResponses: vi.fn(),
}));

vi.mock('@/api/controllers/checklistController', () => ({
	getChecklists: vi.fn(),
	getChecklistCount: vi.fn(),
	getChecklist: vi.fn(),
	getChecklistClaim: vi.fn(),
	getChecklistClaimProgress: vi.fn(),
	getChecklistClaimStats: vi.fn(),
	getChecklistClaims: vi.fn(),
	getRecentChecklistClaims: vi.fn(),
	getChecklistSummary: vi.fn(),
	getChecklistSummaryDetail: vi.fn(),
	createChecklist: vi.fn(),
	deleteChecklist: vi.fn(),
	updateChecklist: vi.fn(),
	modifyChecklistClaim: vi.fn(),
}));

vi.mock('@/api/controllers/claimController', () => ({
	assignClaim: vi.fn(),
	getClaim: vi.fn(),
	getNextClaimToAssign: vi.fn(),
	getClaims: vi.fn(),
	getClaimCount: vi.fn(),
	getRolloverClaimCount: vi.fn(),
	createClaims: vi.fn(),
	updateClaim: vi.fn(),
}));

vi.mock('@/api/controllers/feedController', () => ({
	getFeeds: vi.fn(),
	getFeedCount: vi.fn(),
	getFeed: vi.fn(),
	getLastSyncedFeed: vi.fn(),
	createFeed: vi.fn(),
	updateFeed: vi.fn(),
	deleteFeed: vi.fn(),
}));

vi.mock('@/api/controllers/actionController', () => ({
	getAction: vi.fn(),
	getActionStats: vi.fn(),
	getActionStatsDetail: vi.fn(),
	upsertAction: vi.fn(),
}));

vi.mock('@/api/controllers/questionController', () => ({
	getQuestion: vi.fn(),
	getQuestions: vi.fn(),
	getQuestionStats: vi.fn(),
	createQuestion: vi.fn(),
	updateQuestion: vi.fn(),
	copyQuestion: vi.fn(),
	deleteQuestion: vi.fn(),
}));

vi.mock('@/api/controllers/pageController', () => ({
	getPages: vi.fn(),
	getPage: vi.fn(),
	getPageInstance: vi.fn(),
	getPageInstances: vi.fn(),
	getPageInstanceTree: vi.fn(),
	getVisiblePageInstances: vi.fn(),
	createPage: vi.fn(),
	createPageInstance: vi.fn(),
	updatePageTemplate: vi.fn(),
	deletePageInstance: vi.fn(),
}));

vi.mock('@/api/controllers/answerController', () => ({
	getAnswer: vi.fn(),
	getAnswersForQuestion: vi.fn(),
	createAnswer: vi.fn(),
	updateAnswer: vi.fn(),
	copyAnswer: vi.fn(),
	deleteAnswer: vi.fn(),
}));

vi.mock('@/api/controllers/partyController', () => ({
	getParties: vi.fn(),
	getParty: vi.fn(),
	searchParties: vi.fn(),
	createParty: vi.fn(),
	updateParty: vi.fn(),
	archiveParty: vi.fn(),
	restoreParty: vi.fn(),
	getPartyAddresses: vi.fn(),
	getAllPartyAddresses: vi.fn(),
	getPartyAddress: vi.fn(),
	createPartyAddress: vi.fn(),
	updatePartyAddress: vi.fn(),
	archivePartyAddress: vi.fn(),
	restorePartyAddress: vi.fn(),
	getPartyOffices: vi.fn(),
	getAllPartyOffices: vi.fn(),
	createPartyOffice: vi.fn(),
	updatePartyOffice: vi.fn(),
	archivePartyOffice: vi.fn(),
	restorePartyOffice: vi.fn(),
	getPartyRepresentatives: vi.fn(),
	getAllPartyRepresentatives: vi.fn(),
	createPartyRepresentative: vi.fn(),
	updatePartyRepresentative: vi.fn(),
	archivePartyRepresentative: vi.fn(),
	restorePartyRepresentative: vi.fn(),
	getClaimParties: vi.fn(),
	linkPartyToClaim: vi.fn(),
	updateClaimParty: vi.fn(),
	archiveClaimParty: vi.fn(),
}));

vi.mock('@/api/controllers/statuteController', () => ({
	getStatuteRules: vi.fn(),
	getStatuteRule: vi.fn(),
	updateStatuteRule: vi.fn(),
	calculateStatuteLimit: vi.fn(),
}));

// Reusable mock user with all required fields
const createMockUser = (overrides?: Partial<NonNullable<Context['session']>['user']>) => ({
	id: 'user-123',
	authUserId: 'auth-user-123',
	name: 'Test User',
	email: 'test@example.com',
	phone: null,
	role: 'Contributor' as string | null,
	client_id: 'client-abc',
	...overrides,
});

// Reusable mock session
const createMockSession = (userOverrides?: Partial<NonNullable<Context['session']>['user']>) => ({
	user: createMockUser(userOverrides),
	expires: '2025-12-31T23:59:59.999Z',
});

// Helper to create caller with context
const createCaller = (router: any, ctx: Context) => {
	return router.createCaller(ctx);
};

describe('Router Authorization - Comprehensive Security Tests', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	/**
	 * Rule 1: Admin/Super Admin Full CRUD Permissions
	 * Admins should have full CRUD operations on all resources within their client.
	 */
	describe('Rule 1: Admin/Super Admin CRUD Permissions', () => {
		describe('deleteComment', () => {
			it('should allow admin to delete any comment', async () => {
				const adminCtx: Context = {
					session: createMockSession({ role: config.ROLES.ADMIN }),
					db,
				};

				const mockDeleteComment = await import('@/api/controllers/commentController');
				vi.mocked(mockDeleteComment.deleteComment).mockResolvedValue({
					id: '00000000-0000-0000-0000-000000000001',
					checklist_id: '00000000-0000-0000-0000-000000000001',
					claim_id: '00000000-0000-0000-0000-000000000100',
					instance_id: '00000000-0000-0000-0000-000000000050',
					question_id: '00000000-0000-0000-0000-000000000010',
					body: 'Test comment',
					client_id: 'client-abc',
					created_by: 'other-user',
					created_at: new Date(),
					updated_at: new Date(),
				});

				const caller = createCaller(commentRouter, adminCtx);
				await expect(
					caller.deleteComment({ id: '00000000-0000-0000-0000-000000000001' })
				).resolves.toBeDefined();
			});

			it('should allow user to delete their own comment', async () => {
				const userCtx: Context = {
					session: createMockSession({ id: 'user-123', role: config.ROLES.CONTRIBUTOR }),
					db,
				};

				const mockGetComment = await import('@/api/controllers/commentController');
				vi.mocked(mockGetComment.getComment).mockResolvedValue({
					id: '00000000-0000-0000-0000-000000000001',
					checklist_id: '00000000-0000-0000-0000-000000000001',
					claim_id: '00000000-0000-0000-0000-000000000100',
					instance_id: '00000000-0000-0000-0000-000000000050',
					question_id: '00000000-0000-0000-0000-000000000010',
					body: 'Test comment',
					client_id: 'client-abc',
					created_by: 'user-123', // Same as session user
					created_at: new Date(),
					updated_at: new Date(),
					first: 'Test',
					last: 'User',
					email: 'test@example.com',
				});

				const mockDeleteComment = await import('@/api/controllers/commentController');
				vi.mocked(mockDeleteComment.deleteComment).mockResolvedValue({
					id: '00000000-0000-0000-0000-000000000001',
					checklist_id: '00000000-0000-0000-0000-000000000001',
					claim_id: '00000000-0000-0000-0000-000000000100',
					instance_id: '00000000-0000-0000-0000-000000000050',
					question_id: '00000000-0000-0000-0000-000000000010',
					body: 'Test comment',
					client_id: 'client-abc',
					created_by: 'user-123',
					created_at: new Date(),
					updated_at: new Date(),
				});

				const caller = createCaller(commentRouter, userCtx);
				await expect(
					caller.deleteComment({ id: '00000000-0000-0000-0000-000000000001' })
				).resolves.toBeDefined();
			});

			it('should reject contributor deleting others comments', async () => {
				const userCtx: Context = {
					session: createMockSession({ id: 'user-123', role: config.ROLES.CONTRIBUTOR }),
					db,
				};

				const mockGetComment = await import('@/api/controllers/commentController');
				vi.mocked(mockGetComment.getComment).mockResolvedValue({
					id: '00000000-0000-0000-0000-000000000001',
					checklist_id: '00000000-0000-0000-0000-000000000001',
					claim_id: '00000000-0000-0000-0000-000000000100',
					instance_id: '00000000-0000-0000-0000-000000000050',
					question_id: '00000000-0000-0000-0000-000000000010',
					body: 'Test comment',
					client_id: 'client-abc',
					created_by: 'other-user', // Different from session user
					created_at: new Date(),
					updated_at: new Date(),
					first: 'Other',
					last: 'User',
					email: 'other@example.com',
				});

				const caller = createCaller(commentRouter, userCtx);
				await expect(
					caller.deleteComment({ id: '00000000-0000-0000-0000-000000000001' })
				).rejects.toThrow('FORBIDDEN: You can only delete your own comments');
			});
		});

		describe('evaluateResponses', () => {
			it('should allow admin to evaluate any claim', async () => {
				const adminCtx: Context = {
					session: createMockSession({ role: config.ROLES.ADMIN }),
					db,
				};

				const mockEvaluateResponses = await import('@/api/controllers/responseController');
				vi.mocked(mockEvaluateResponses.evaluateResponses).mockResolvedValue(
					PageInstanceStatus.IN_PROGRESS
				);

				const caller = createCaller(responseRouter, adminCtx);
				await expect(
					caller.evaluateResponses({
						checklistId: '00000000-0000-0000-0000-000000000001',
						claimId: '00000000-0000-0000-0000-000000000100',
						instanceId: '00000000-0000-0000-0000-000000000050',
					})
				).resolves.toBeDefined();
			});

			it('should allow owner to evaluate their claim', async () => {
				const userCtx: Context = {
					session: createMockSession({ id: 'user-123', role: config.ROLES.CONTRIBUTOR }),
					db,
				};

				// Mock requireOwnership check
				const mockSelect = vi.fn().mockReturnValue({
					where: vi.fn().mockReturnThis(),
					executeTakeFirstOrThrow: vi.fn().mockResolvedValue({
						created_by: 'user-123',
						assignee: 'other-user',
					}),
				});
				vi.spyOn(db, 'selectFrom').mockReturnValue({ select: mockSelect } as any);

				const mockEvaluateResponses = await import('@/api/controllers/responseController');
				vi.mocked(mockEvaluateResponses.evaluateResponses).mockResolvedValue(
					PageInstanceStatus.IN_PROGRESS
				);

				const caller = createCaller(responseRouter, userCtx);
				await expect(
					caller.evaluateResponses({
						checklistId: '00000000-0000-0000-0000-000000000001',
						claimId: '00000000-0000-0000-0000-000000000100',
						instanceId: '00000000-0000-0000-0000-000000000050',
					})
				).resolves.toBeDefined();
			});

			it('should allow assignee to evaluate their claim', async () => {
				const userCtx: Context = {
					session: createMockSession({ id: 'user-123', role: config.ROLES.CONTRIBUTOR }),
					db,
				};

				// Mock requireOwnership check
				const mockSelect = vi.fn().mockReturnValue({
					where: vi.fn().mockReturnThis(),
					executeTakeFirstOrThrow: vi.fn().mockResolvedValue({
						created_by: 'other-user',
						assignee: 'user-123',
					}),
				});
				vi.spyOn(db, 'selectFrom').mockReturnValue({ select: mockSelect } as any);

				const mockEvaluateResponses = await import('@/api/controllers/responseController');
				vi.mocked(mockEvaluateResponses.evaluateResponses).mockResolvedValue(
					PageInstanceStatus.IN_PROGRESS
				);

				const caller = createCaller(responseRouter, userCtx);
				await expect(
					caller.evaluateResponses({
						checklistId: '00000000-0000-0000-0000-000000000001',
						claimId: '00000000-0000-0000-0000-000000000100',
						instanceId: '00000000-0000-0000-0000-000000000050',
					})
				).resolves.toBeDefined();
			});

			it('should reject contributor evaluating unrelated claim', async () => {
				const userCtx: Context = {
					session: createMockSession({ id: 'user-123', role: config.ROLES.CONTRIBUTOR }),
					db,
				};

				// Mock requireOwnership check (user is neither creator nor assignee)
				const mockSelect = vi.fn().mockReturnValue({
					where: vi.fn().mockReturnThis(),
					executeTakeFirstOrThrow: vi.fn().mockResolvedValue({
						created_by: 'other-user',
						assignee: 'another-user',
					}),
				});
				vi.spyOn(db, 'selectFrom').mockReturnValue({ select: mockSelect } as any);

				const caller = createCaller(responseRouter, userCtx);
				await expect(
					caller.evaluateResponses({
						checklistId: '00000000-0000-0000-0000-000000000001',
						claimId: '00000000-0000-0000-0000-000000000100',
						instanceId: '00000000-0000-0000-0000-000000000050',
					})
				).rejects.toThrow(TRPCError);
			});
		});
	});

	/**
	 * Rule 2: Contributor Read Access Restrictions
	 * Contributors should NOT see aggregate metrics, unpublished checklists, or other users' private data.
	 */
	describe('Rule 2: Contributor Read Access Restrictions', () => {
		describe('getClaimCount - Admin Only', () => {
			it('should allow admin to get claim count', async () => {
				const adminCtx: Context = {
					session: createMockSession({ role: config.ROLES.ADMIN }),
					db,
				};

				const mockGetClaimCount = await import('@/api/controllers/claimController');
				vi.mocked(mockGetClaimCount.getClaimCount).mockResolvedValue({
					total: 42,
					fed: 30,
					manual: 12,
				});

				const caller = createCaller(claimRouter, adminCtx);
				await expect(caller.getClaimCount({})).resolves.toEqual({ total: 42, fed: 30, manual: 12 });
			});

			it('should allow super admin to get claim count', async () => {
				const superAdminCtx: Context = {
					session: createMockSession({ role: config.ROLES.SUPER_ADMIN }),
					db,
				};

				const mockGetClaimCount = await import('@/api/controllers/claimController');
				vi.mocked(mockGetClaimCount.getClaimCount).mockResolvedValue({
					total: 42,
					fed: 30,
					manual: 12,
				});

				const caller = createCaller(claimRouter, superAdminCtx);
				await expect(caller.getClaimCount({})).resolves.toEqual({ total: 42, fed: 30, manual: 12 });
			});

			it('should reject contributor access', async () => {
				const contributorCtx: Context = {
					session: createMockSession({ role: config.ROLES.CONTRIBUTOR }),
					db,
				};

				const caller = createCaller(claimRouter, contributorCtx);
				await expect(caller.getClaimCount({})).rejects.toThrow(TRPCError);
			});

			it('should require super admin for client aliasing', async () => {
				const adminCtx: Context = {
					session: createMockSession({ role: config.ROLES.ADMIN }),
					db,
				};

				const caller = createCaller(claimRouter, adminCtx);
				await expect(caller.getClaimCount({ clientId: 'other-client' })).rejects.toThrow(TRPCError);
			});
		});

		describe('getChecklistCount - Admin Only', () => {
			it('should allow admin to get checklist count', async () => {
				const adminCtx: Context = {
					session: createMockSession({ role: config.ROLES.ADMIN }),
					db,
				};

				const mockGetChecklistCount = await import('@/api/controllers/checklistController');
				vi.mocked(mockGetChecklistCount.getChecklistCount).mockResolvedValue({
					total: 10,
					published: 8,
					unpublished: 2,
				});

				const caller = createCaller(checklistRouter, adminCtx);
				await expect(caller.getChecklistCount({})).resolves.toEqual({
					total: 10,
					published: 8,
					unpublished: 2,
				});
			});

			it('should reject contributor access', async () => {
				const contributorCtx: Context = {
					session: createMockSession({ role: config.ROLES.CONTRIBUTOR }),
					db,
				};

				const caller = createCaller(checklistRouter, contributorCtx);
				await expect(caller.getChecklistCount({})).rejects.toThrow(TRPCError);
			});
		});

		describe('getResponsesForAnswer - Admin Only', () => {
			it('should allow admin to get responses for answer', async () => {
				const adminCtx: Context = {
					session: createMockSession({ role: config.ROLES.ADMIN }),
					db,
				};

				const mockGetResponsesForAnswer = await import('@/api/controllers/responseController');
				vi.mocked(mockGetResponsesForAnswer.getResponsesForAnswer).mockResolvedValue([]);

				const caller = createCaller(responseRouter, adminCtx);
				await expect(
					caller.getResponsesForAnswer({
						answerId: '00000000-0000-0000-0000-000000000001',
						filters: {
							range: ['2025-01-01', '2025-12-31'],
						},
						limit: 50,
						offset: 0,
					})
				).resolves.toEqual([]);
			});

			it('should reject contributor access', async () => {
				const contributorCtx: Context = {
					session: createMockSession({ role: config.ROLES.CONTRIBUTOR }),
					db,
				};

				const caller = createCaller(responseRouter, contributorCtx);
				await expect(
					caller.getResponsesForAnswer({ answerId: '00000000-0000-0000-0000-000000000001' })
				).rejects.toThrow(TRPCError);
			});
		});

		describe('getUser - Field Filtering', () => {
			const mockFullUser = {
				id: 'user-456',
				first: 'John',
				last: 'Doe',
				email: 'john@example.com',
				phone: '+12125551234' as string | null,
				role: config.ROLES.CONTRIBUTOR as string | null,
				client_id: 'client-abc' as string | null,
				disabled: false,
				email_verified: true,
				phone_verified: null as Date | null,
				must_change_password: false,
				password_hash: 'hashed_password',
				created_at: new Date(),
				updated_at: new Date(),
				created_by: null as string | null,
				updated_by: null as string | null,
				last_login: null as Date | null,
				onboarding_email_sent: null as Date | null,
			};

			it('should return full profile to admins', async () => {
				const adminCtx: Context = {
					session: createMockSession({ role: config.ROLES.ADMIN }),
					db,
				};

				const mockGetUser = await import('@/api/controllers/userController');
				vi.mocked(mockGetUser.getUser).mockResolvedValue(mockFullUser as any);

				const caller = createCaller(userRouter, adminCtx);
				const result = await caller.getUser({ id: 'user-456' });

				expect(result).toEqual(mockFullUser);
				expect(result).toHaveProperty('password_hash');
				expect(result).toHaveProperty('role');
				expect(result).toHaveProperty('disabled');
			});

			it('should return full profile when user views self', async () => {
				const userCtx: Context = {
					session: createMockSession({ id: 'user-456', role: config.ROLES.CONTRIBUTOR }),
					db,
				};

				const mockGetUser = await import('@/api/controllers/userController');
				vi.mocked(mockGetUser.getUser).mockResolvedValue(mockFullUser as any);

				const caller = createCaller(userRouter, userCtx);
				const result = await caller.getUser({ id: 'user-456' });

				expect(result).toEqual(mockFullUser);
				expect(result).toHaveProperty('password_hash');
			});

			it('should return basic fields when contributor views other user', async () => {
				const contributorCtx: Context = {
					session: createMockSession({ id: 'user-123', role: config.ROLES.CONTRIBUTOR }),
					db,
				};

				const mockGetUser = await import('@/api/controllers/userController');
				vi.mocked(mockGetUser.getUser).mockResolvedValue(mockFullUser as any);

				const caller = createCaller(userRouter, contributorCtx);
				const result = await caller.getUser({ id: 'user-456' });

				// Should only have basic fields
				expect(result).toEqual({
					id: 'user-456',
					first: 'John',
					last: 'Doe',
					email: 'john@example.com',
					client_id: 'client-abc',
				});

				// Should NOT have sensitive fields
				expect(result).not.toHaveProperty('password_hash');
				expect(result).not.toHaveProperty('role');
				expect(result).not.toHaveProperty('disabled');
				expect(result).not.toHaveProperty('email_verified');
				expect(result).not.toHaveProperty('phone_verified');
			});
		});

		describe('getComment - Authorization Check', () => {
			it('should allow admin to get any comment', async () => {
				const adminCtx: Context = {
					session: createMockSession({ role: config.ROLES.ADMIN }),
					db,
				};

				const mockGetComment = await import('@/api/controllers/commentController');
				vi.mocked(mockGetComment.getComment).mockResolvedValue({
					id: '00000000-0000-0000-0000-000000000001',
					checklist_id: '00000000-0000-0000-0000-000000000001',
					claim_id: '00000000-0000-0000-0000-000000000100',
					instance_id: '00000000-0000-0000-0000-000000000050',
					question_id: '00000000-0000-0000-0000-000000000010',
					body: 'Test comment',
					client_id: 'client-abc',
					created_by: 'other-user',
					created_at: new Date(),
					updated_at: new Date(),
					first: 'Other',
					last: 'User',
					email: 'other@example.com',
				});

				const caller = createCaller(commentRouter, adminCtx);
				await expect(
					caller.getComment({ id: '00000000-0000-0000-0000-000000000001' })
				).resolves.toBeDefined();
			});

			it('should allow contributor with ownership to get comment', async () => {
				const userCtx: Context = {
					session: createMockSession({ id: 'user-123', role: config.ROLES.CONTRIBUTOR }),
					db,
				};

				const mockGetComment = await import('@/api/controllers/commentController');
				vi.mocked(mockGetComment.getComment).mockResolvedValue({
					id: '00000000-0000-0000-0000-000000000001',
					checklist_id: '00000000-0000-0000-0000-000000000001',
					claim_id: '00000000-0000-0000-0000-000000000100',
					instance_id: '00000000-0000-0000-0000-000000000050',
					question_id: '00000000-0000-0000-0000-000000000010',
					body: 'Test comment',
					client_id: 'client-abc',
					created_by: 'other-user',
					created_at: new Date(),
					updated_at: new Date(),
					first: 'Other',
					last: 'User',
					email: 'other@example.com',
				});

				// Mock requireOwnership check
				const mockSelect = vi.fn().mockReturnValue({
					where: vi.fn().mockReturnThis(),
					executeTakeFirstOrThrow: vi.fn().mockResolvedValue({
						created_by: 'user-123',
						assignee: 'other-user',
					}),
				});
				vi.spyOn(db, 'selectFrom').mockReturnValue({ select: mockSelect } as any);

				const caller = createCaller(commentRouter, userCtx);
				await expect(
					caller.getComment({ id: '00000000-0000-0000-0000-000000000001' })
				).resolves.toBeDefined();
			});

			it('should reject contributor without ownership', async () => {
				const userCtx: Context = {
					session: createMockSession({ id: 'user-123', role: config.ROLES.CONTRIBUTOR }),
					db,
				};

				const mockGetComment = await import('@/api/controllers/commentController');
				vi.mocked(mockGetComment.getComment).mockResolvedValue({
					id: '00000000-0000-0000-0000-000000000001',
					checklist_id: '00000000-0000-0000-0000-000000000001',
					claim_id: '00000000-0000-0000-0000-000000000100',
					instance_id: '00000000-0000-0000-0000-000000000050',
					question_id: '00000000-0000-0000-0000-000000000010',
					body: 'Test comment',
					client_id: 'client-abc',
					created_by: 'other-user',
					created_at: new Date(),
					updated_at: new Date(),
					first: 'Other',
					last: 'User',
					email: 'other@example.com',
				});

				// Mock requireOwnership check (user is neither creator nor assignee)
				const mockSelect = vi.fn().mockReturnValue({
					where: vi.fn().mockReturnThis(),
					executeTakeFirstOrThrow: vi.fn().mockResolvedValue({
						created_by: 'other-user',
						assignee: 'another-user',
					}),
				});
				vi.spyOn(db, 'selectFrom').mockReturnValue({ select: mockSelect } as any);

				const caller = createCaller(commentRouter, userCtx);
				await expect(
					caller.getComment({ id: '00000000-0000-0000-0000-000000000001' })
				).rejects.toThrow(TRPCError);
			});
		});
	});

	/**
	 * Rule 3: Contributor Write Access Restrictions
	 * Contributors should have limited write access and cannot modify privileged fields.
	 */
	describe('Rule 3: Contributor Write Access - Field-Level Authorization', () => {
		describe('updateUser - Privileged Field Restrictions', () => {
			it('should allow admin to update any user field', async () => {
				const adminCtx: Context = {
					session: createMockSession({ role: config.ROLES.ADMIN }),
					db,
				};

				const mockUpdateUser = await import('@/api/controllers/userController');
				vi.mocked(mockUpdateUser.updateUser).mockResolvedValue({
					first: 'John',
					last: 'Doe',
					email: 'john@example.com',
					phone: null,
				});

				const caller = createCaller(userRouter, adminCtx);
				await expect(
					caller.updateUser({
						id: 'user-456',
						params: {
							role: config.ROLES.ADMIN,
							disabled: true,
						},
					})
				).resolves.toBeDefined();
			});

			it('should allow contributor to update their own email field', async () => {
				const userCtx: Context = {
					session: createMockSession({ id: 'user-123', role: config.ROLES.CONTRIBUTOR }),
					db,
				};

				const mockUpdateUser = await import('@/api/controllers/userController');
				vi.mocked(mockUpdateUser.updateUser).mockResolvedValue({
					first: 'Test',
					last: 'User',
					email: 'updated@example.com',
					phone: null,
				});

				const caller = createCaller(userRouter, userCtx);
				// email is the only non-privileged field - first/last require Super Admin
				await expect(
					caller.updateUser({
						id: 'user-123',
						params: {
							email: 'updated@example.com',
						},
					})
				).resolves.toBeDefined();
			});

			it('should reject contributor updating their own first/last name fields (super admin only)', async () => {
				const userCtx: Context = {
					session: createMockSession({ id: 'user-123', role: config.ROLES.CONTRIBUTOR }),
					db,
				};

				const caller = createCaller(userRouter, userCtx);
				await expect(
					caller.updateUser({
						id: 'user-123',
						params: {
							first: 'Updated',
						},
					})
				).rejects.toThrow(TRPCError);
				await expect(
					caller.updateUser({
						id: 'user-123',
						params: {
							last: 'Name',
						},
					})
				).rejects.toThrow('User must have one of: Super Admin');
			});

			it('should reject contributor updating their own role field', async () => {
				const userCtx: Context = {
					session: createMockSession({ id: 'user-123', role: config.ROLES.CONTRIBUTOR }),
					db,
				};

				const caller = createCaller(userRouter, userCtx);
				await expect(
					caller.updateUser({
						id: 'user-123',
						params: {
							role: config.ROLES.ADMIN,
						},
					})
				).rejects.toThrow(TRPCError);
				await expect(
					caller.updateUser({
						id: 'user-123',
						params: {
							role: config.ROLES.ADMIN,
						},
					})
				).rejects.toThrow('User must have one of: Admin, Super Admin');
			});

			it('should reject contributor updating their own disabled field', async () => {
				const userCtx: Context = {
					session: createMockSession({ id: 'user-123', role: config.ROLES.CONTRIBUTOR }),
					db,
				};

				const caller = createCaller(userRouter, userCtx);
				await expect(
					caller.updateUser({
						id: 'user-123',
						params: {
							disabled: false,
						},
					})
				).rejects.toThrow('User must have one of: Admin, Super Admin');
			});

			it('should reject contributor updating multiple privileged fields', async () => {
				const userCtx: Context = {
					session: createMockSession({ id: 'user-123', role: config.ROLES.CONTRIBUTOR }),
					db,
				};

				const caller = createCaller(userRouter, userCtx);
				await expect(
					caller.updateUser({
						id: 'user-123',
						params: {
							role: config.ROLES.ADMIN,
							disabled: false,
						},
					})
				).rejects.toThrow('User must have one of: Admin, Super Admin');
			});

			it('should reject contributor updating other users', async () => {
				const userCtx: Context = {
					session: createMockSession({ id: 'user-123', role: config.ROLES.CONTRIBUTOR }),
					db,
				};

				const caller = createCaller(userRouter, userCtx);
				await expect(
					caller.updateUser({
						id: 'user-456',
						params: {
							first: 'Updated',
						},
					})
				).rejects.toThrow(TRPCError);
			});
		});

		describe('updateUser - Role Elevation Rules', () => {
			it('should allow Admin to elevate Contributor to Admin', async () => {
				const adminCtx: Context = {
					session: createMockSession({ role: config.ROLES.ADMIN }),
					db,
				};

				const mockUpdateUser = await import('@/api/controllers/userController');
				vi.mocked(mockUpdateUser.updateUser).mockResolvedValue({
					first: 'John',
					last: 'Doe',
					email: 'john@example.com',
					phone: null,
				} as any);

				const caller = createCaller(userRouter, adminCtx);
				await expect(
					caller.updateUser({
						id: 'user-456',
						params: {
							role: config.ROLES.ADMIN,
						},
					})
				).resolves.toBeDefined();
			});

			it('should reject Admin trying to elevate Contributor to Super Admin', async () => {
				const adminCtx: Context = {
					session: createMockSession({ role: config.ROLES.ADMIN }),
					db,
				};

				const caller = createCaller(userRouter, adminCtx);
				await expect(
					caller.updateUser({
						id: 'user-456',
						params: {
							role: config.ROLES.SUPER_ADMIN,
						},
					})
				).rejects.toThrow(TRPCError);
				await expect(
					caller.updateUser({
						id: 'user-456',
						params: {
							role: config.ROLES.SUPER_ADMIN,
						},
					})
				).rejects.toThrow('User must have one of: Super Admin');
			});

			it('should reject Admin trying to demote Admin to Contributor', async () => {
				const adminCtx: Context = {
					session: createMockSession({ role: config.ROLES.ADMIN }),
					db,
				};

				const caller = createCaller(userRouter, adminCtx);
				await expect(
					caller.updateUser({
						id: 'user-456',
						params: {
							role: config.ROLES.CONTRIBUTOR,
						},
					})
				).rejects.toThrow(TRPCError);
				await expect(
					caller.updateUser({
						id: 'user-456',
						params: {
							role: config.ROLES.CONTRIBUTOR,
						},
					})
				).rejects.toThrow('User must have one of: Super Admin');
			});

			it('should allow Super Admin to elevate Contributor to Admin', async () => {
				const superAdminCtx: Context = {
					session: createMockSession({ role: config.ROLES.SUPER_ADMIN }),
					db,
				};

				const mockUpdateUser = await import('@/api/controllers/userController');
				vi.mocked(mockUpdateUser.updateUser).mockResolvedValue({
					first: 'John',
					last: 'Doe',
					email: 'john@example.com',
					phone: null,
				} as any);

				const caller = createCaller(userRouter, superAdminCtx);
				await expect(
					caller.updateUser({
						id: 'user-456',
						params: {
							role: config.ROLES.ADMIN,
						},
					})
				).resolves.toBeDefined();
			});

			it('should allow Super Admin to elevate Contributor to Super Admin', async () => {
				const superAdminCtx: Context = {
					session: createMockSession({ role: config.ROLES.SUPER_ADMIN }),
					db,
				};

				const mockUpdateUser = await import('@/api/controllers/userController');
				vi.mocked(mockUpdateUser.updateUser).mockResolvedValue({
					first: 'John',
					last: 'Doe',
					email: 'john@example.com',
					phone: null,
				} as any);

				const caller = createCaller(userRouter, superAdminCtx);
				await expect(
					caller.updateUser({
						id: 'user-456',
						params: {
							role: config.ROLES.SUPER_ADMIN,
						},
					})
				).resolves.toBeDefined();
			});

			it('should allow Super Admin to demote Admin to Contributor', async () => {
				const superAdminCtx: Context = {
					session: createMockSession({ role: config.ROLES.SUPER_ADMIN }),
					db,
				};

				const mockUpdateUser = await import('@/api/controllers/userController');
				vi.mocked(mockUpdateUser.updateUser).mockResolvedValue({
					first: 'John',
					last: 'Doe',
					email: 'john@example.com',
					phone: null,
				} as any);

				const caller = createCaller(userRouter, superAdminCtx);
				await expect(
					caller.updateUser({
						id: 'user-456',
						params: {
							role: config.ROLES.CONTRIBUTOR,
						},
					})
				).resolves.toBeDefined();
			});

			it('should allow Super Admin to demote Super Admin to Contributor', async () => {
				const superAdminCtx: Context = {
					session: createMockSession({ role: config.ROLES.SUPER_ADMIN }),
					db,
				};

				const mockUpdateUser = await import('@/api/controllers/userController');
				vi.mocked(mockUpdateUser.updateUser).mockResolvedValue({
					first: 'John',
					last: 'Doe',
					email: 'john@example.com',
					phone: null,
				} as any);

				const caller = createCaller(userRouter, superAdminCtx);
				await expect(
					caller.updateUser({
						id: 'user-456',
						params: {
							role: config.ROLES.CONTRIBUTOR,
						},
					})
				).resolves.toBeDefined();
			});

			it('should reject Contributor trying to change any role', async () => {
				const contributorCtx: Context = {
					session: createMockSession({ id: 'user-123', role: config.ROLES.CONTRIBUTOR }),
					db,
				};

				const caller = createCaller(userRouter, contributorCtx);

				// Try to elevate themselves to Admin
				await expect(
					caller.updateUser({
						id: 'user-123',
						params: {
							role: config.ROLES.ADMIN,
						},
					})
				).rejects.toThrow(TRPCError);

				// Try to elevate themselves to Super Admin
				await expect(
					caller.updateUser({
						id: 'user-123',
						params: {
							role: config.ROLES.SUPER_ADMIN,
						},
					})
				).rejects.toThrow(TRPCError);
			});
		});
	});

	/**
	 * Rule 4: Contributor "No Access" Enforcement
	 * Contributors should have NO access to other users' work.
	 */
	describe('Rule 4: Contributor No Access Enforcement', () => {
		describe('getChecklistSummary - Ownership Required', () => {
			it('should allow admin to get any checklist summary', async () => {
				const adminCtx: Context = {
					session: createMockSession({ role: config.ROLES.ADMIN }),
					db,
				};

				const mockGetChecklistSummary = await import('@/api/controllers/checklistController');
				vi.mocked(mockGetChecklistSummary.getChecklistSummary).mockResolvedValue({
					total_questions: 10,
					total_answered: 5,
					total_action_required: 2,
					total_unknown: 1,
				});

				const caller = createCaller(checklistRouter, adminCtx);
				await expect(
					caller.getChecklistSummary({
						checklistId: '00000000-0000-0000-0000-000000000001',
						claimId: '00000000-0000-0000-0000-000000000100',
					})
				).resolves.toBeDefined();
			});

			it('should allow contributor with ownership', async () => {
				const userCtx: Context = {
					session: createMockSession({ id: 'user-123', role: config.ROLES.CONTRIBUTOR }),
					db,
				};

				// Mock requireOwnership check
				const mockSelect = vi.fn().mockReturnValue({
					where: vi.fn().mockReturnThis(),
					executeTakeFirstOrThrow: vi.fn().mockResolvedValue({
						created_by: 'user-123',
						assignee: 'other-user',
					}),
				});
				vi.spyOn(db, 'selectFrom').mockReturnValue({ select: mockSelect } as any);

				const mockGetChecklistSummary = await import('@/api/controllers/checklistController');
				vi.mocked(mockGetChecklistSummary.getChecklistSummary).mockResolvedValue({
					total_questions: 10,
					total_answered: 5,
					total_action_required: 2,
					total_unknown: 1,
				});

				const caller = createCaller(checklistRouter, userCtx);
				await expect(
					caller.getChecklistSummary({
						checklistId: '00000000-0000-0000-0000-000000000001',
						claimId: '00000000-0000-0000-0000-000000000100',
					})
				).resolves.toBeDefined();
			});

			it('should reject contributor without ownership', async () => {
				const userCtx: Context = {
					session: createMockSession({ id: 'user-123', role: config.ROLES.CONTRIBUTOR }),
					db,
				};

				// Mock requireOwnership check (user is neither creator nor assignee)
				const mockSelect = vi.fn().mockReturnValue({
					where: vi.fn().mockReturnThis(),
					executeTakeFirstOrThrow: vi.fn().mockResolvedValue({
						created_by: 'other-user',
						assignee: 'another-user',
					}),
				});
				vi.spyOn(db, 'selectFrom').mockReturnValue({ select: mockSelect } as any);

				const caller = createCaller(checklistRouter, userCtx);
				await expect(
					caller.getChecklistSummary({
						checklistId: '00000000-0000-0000-0000-000000000001',
						claimId: '00000000-0000-0000-0000-000000000100',
					})
				).rejects.toThrow(TRPCError);
			});
		});

		describe('getChecklistSummaryDetail - Ownership Required', () => {
			it('should allow admin to get any checklist summary detail', async () => {
				const adminCtx: Context = {
					session: createMockSession({ role: config.ROLES.ADMIN }),
					db,
				};

				const mockGetChecklistSummaryDetail = await import('@/api/controllers/checklistController');
				vi.mocked(mockGetChecklistSummaryDetail.getChecklistSummaryDetail).mockResolvedValue({
					rows: [],
					count: 0,
				});

				const caller = createCaller(checklistRouter, adminCtx);
				await expect(
					caller.getChecklistSummaryDetail({
						checklistId: '00000000-0000-0000-0000-000000000001',
						claimId: '00000000-0000-0000-0000-000000000100',
						segment: 'answered',
						mode: 'count',
					})
				).resolves.toBeDefined();
			});

			it('should allow contributor with ownership', async () => {
				const userCtx: Context = {
					session: createMockSession({ id: 'user-123', role: config.ROLES.CONTRIBUTOR }),
					db,
				};

				// Mock requireOwnership check
				const mockSelect = vi.fn().mockReturnValue({
					where: vi.fn().mockReturnThis(),
					executeTakeFirstOrThrow: vi.fn().mockResolvedValue({
						created_by: 'other-user',
						assignee: 'user-123',
					}),
				});
				vi.spyOn(db, 'selectFrom').mockReturnValue({ select: mockSelect } as any);

				const mockGetChecklistSummaryDetail = await import('@/api/controllers/checklistController');
				vi.mocked(mockGetChecklistSummaryDetail.getChecklistSummaryDetail).mockResolvedValue({
					rows: [],
					count: 0,
				});

				const caller = createCaller(checklistRouter, userCtx);
				await expect(
					caller.getChecklistSummaryDetail({
						checklistId: '00000000-0000-0000-0000-000000000001',
						claimId: '00000000-0000-0000-0000-000000000100',
						segment: 'answered',
						mode: 'count',
					})
				).resolves.toBeDefined();
			});

			it('should reject contributor without ownership', async () => {
				const userCtx: Context = {
					session: createMockSession({ id: 'user-123', role: config.ROLES.CONTRIBUTOR }),
					db,
				};

				// Mock requireOwnership check (user is neither creator nor assignee)
				const mockSelect = vi.fn().mockReturnValue({
					where: vi.fn().mockReturnThis(),
					executeTakeFirstOrThrow: vi.fn().mockResolvedValue({
						created_by: 'other-user',
						assignee: 'another-user',
					}),
				});
				vi.spyOn(db, 'selectFrom').mockReturnValue({ select: mockSelect } as any);

				const caller = createCaller(checklistRouter, userCtx);
				await expect(
					caller.getChecklistSummaryDetail({
						checklistId: '00000000-0000-0000-0000-000000000001',
						claimId: '00000000-0000-0000-0000-000000000100',
						segment: 'answered',
						mode: 'count',
					})
				).rejects.toThrow(TRPCError);
			});
		});

		describe('getResponsesForPageInstance - Ownership Required', () => {
			it('should allow admin to get responses for any page instance', async () => {
				const adminCtx: Context = {
					session: createMockSession({ role: config.ROLES.ADMIN }),
					db,
				};

				const mockGetResponsesForPageInstance =
					await import('@/api/controllers/responseController');
				vi.mocked(mockGetResponsesForPageInstance.getResponsesForPageInstance).mockResolvedValue(
					{}
				);

				const caller = createCaller(responseRouter, adminCtx);
				await expect(
					caller.getResponsesForPageInstance({
						checklistId: '00000000-0000-0000-0000-000000000001',
						claimId: '00000000-0000-0000-0000-000000000100',
						instanceId: '00000000-0000-0000-0000-000000000001',
					})
				).resolves.toEqual({});
			});

			it('should allow contributor with ownership', async () => {
				const userCtx: Context = {
					session: createMockSession({ id: 'user-123', role: config.ROLES.CONTRIBUTOR }),
					db,
				};

				// Mock requireOwnership check
				const mockSelect = vi.fn().mockReturnValue({
					where: vi.fn().mockReturnThis(),
					executeTakeFirstOrThrow: vi.fn().mockResolvedValue({
						created_by: 'user-123',
						assignee: 'user-123',
					}),
				});
				vi.spyOn(db, 'selectFrom').mockReturnValue({ select: mockSelect } as any);

				const mockGetResponsesForPageInstance =
					await import('@/api/controllers/responseController');
				vi.mocked(mockGetResponsesForPageInstance.getResponsesForPageInstance).mockResolvedValue(
					{}
				);

				const caller = createCaller(responseRouter, userCtx);
				await expect(
					caller.getResponsesForPageInstance({
						checklistId: '00000000-0000-0000-0000-000000000001',
						claimId: '00000000-0000-0000-0000-000000000100',
						instanceId: '00000000-0000-0000-0000-000000000001',
					})
				).resolves.toEqual({});
			});

			it('should reject contributor without ownership', async () => {
				const userCtx: Context = {
					session: createMockSession({ id: 'user-123', role: config.ROLES.CONTRIBUTOR }),
					db,
				};

				// Mock requireOwnership check (user is neither creator nor assignee)
				const mockSelect = vi.fn().mockReturnValue({
					where: vi.fn().mockReturnThis(),
					executeTakeFirstOrThrow: vi.fn().mockResolvedValue({
						created_by: 'other-user',
						assignee: 'another-user',
					}),
				});
				vi.spyOn(db, 'selectFrom').mockReturnValue({ select: mockSelect } as any);

				const caller = createCaller(responseRouter, userCtx);
				await expect(
					caller.getResponsesForPageInstance({
						checklistId: '00000000-0000-0000-0000-000000000001',
						claimId: '00000000-0000-0000-0000-000000000100',
						instanceId: '00000000-0000-0000-0000-000000000001',
					})
				).rejects.toThrow(TRPCError);
			});
		});

		describe('getResponseAuditLogs - Conditional Ownership', () => {
			it('should allow admin to get all audit logs', async () => {
				const adminCtx: Context = {
					session: createMockSession({ role: config.ROLES.ADMIN }),
					db,
				};

				const mockGetResponseAuditLogs = await import('@/api/controllers/responseController');
				vi.mocked(mockGetResponseAuditLogs.getResponseAuditLogs).mockResolvedValue({
					rows: [],
					count: 0,
				});

				const caller = createCaller(responseRouter, adminCtx);
				await expect(
					caller.getResponseAuditLogs({
						filters: {},
						limit: 50,
						offset: 0,
					})
				).resolves.toBeDefined();
			});

			it('should allow admin to get audit logs for specific claim', async () => {
				const adminCtx: Context = {
					session: createMockSession({ role: config.ROLES.ADMIN }),
					db,
				};

				const mockGetResponseAuditLogs = await import('@/api/controllers/responseController');
				vi.mocked(mockGetResponseAuditLogs.getResponseAuditLogs).mockResolvedValue({
					rows: [],
					count: 0,
				});

				const caller = createCaller(responseRouter, adminCtx);
				await expect(
					caller.getResponseAuditLogs({
						filters: {
							checklistId: '00000000-0000-0000-0000-000000000001',
							claimId: '00000000-0000-0000-0000-000000000100',
						},
						limit: 50,
						offset: 0,
					})
				).resolves.toBeDefined();
			});

			it('should reject contributor getting all audit logs', async () => {
				const userCtx: Context = {
					session: createMockSession({ id: 'user-123', role: config.ROLES.CONTRIBUTOR }),
					db,
				};

				const caller = createCaller(responseRouter, userCtx);
				await expect(
					caller.getResponseAuditLogs({
						filters: {},
						limit: 50,
						offset: 0,
					})
				).rejects.toThrow(TRPCError);
			});

			it('should allow contributor with ownership for specific claim logs', async () => {
				const userCtx: Context = {
					session: createMockSession({ id: 'user-123', role: config.ROLES.CONTRIBUTOR }),
					db,
				};

				// Mock requireOwnership check
				const mockSelect = vi.fn().mockReturnValue({
					where: vi.fn().mockReturnThis(),
					executeTakeFirstOrThrow: vi.fn().mockResolvedValue({
						created_by: 'user-123',
						assignee: 'other-user',
					}),
				});
				vi.spyOn(db, 'selectFrom').mockReturnValue({ select: mockSelect } as any);

				const mockGetResponseAuditLogs = await import('@/api/controllers/responseController');
				vi.mocked(mockGetResponseAuditLogs.getResponseAuditLogs).mockResolvedValue({
					rows: [],
					count: 0,
				});

				const caller = createCaller(responseRouter, userCtx);
				await expect(
					caller.getResponseAuditLogs({
						filters: {
							checklistId: '00000000-0000-0000-0000-000000000001',
							claimId: '00000000-0000-0000-0000-000000000100',
						},
						limit: 50,
						offset: 0,
					})
				).resolves.toBeDefined();
			});

			it('should reject contributor without ownership for specific claim logs', async () => {
				const userCtx: Context = {
					session: createMockSession({ id: 'user-123', role: config.ROLES.CONTRIBUTOR }),
					db,
				};

				// Mock requireOwnership check (user is neither creator nor assignee)
				const mockSelect = vi.fn().mockReturnValue({
					where: vi.fn().mockReturnThis(),
					executeTakeFirstOrThrow: vi.fn().mockResolvedValue({
						created_by: 'other-user',
						assignee: 'another-user',
					}),
				});
				vi.spyOn(db, 'selectFrom').mockReturnValue({ select: mockSelect } as any);

				const caller = createCaller(responseRouter, userCtx);
				await expect(
					caller.getResponseAuditLogs({
						filters: {
							checklistId: '00000000-0000-0000-0000-000000000001',
							claimId: '00000000-0000-0000-0000-000000000100',
						},
						limit: 50,
						offset: 0,
					})
				).rejects.toThrow(TRPCError);
			});
		});

		describe('getCommentsForPage - Ownership Required', () => {
			it('should allow admin to get comments for any page', async () => {
				const adminCtx: Context = {
					session: createMockSession({ role: config.ROLES.ADMIN }),
					db,
				};

				const mockGetCommentsForPage = await import('@/api/controllers/commentController');
				vi.mocked(mockGetCommentsForPage.getCommentsForPage).mockResolvedValue({});

				const caller = createCaller(commentRouter, adminCtx);
				await expect(
					caller.getCommentsForPage({
						checklistId: '00000000-0000-0000-0000-000000000001',
						claimId: '00000000-0000-0000-0000-000000000100',
						instanceId: '00000000-0000-0000-0000-000000000050',
					})
				).resolves.toBeDefined();
			});

			it('should allow contributor with ownership', async () => {
				const userCtx: Context = {
					session: createMockSession({ id: 'user-123', role: config.ROLES.CONTRIBUTOR }),
					db,
				};

				// Mock requireOwnership check
				const mockSelect = vi.fn().mockReturnValue({
					where: vi.fn().mockReturnThis(),
					executeTakeFirstOrThrow: vi.fn().mockResolvedValue({
						created_by: 'other-user',
						assignee: 'user-123',
					}),
				});
				vi.spyOn(db, 'selectFrom').mockReturnValue({ select: mockSelect } as any);

				const mockGetCommentsForPage = await import('@/api/controllers/commentController');
				vi.mocked(mockGetCommentsForPage.getCommentsForPage).mockResolvedValue({});

				const caller = createCaller(commentRouter, userCtx);
				await expect(
					caller.getCommentsForPage({
						checklistId: '00000000-0000-0000-0000-000000000001',
						claimId: '00000000-0000-0000-0000-000000000100',
						instanceId: '00000000-0000-0000-0000-000000000050',
					})
				).resolves.toBeDefined();
			});

			it('should reject contributor without ownership', async () => {
				const userCtx: Context = {
					session: createMockSession({ id: 'user-123', role: config.ROLES.CONTRIBUTOR }),
					db,
				};

				// Mock requireOwnership check (user is neither creator nor assignee)
				const mockSelect = vi.fn().mockReturnValue({
					where: vi.fn().mockReturnThis(),
					executeTakeFirstOrThrow: vi.fn().mockResolvedValue({
						created_by: 'other-user',
						assignee: 'another-user',
					}),
				});
				vi.spyOn(db, 'selectFrom').mockReturnValue({ select: mockSelect } as any);

				const caller = createCaller(commentRouter, userCtx);
				await expect(
					caller.getCommentsForPage({
						checklistId: '00000000-0000-0000-0000-000000000001',
						claimId: '00000000-0000-0000-0000-000000000100',
						instanceId: '00000000-0000-0000-0000-000000000050',
					})
				).rejects.toThrow(TRPCError);
			});
		});

		describe('getComments - Conditional Ownership', () => {
			it('should allow admin to query comments with any filters', async () => {
				const adminCtx: Context = {
					session: createMockSession({ role: config.ROLES.ADMIN }),
					db,
				};

				const mockGetComments = await import('@/api/controllers/commentController');
				vi.mocked(mockGetComments.getComments).mockResolvedValue({
					rows: [],
					count: 0,
				});

				const caller = createCaller(commentRouter, adminCtx);
				await expect(
					caller.getComments({
						filters: {
							claimId: '00000000-0000-0000-0000-000000000100',
							checklistId: '00000000-0000-0000-0000-000000000001',
						},
					})
				).resolves.toBeDefined();
			});

			it('should allow contributor with ownership for specific claim', async () => {
				const userCtx: Context = {
					session: createMockSession({ id: 'user-123', role: config.ROLES.CONTRIBUTOR }),
					db,
				};

				// Mock requireOwnership check
				const mockSelect = vi.fn().mockReturnValue({
					where: vi.fn().mockReturnThis(),
					executeTakeFirstOrThrow: vi.fn().mockResolvedValue({
						created_by: 'user-123',
						assignee: 'user-123',
					}),
				});
				vi.spyOn(db, 'selectFrom').mockReturnValue({ select: mockSelect } as any);

				const mockGetComments = await import('@/api/controllers/commentController');
				vi.mocked(mockGetComments.getComments).mockResolvedValue({
					rows: [],
					count: 0,
				});

				const caller = createCaller(commentRouter, userCtx);
				await expect(
					caller.getComments({
						filters: {
							claimId: '00000000-0000-0000-0000-000000000100',
							checklistId: '00000000-0000-0000-0000-000000000001',
						},
					})
				).resolves.toBeDefined();
			});

			it('should reject contributor without ownership for specific claim', async () => {
				const userCtx: Context = {
					session: createMockSession({ id: 'user-123', role: config.ROLES.CONTRIBUTOR }),
					db,
				};

				// Mock requireOwnership check (user is neither creator nor assignee)
				const mockSelect = vi.fn().mockReturnValue({
					where: vi.fn().mockReturnThis(),
					executeTakeFirstOrThrow: vi.fn().mockResolvedValue({
						created_by: 'other-user',
						assignee: 'another-user',
					}),
				});
				vi.spyOn(db, 'selectFrom').mockReturnValue({ select: mockSelect } as any);

				const caller = createCaller(commentRouter, userCtx);
				await expect(
					caller.getComments({
						filters: {
							claimId: '00000000-0000-0000-0000-000000000100',
							checklistId: '00000000-0000-0000-0000-000000000001',
						},
					})
				).rejects.toThrow(TRPCError);
			});
		});
	});

	/**
	 * Rule 5: Checklist-Claim Assignment Rules for Responses
	 * Users can only modify responses for checklist+claim combinations where they are the CURRENT assignee.
	 */
	describe('Rule 5: Response Assignment Rules', () => {
		describe('upsertQuestionResponses - Strict Assignment Required', () => {
			it('should allow admin to upsert responses for any claim', async () => {
				const adminCtx: Context = {
					session: createMockSession({ role: config.ROLES.ADMIN }),
					db,
				};

				const mockUpsertQuestionResponses = await import('@/api/controllers/responseController');
				vi.mocked(mockUpsertQuestionResponses.upsertQuestionResponses).mockResolvedValue({
					updatedInstanceId: '00000000-0000-0000-0000-000000000050',
					status: PageInstanceStatus.UNSTARTED,
					claimStatus: ClaimStatus.UNWORKED,
					visibleIds: ['00000000-0000-0000-0000-000000000050'],
				});

				const caller = createCaller(responseRouter, adminCtx);
				await expect(
					caller.upsertQuestionResponses({
						responses: [
							{
								checklist_id: '00000000-0000-0000-0000-000000000001',
								claim_id: '00000000-0000-0000-0000-000000000100',
								instance_id: '00000000-0000-0000-0000-000000000050',
								question_id: '00000000-0000-0000-0000-000000000010',
								response_text: 'Test response',
							},
						],
					})
				).resolves.toBeDefined();
			});

			it('should allow assignee to upsert responses', async () => {
				const userCtx: Context = {
					session: createMockSession({ id: 'user-123', role: config.ROLES.CONTRIBUTOR }),
					db,
				};

				// Mock requireAssigned check
				const mockSelect = vi.fn().mockReturnValue({
					where: vi.fn().mockReturnThis(),
					executeTakeFirstOrThrow: vi.fn().mockResolvedValue({
						assignee: 'user-123',
					}),
				});
				vi.spyOn(db, 'selectFrom').mockReturnValue({ select: mockSelect } as any);

				const mockUpsertQuestionResponses = await import('@/api/controllers/responseController');
				vi.mocked(mockUpsertQuestionResponses.upsertQuestionResponses).mockResolvedValue({
					updatedInstanceId: '00000000-0000-0000-0000-000000000050',
					status: PageInstanceStatus.UNSTARTED,
					claimStatus: ClaimStatus.UNWORKED,
					visibleIds: ['00000000-0000-0000-0000-000000000050'],
				});

				const caller = createCaller(responseRouter, userCtx);
				await expect(
					caller.upsertQuestionResponses({
						responses: [
							{
								checklist_id: '00000000-0000-0000-0000-000000000001',
								claim_id: '00000000-0000-0000-0000-000000000100',
								instance_id: '00000000-0000-0000-0000-000000000050',
								question_id: '00000000-0000-0000-0000-000000000010',
								response_text: 'Test response',
							},
						],
					})
				).resolves.toBeDefined();
			});

			it('should reject creator who is not assignee', async () => {
				const userCtx: Context = {
					session: createMockSession({ id: 'user-123', role: config.ROLES.CONTRIBUTOR }),
					db,
				};

				// Mock requireAssigned check (user is creator but not assignee)
				const mockSelect = vi.fn().mockReturnValue({
					where: vi.fn().mockReturnThis(),
					executeTakeFirstOrThrow: vi.fn().mockResolvedValue({
						assignee: 'other-user',
					}),
				});
				vi.spyOn(db, 'selectFrom').mockReturnValue({ select: mockSelect } as any);

				const caller = createCaller(responseRouter, userCtx);
				await expect(
					caller.upsertQuestionResponses({
						responses: [
							{
								checklist_id: '00000000-0000-0000-0000-000000000001',
								claim_id: '00000000-0000-0000-0000-000000000100',
								instance_id: '00000000-0000-0000-0000-000000000050',
								question_id: '00000000-0000-0000-0000-000000000010',
								response_text: 'Test response',
							},
						],
					})
				).rejects.toThrow(TRPCError);
			});

			it('should reject non-assigned contributor', async () => {
				const userCtx: Context = {
					session: createMockSession({ id: 'user-123', role: config.ROLES.CONTRIBUTOR }),
					db,
				};

				// Mock requireAssigned check (user is neither creator nor assignee)
				const mockSelect = vi.fn().mockReturnValue({
					where: vi.fn().mockReturnThis(),
					executeTakeFirstOrThrow: vi.fn().mockResolvedValue({
						assignee: 'another-user',
					}),
				});
				vi.spyOn(db, 'selectFrom').mockReturnValue({ select: mockSelect } as any);

				const caller = createCaller(responseRouter, userCtx);
				await expect(
					caller.upsertQuestionResponses({
						responses: [
							{
								checklist_id: '00000000-0000-0000-0000-000000000001',
								claim_id: '00000000-0000-0000-0000-000000000100',
								instance_id: '00000000-0000-0000-0000-000000000050',
								question_id: '00000000-0000-0000-0000-000000000010',
								response_text: 'Test response',
							},
						],
					})
				).rejects.toThrow(TRPCError);
			});
		});
	});

	/**
	 * Rule 6: Checklist-Claim Assignment Rules for Comments
	 * Users can comment on checklist+claim combinations where they are assignee OR created_by (ownership).
	 */
	describe('Rule 6: Comment Assignment Rules', () => {
		describe('createComment - Ownership Required', () => {
			it('should allow admin to create comment on any claim', async () => {
				const adminCtx: Context = {
					session: createMockSession({ role: config.ROLES.ADMIN }),
					db,
				};

				const mockCreateComment = await import('@/api/controllers/commentController');
				vi.mocked(mockCreateComment.createComment).mockResolvedValue({
					id: '00000000-0000-0000-0000-000000000001',
					checklist_id: '00000000-0000-0000-0000-000000000001',
					claim_id: '00000000-0000-0000-0000-000000000100',
					instance_id: '00000000-0000-0000-0000-000000000050',
					question_id: '00000000-0000-0000-0000-000000000010',
					body: 'Test comment',
					client_id: 'client-abc',
					created_by: 'user-123',
					created_at: new Date(),
					updated_at: new Date(),
				});

				const caller = createCaller(commentRouter, adminCtx);
				await expect(
					caller.createComment({
						checklistId: '00000000-0000-0000-0000-000000000001',
						claimId: '00000000-0000-0000-0000-000000000100',
						instanceId: '00000000-0000-0000-0000-000000000050',
						questionId: '00000000-0000-0000-0000-000000000010',
						body: 'Test comment',
					})
				).resolves.toBeDefined();
			});

			it('should allow creator to create comment', async () => {
				const userCtx: Context = {
					session: createMockSession({ id: 'user-123', role: config.ROLES.CONTRIBUTOR }),
					db,
				};

				// Mock requireOwnership check
				const mockSelect = vi.fn().mockReturnValue({
					where: vi.fn().mockReturnThis(),
					executeTakeFirstOrThrow: vi.fn().mockResolvedValue({
						created_by: 'user-123',
						assignee: 'other-user',
					}),
				});
				vi.spyOn(db, 'selectFrom').mockReturnValue({ select: mockSelect } as any);

				const mockCreateComment = await import('@/api/controllers/commentController');
				vi.mocked(mockCreateComment.createComment).mockResolvedValue({
					id: '00000000-0000-0000-0000-000000000001',
					checklist_id: '00000000-0000-0000-0000-000000000001',
					claim_id: '00000000-0000-0000-0000-000000000100',
					instance_id: '00000000-0000-0000-0000-000000000050',
					question_id: '00000000-0000-0000-0000-000000000010',
					body: 'Test comment',
					client_id: 'client-abc',
					created_by: 'user-123',
					created_at: new Date(),
					updated_at: new Date(),
				});

				const caller = createCaller(commentRouter, userCtx);
				await expect(
					caller.createComment({
						checklistId: '00000000-0000-0000-0000-000000000001',
						claimId: '00000000-0000-0000-0000-000000000100',
						instanceId: '00000000-0000-0000-0000-000000000050',
						questionId: '00000000-0000-0000-0000-000000000010',
						body: 'Test comment',
					})
				).resolves.toBeDefined();
			});

			it('should allow assignee to create comment', async () => {
				const userCtx: Context = {
					session: createMockSession({ id: 'user-123', role: config.ROLES.CONTRIBUTOR }),
					db,
				};

				// Mock requireOwnership check
				const mockSelect = vi.fn().mockReturnValue({
					where: vi.fn().mockReturnThis(),
					executeTakeFirstOrThrow: vi.fn().mockResolvedValue({
						created_by: 'other-user',
						assignee: 'user-123',
					}),
				});
				vi.spyOn(db, 'selectFrom').mockReturnValue({ select: mockSelect } as any);

				const mockCreateComment = await import('@/api/controllers/commentController');
				vi.mocked(mockCreateComment.createComment).mockResolvedValue({
					id: '00000000-0000-0000-0000-000000000001',
					checklist_id: '00000000-0000-0000-0000-000000000001',
					claim_id: '00000000-0000-0000-0000-000000000100',
					instance_id: '00000000-0000-0000-0000-000000000050',
					question_id: '00000000-0000-0000-0000-000000000010',
					body: 'Test comment',
					client_id: 'client-abc',
					created_by: 'user-123',
					created_at: new Date(),
					updated_at: new Date(),
				});

				const caller = createCaller(commentRouter, userCtx);
				await expect(
					caller.createComment({
						checklistId: '00000000-0000-0000-0000-000000000001',
						claimId: '00000000-0000-0000-0000-000000000100',
						instanceId: '00000000-0000-0000-0000-000000000050',
						questionId: '00000000-0000-0000-0000-000000000010',
						body: 'Test comment',
					})
				).resolves.toBeDefined();
			});

			it('should reject contributor without ownership', async () => {
				const userCtx: Context = {
					session: createMockSession({ id: 'user-123', role: config.ROLES.CONTRIBUTOR }),
					db,
				};

				// Mock requireOwnership check (user is neither creator nor assignee)
				const mockSelect = vi.fn().mockReturnValue({
					where: vi.fn().mockReturnThis(),
					executeTakeFirstOrThrow: vi.fn().mockResolvedValue({
						created_by: 'other-user',
						assignee: 'another-user',
					}),
				});
				vi.spyOn(db, 'selectFrom').mockReturnValue({ select: mockSelect } as any);

				const caller = createCaller(commentRouter, userCtx);
				await expect(
					caller.createComment({
						checklistId: '00000000-0000-0000-0000-000000000001',
						claimId: '00000000-0000-0000-0000-000000000100',
						instanceId: '00000000-0000-0000-0000-000000000050',
						questionId: '00000000-0000-0000-0000-000000000010',
						body: 'Test comment',
					})
				).rejects.toThrow(TRPCError);
			});
		});
	});

	/**
	 * Additional Router Authorization Tests
	 * Tests for other routers with admin-only operations and conditional authorization.
	 */
	describe('Additional Router Authorization', () => {
		describe('Admin-Only Template Operations', () => {
			describe('Answer Router', () => {
				it('should allow admin to create answer', async () => {
					const adminCtx: Context = {
						session: createMockSession({ role: config.ROLES.ADMIN }),
						db,
					};

					const mockCreateAnswer = await import('@/api/controllers/answerController');
					vi.mocked(mockCreateAnswer.createAnswer).mockResolvedValue({
						id: '00000000-0000-0000-0000-000000000001',
						question_id: '00000000-0000-0000-0000-000000000001',
						text: 'Test answer',
						position: 1,
						has_action: false,
						calls_instance_id: null,
						requires_additional_info: false,
						client_id: 'client-abc',
						created_at: new Date(),
						updated_at: new Date(),
					} as any);

					const caller = createCaller(answerRouter, adminCtx);
					await expect(
						caller.createAnswer({
							pageId: '00000000-0000-0000-0000-000000000001',
							questionId: '00000000-0000-0000-0000-000000000001',
							params: {
								text: 'Test answer',
								position: 1,
							},
						})
					).resolves.toBeDefined();
				});

				it('should reject contributor creating answer', async () => {
					const contributorCtx: Context = {
						session: createMockSession({ role: config.ROLES.CONTRIBUTOR }),
						db,
					};

					const caller = createCaller(answerRouter, contributorCtx);
					await expect(
						caller.createAnswer({
							pageId: '00000000-0000-0000-0000-000000000001',
							questionId: '00000000-0000-0000-0000-000000000001',
							params: {
								text: 'Test answer',
								position: 1,
							},
						})
					).rejects.toThrow(TRPCError);
				});
			});

			describe('Question Router', () => {
				it('should allow admin to create question', async () => {
					const adminCtx: Context = {
						session: createMockSession({ role: config.ROLES.ADMIN }),
						db,
					};

					const mockCreateQuestion = await import('@/api/controllers/questionController');
					vi.mocked(mockCreateQuestion.createQuestion).mockResolvedValue({
						id: '00000000-0000-0000-0000-000000000001',
						page_id: '00000000-0000-0000-0000-000000000001',
						text: 'Test question',
						position: 1,
						type: 'TEXT',
						client_id: 'client-abc',
						created_at: new Date(),
						updated_at: new Date(),
					} as any);

					const caller = createCaller(questionRouter, adminCtx);
					await expect(
						caller.createQuestion({
							pageId: '00000000-0000-0000-0000-000000000001',
							params: {
								text: 'Test question',
								position: 1,
								type: QuestionType.FREEFORM,
							},
						})
					).resolves.toBeDefined();
				});

				it('should reject contributor creating question', async () => {
					const contributorCtx: Context = {
						session: createMockSession({ role: config.ROLES.CONTRIBUTOR }),
						db,
					};

					const caller = createCaller(questionRouter, contributorCtx);
					await expect(
						caller.createQuestion({
							pageId: '00000000-0000-0000-0000-000000000001',
							params: {
								text: 'Test question',
								position: 1,
								type: 'TEXT',
							},
						})
					).rejects.toThrow(TRPCError);
				});

				it('should allow admin to get question stats', async () => {
					const adminCtx: Context = {
						session: createMockSession({ role: config.ROLES.ADMIN }),
						db,
					};

					const mockGetQuestionStats = await import('@/api/controllers/questionController');
					vi.mocked(mockGetQuestionStats.getQuestionStats).mockResolvedValue([]);

					const caller = createCaller(questionRouter, adminCtx);
					await expect(
						caller.getQuestionStats({
							pageId: '00000000-0000-0000-0000-000000000001',
							filters: {
								range: ['2025-01-01', '2025-12-31'],
							},
						})
					).resolves.toEqual([]);
				});

				it('should reject contributor getting question stats', async () => {
					const contributorCtx: Context = {
						session: createMockSession({ role: config.ROLES.CONTRIBUTOR }),
						db,
					};

					const caller = createCaller(questionRouter, contributorCtx);
					await expect(
						caller.getQuestionStats({ pageId: '00000000-0000-0000-0000-000000000001' })
					).rejects.toThrow(TRPCError);
				});
			});

			describe('Page Router', () => {
				it('should allow admin to create page', async () => {
					const adminCtx: Context = {
						session: createMockSession({ role: config.ROLES.ADMIN }),
						db,
					};

					const mockCreatePage = await import('@/api/controllers/pageController');
					vi.mocked(mockCreatePage.createPage).mockResolvedValue({
						id: '00000000-0000-0000-0000-000000000001',
						title: 'Test Page',
						instance_id: '00000000-0000-0000-0000-000000000001',
					});

					const caller = createCaller(pageRouter, adminCtx);
					await expect(
						caller.createPage({
							checklistId: '00000000-0000-0000-0000-000000000001',
							params: {
								title: 'Test Page',
								parentId: '00000000-0000-0000-0000-000000000000',
								position: 1,
							},
						})
					).resolves.toBeDefined();
				});

				it('should reject contributor creating page', async () => {
					const contributorCtx: Context = {
						session: createMockSession({ role: config.ROLES.CONTRIBUTOR }),
						db,
					};

					const caller = createCaller(pageRouter, contributorCtx);
					await expect(
						caller.createPage({
							checklistId: '00000000-0000-0000-0000-000000000001',
							params: {
								title: 'Test Page',
								position: 1,
							},
						})
					).rejects.toThrow(TRPCError);
				});

				it('should allow admin to create page instance', async () => {
					const adminCtx: Context = {
						session: createMockSession({ role: config.ROLES.ADMIN }),
						db,
					};

					const mockCreatePageInstance = await import('@/api/controllers/pageController');
					vi.mocked(mockCreatePageInstance.createPageInstance).mockResolvedValue({
						id: '00000000-0000-0000-0000-000000000001',
						page_id: '00000000-0000-0000-0000-000000000001',
						checklist_id: '00000000-0000-0000-0000-000000000001',
						parent_instance_id: null,
						position: 1,
						client_id: 'client-abc',
						created_by: 'user-123',
						created_at: new Date(),
						updated_at: new Date(),
						updated_by: null,
					});

					const caller = createCaller(pageRouter, adminCtx);
					await expect(
						caller.createPageInstance({
							checklistId: '00000000-0000-0000-0000-000000000001',
							pageId: '00000000-0000-0000-0000-000000000001',
							params: {
								parentId: '00000000-0000-0000-0000-000000000001',
								position: 1,
							},
						})
					).resolves.toBeDefined();
				});

				it('should reject contributor creating page instance', async () => {
					const contributorCtx: Context = {
						session: createMockSession({ role: config.ROLES.CONTRIBUTOR }),
						db,
					};

					const caller = createCaller(pageRouter, contributorCtx);
					await expect(
						caller.createPageInstance({
							checklistId: '00000000-0000-0000-0000-000000000001',
							pageId: '00000000-0000-0000-0000-000000000001',
							params: {
								parentId: '00000000-0000-0000-0000-000000000001',
								position: 1,
							},
						})
					).rejects.toThrow(TRPCError);
				});

				describe('getPageInstances - Conditional Admin Restriction', () => {
					it('should allow admin to get page instances without parentId', async () => {
						const adminCtx: Context = {
							session: createMockSession({ role: config.ROLES.ADMIN }),
							db,
						};

						const mockGetPageInstances = await import('@/api/controllers/pageController');
						vi.mocked(mockGetPageInstances.getPageInstances).mockResolvedValue([]);

						const caller = createCaller(pageRouter, adminCtx);
						await expect(
							caller.getPageInstances({
								checklistId: '00000000-0000-0000-0000-000000000001',
								claimId: '00000000-0000-0000-0000-000000000100',
							})
						).resolves.toEqual([]);
					});

					it('should allow super admin to get page instances without parentId', async () => {
						const superAdminCtx: Context = {
							session: createMockSession({ role: config.ROLES.SUPER_ADMIN }),
							db,
						};

						const mockGetPageInstances = await import('@/api/controllers/pageController');
						vi.mocked(mockGetPageInstances.getPageInstances).mockResolvedValue([]);

						const caller = createCaller(pageRouter, superAdminCtx);
						await expect(
							caller.getPageInstances({
								checklistId: '00000000-0000-0000-0000-000000000001',
								claimId: '00000000-0000-0000-0000-000000000100',
							})
						).resolves.toEqual([]);
					});

					it('should reject contributor getting page instances without parentId', async () => {
						const contributorCtx: Context = {
							session: createMockSession({ role: config.ROLES.CONTRIBUTOR }),
							db,
						};

						const caller = createCaller(pageRouter, contributorCtx);
						await expect(
							caller.getPageInstances({
								checklistId: '00000000-0000-0000-0000-000000000001',
								claimId: '00000000-0000-0000-0000-000000000100',
							})
						).rejects.toThrow(TRPCError);
						await expect(
							caller.getPageInstances({
								checklistId: '00000000-0000-0000-0000-000000000001',
								claimId: '00000000-0000-0000-0000-000000000100',
							})
						).rejects.toThrow('User must have one of: Admin, Super Admin');
					});

					it('should allow contributor to get page instances WITH parentId', async () => {
						const contributorCtx: Context = {
							session: createMockSession({ role: config.ROLES.CONTRIBUTOR }),
							db,
						};

						const mockGetPageInstances = await import('@/api/controllers/pageController');
						vi.mocked(mockGetPageInstances.getPageInstances).mockResolvedValue([]);

						const caller = createCaller(pageRouter, contributorCtx);
						await expect(
							caller.getPageInstances({
								checklistId: '00000000-0000-0000-0000-000000000001',
								claimId: '00000000-0000-0000-0000-000000000100',
								parentId: '00000000-0000-0000-0000-000000000005',
							})
						).resolves.toEqual([]);
					});

					it('should allow admin to get page instances WITH parentId', async () => {
						const adminCtx: Context = {
							session: createMockSession({ role: config.ROLES.ADMIN }),
							db,
						};

						const mockGetPageInstances = await import('@/api/controllers/pageController');
						vi.mocked(mockGetPageInstances.getPageInstances).mockResolvedValue([]);

						const caller = createCaller(pageRouter, adminCtx);
						await expect(
							caller.getPageInstances({
								checklistId: '00000000-0000-0000-0000-000000000001',
								claimId: '00000000-0000-0000-0000-000000000100',
								parentId: '00000000-0000-0000-0000-000000000005',
							})
						).resolves.toEqual([]);
					});
				});
			});

			describe('Feed Router', () => {
				it('should allow admin to get feeds', async () => {
					const adminCtx: Context = {
						session: createMockSession({ role: config.ROLES.ADMIN }),
						db,
					};

					const mockGetFeeds = await import('@/api/controllers/feedController');
					vi.mocked(mockGetFeeds.getFeeds).mockResolvedValue([]);

					const caller = createCaller(feedRouter, adminCtx);
					await expect(caller.getFeeds()).resolves.toEqual([]);
				});

				it('should reject contributor getting feeds', async () => {
					const contributorCtx: Context = {
						session: createMockSession({ role: config.ROLES.CONTRIBUTOR }),
						db,
					};

					const caller = createCaller(feedRouter, contributorCtx);
					await expect(caller.getFeeds()).rejects.toThrow(TRPCError);
				});
			});

			describe('Action Router', () => {
				it('should allow admin to get action stats', async () => {
					const adminCtx: Context = {
						session: createMockSession({ role: config.ROLES.ADMIN }),
						db,
					};

					const mockGetActionStats = await import('@/api/controllers/actionController');
					vi.mocked(mockGetActionStats.getActionStats).mockResolvedValue([]);

					const caller = createCaller(actionRouter, adminCtx);
					await expect(caller.getActionStats({})).resolves.toEqual([]);
				});

				it('should reject contributor getting action stats', async () => {
					const contributorCtx: Context = {
						session: createMockSession({ role: config.ROLES.CONTRIBUTOR }),
						db,
					};

					const caller = createCaller(actionRouter, contributorCtx);
					await expect(caller.getActionStats({})).rejects.toThrow(TRPCError);
				});
			});
		});

		describe('Checklist Router - Additional Authorization', () => {
			describe('updateChecklistClaim - Assignment Required', () => {
				it('should allow admin to update any checklist claim', async () => {
					const adminCtx: Context = {
						session: createMockSession({ role: config.ROLES.ADMIN }),
						db,
					};

					const mockModifyChecklistClaim = await import('@/api/controllers/checklistController');
					vi.mocked(mockModifyChecklistClaim.modifyChecklistClaim).mockResolvedValue(undefined);

					const caller = createCaller(checklistRouter, adminCtx);
					await expect(
						caller.updateChecklistClaim({
							checklistId: '00000000-0000-0000-0000-000000000001',
							claimId: '00000000-0000-0000-0000-000000000100',
							assignee: 'other-user',
						})
					).resolves.toBeUndefined();
				});

				it('should allow assignee to update their checklist claim', async () => {
					const userCtx: Context = {
						session: createMockSession({ id: 'user-123', role: config.ROLES.CONTRIBUTOR }),
						db,
					};

					// Mock requireAssigned check
					const mockSelect = vi.fn().mockReturnValue({
						where: vi.fn().mockReturnThis(),
						executeTakeFirstOrThrow: vi.fn().mockResolvedValue({
							assignee: 'user-123',
						}),
					});
					vi.spyOn(db, 'selectFrom').mockReturnValue({ select: mockSelect } as any);

					const mockModifyChecklistClaim = await import('@/api/controllers/checklistController');
					vi.mocked(mockModifyChecklistClaim.modifyChecklistClaim).mockResolvedValue(undefined);

					const caller = createCaller(checklistRouter, userCtx);
					await expect(
						caller.updateChecklistClaim({
							checklistId: '00000000-0000-0000-0000-000000000001',
							claimId: '00000000-0000-0000-0000-000000000100',
						})
					).resolves.toBeUndefined();
				});

				it('should reject creator who is not assignee', async () => {
					const userCtx: Context = {
						session: createMockSession({ id: 'user-123', role: config.ROLES.CONTRIBUTOR }),
						db,
					};

					// Mock requireAssigned check (user is creator but not assignee)
					const mockSelect = vi.fn().mockReturnValue({
						where: vi.fn().mockReturnThis(),
						executeTakeFirstOrThrow: vi.fn().mockResolvedValue({
							assignee: 'other-user',
						}),
					});
					vi.spyOn(db, 'selectFrom').mockReturnValue({ select: mockSelect } as any);

					const caller = createCaller(checklistRouter, userCtx);
					await expect(
						caller.updateChecklistClaim({
							checklistId: '00000000-0000-0000-0000-000000000001',
							claimId: '00000000-0000-0000-0000-000000000100',
						})
					).rejects.toThrow(TRPCError);
				});
			});

			describe('getChecklistClaimStats - Conditional Authorization', () => {
				it('should allow contributor to view their own stats', async () => {
					const userCtx: Context = {
						session: createMockSession({ id: 'user-123', role: config.ROLES.CONTRIBUTOR }),
						db,
					};

					const mockResult = {
						[ClaimStatus.SUBMITTED]: 0,
						[ClaimStatus.IN_PROGRESS]: 0,
						[ClaimStatus.BLOCKED]: 0,
						[ClaimStatus.UNWORKED]: 0,
					};
					const mockGetChecklistClaimStats = await import('@/api/controllers/checklistController');
					vi.mocked(mockGetChecklistClaimStats.getChecklistClaimStats).mockResolvedValue(
						mockResult
					);

					const caller = createCaller(checklistRouter, userCtx);
					await expect(
						caller.getChecklistClaimStats({
							users: ['user-123'],
						})
					).resolves.toEqual(mockResult);
				});

				it('should require admin to view other users stats', async () => {
					const contributorCtx: Context = {
						session: createMockSession({ id: 'user-123', role: config.ROLES.CONTRIBUTOR }),
						db,
					};

					const caller = createCaller(checklistRouter, contributorCtx);
					await expect(
						caller.getChecklistClaimStats({
							users: ['other-user'],
						})
					).rejects.toThrow(TRPCError);
				});

				it('should require admin to query by checklist', async () => {
					const contributorCtx: Context = {
						session: createMockSession({ id: 'user-123', role: config.ROLES.CONTRIBUTOR }),
						db,
					};

					const caller = createCaller(checklistRouter, contributorCtx);
					await expect(
						caller.getChecklistClaimStats({
							checklistId: '00000000-0000-0000-0000-000000000001',
							users: ['user-123'],
						})
					).rejects.toThrow(TRPCError);
				});

				it('should require admin to query multiple users', async () => {
					const contributorCtx: Context = {
						session: createMockSession({ id: 'user-123', role: config.ROLES.CONTRIBUTOR }),
						db,
					};

					const caller = createCaller(checklistRouter, contributorCtx);
					await expect(
						caller.getChecklistClaimStats({
							users: ['user-123', 'other-user'],
						})
					).rejects.toThrow(TRPCError);
				});
			});
		});

		describe('User Router - Additional Authorization', () => {
			describe('Admin-Only User Operations', () => {
				it('should allow admin to get inactive user count', async () => {
					const adminCtx: Context = {
						session: createMockSession({ role: config.ROLES.ADMIN }),
						db,
					};

					const mockGetInactiveUserCount = await import('@/api/controllers/userController');
					vi.mocked(mockGetInactiveUserCount.getInactiveUserCount).mockResolvedValue({ count: 5 });

					const caller = createCaller(userRouter, adminCtx);
					await expect(caller.getInactiveUserCount()).resolves.toEqual({ count: 5 });
				});

				it('should reject contributor getting inactive user count', async () => {
					const contributorCtx: Context = {
						session: createMockSession({ role: config.ROLES.CONTRIBUTOR }),
						db,
					};

					const caller = createCaller(userRouter, contributorCtx);
					await expect(caller.getInactiveUserCount()).rejects.toThrow(TRPCError);
				});

				it('should allow admin to delete user', async () => {
					const adminCtx: Context = {
						session: createMockSession({ role: config.ROLES.ADMIN }),
						db,
					};

					const mockDeleteUser = await import('@/api/controllers/userController');
					vi.mocked(mockDeleteUser.deleteUser).mockResolvedValue(undefined);

					const caller = createCaller(userRouter, adminCtx);
					await expect(caller.deleteUser({ id: 'user-456' })).resolves.toBeUndefined();
				});

				it('should reject contributor deleting user', async () => {
					const contributorCtx: Context = {
						session: createMockSession({ role: config.ROLES.CONTRIBUTOR }),
						db,
					};

					const caller = createCaller(userRouter, contributorCtx);
					await expect(caller.deleteUser({ id: 'user-456' })).rejects.toThrow(TRPCError);
				});
			});

			describe('getUserCount - Client Aliasing', () => {
				it('should allow admin to get user count for own client', async () => {
					const adminCtx: Context = {
						session: createMockSession({ role: config.ROLES.ADMIN }),
						db,
					};

					const mockGetUserCount = await import('@/api/controllers/userController');
					vi.mocked(mockGetUserCount.getUserCount).mockResolvedValue({
						total: 25,
						active: 20,
						inactive: 5,
					});

					const caller = createCaller(userRouter, adminCtx);
					await expect(caller.getUserCount({})).resolves.toEqual({
						total: 25,
						active: 20,
						inactive: 5,
					});
				});

				it('should require super admin for client aliasing', async () => {
					const adminCtx: Context = {
						session: createMockSession({ role: config.ROLES.ADMIN }),
						db,
					};

					const caller = createCaller(userRouter, adminCtx);
					await expect(caller.getUserCount({ clientId: 'other-client' })).rejects.toThrow(
						TRPCError
					);
					await expect(caller.getUserCount({ clientId: 'other-client' })).rejects.toThrow(
						'User must have one of: Super Admin'
					);
				});

				it('should allow super admin for client aliasing', async () => {
					const superAdminCtx: Context = {
						session: createMockSession({ role: config.ROLES.SUPER_ADMIN }),
						db,
					};

					const mockGetUserCount = await import('@/api/controllers/userController');
					vi.mocked(mockGetUserCount.getUserCount).mockResolvedValue({
						total: 15,
						active: 12,
						inactive: 3,
					});

					const caller = createCaller(userRouter, superAdminCtx);
					await expect(caller.getUserCount({ clientId: 'other-client' })).resolves.toEqual({
						total: 15,
						active: 12,
						inactive: 3,
					});
				});
			});
		});

		describe('Claim Router - Additional Authorization', () => {
			describe('Admin-Only Claim Operations', () => {
				it('should allow admin to assign claim', async () => {
					const adminCtx: Context = {
						session: createMockSession({ role: config.ROLES.ADMIN }),
						db,
					};

					const mockAssignClaim = await import('@/api/controllers/claimController');
					vi.mocked(mockAssignClaim.assignClaim).mockResolvedValue({
						insertId: BigInt(1),
						numInsertedOrUpdatedRows: BigInt(1),
					});

					const caller = createCaller(claimRouter, adminCtx);
					await expect(
						caller.assignClaim({
							checklistId: '00000000-0000-0000-0000-000000000001',
							claimId: '00000000-0000-0000-0000-000000000100',
							assignee: 'user-456',
						})
					).resolves.toBeDefined();
				});

				it('should reject contributor assigning claim', async () => {
					const contributorCtx: Context = {
						session: createMockSession({ role: config.ROLES.CONTRIBUTOR }),
						db,
					};

					const caller = createCaller(claimRouter, contributorCtx);
					await expect(
						caller.assignClaim({
							checklistId: '00000000-0000-0000-0000-000000000001',
							claimId: '00000000-0000-0000-0000-000000000100',
							assignee: 'user-456',
						})
					).rejects.toThrow(TRPCError);
				});

				it('should allow admin to get next claim to assign', async () => {
					const adminCtx: Context = {
						session: createMockSession({ role: config.ROLES.ADMIN }),
						db,
					};

					const mockGetNextClaimToAssign = await import('@/api/controllers/claimController');
					vi.mocked(mockGetNextClaimToAssign.getNextClaimToAssign).mockResolvedValue({
						claim: null,
						total: 0,
					});

					const caller = createCaller(claimRouter, adminCtx);
					await expect(
						caller.getNextClaimToAssign({ feedId: '00000000-0000-0000-0000-000000000001' })
					).resolves.toEqual({ claim: null, total: 0 });
				});

				it('should reject contributor getting next claim to assign', async () => {
					const contributorCtx: Context = {
						session: createMockSession({ role: config.ROLES.CONTRIBUTOR }),
						db,
					};

					const caller = createCaller(claimRouter, contributorCtx);
					await expect(
						caller.getNextClaimToAssign({ feedId: '00000000-0000-0000-0000-000000000001' })
					).rejects.toThrow(TRPCError);
				});
			});

			describe('updateClaim - Field-Level Authorization', () => {
				it('should allow admin to update all claim fields including restricted fields', async () => {
					const adminCtx: Context = {
						session: createMockSession({ role: config.ROLES.ADMIN }),
						db,
					};

					const mockClaimController = await import('@/api/controllers/claimController');
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					vi.mocked(mockClaimController.updateClaim).mockResolvedValue({} as any);

					const caller = createCaller(claimRouter, adminCtx);
					await expect(
						caller.updateClaim({
							claimId: '00000000-0000-0000-0000-000000000001',
							claim_number: 'NEW-001',
							recovery_status: 'in_progress',
							substatus: 'under_review',
							insured: 'Test Insured',
						})
					).resolves.toBeDefined();
				});

				it('should allow contributor to update non-restricted claim fields', async () => {
					const contributorCtx: Context = {
						session: createMockSession({ role: config.ROLES.CONTRIBUTOR }),
						db,
					};

					const mockClaimController = await import('@/api/controllers/claimController');
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					vi.mocked(mockClaimController.updateClaim).mockResolvedValue({} as any);

					const caller = createCaller(claimRouter, contributorCtx);
					await expect(
						caller.updateClaim({
							claimId: '00000000-0000-0000-0000-000000000001',
							insured: 'Updated Insured',
							client: 'Updated Client',
							client_adjuster: 'Updated Adjuster',
						})
					).resolves.toBeDefined();
				});

				it('should reject contributor updating claim_number', async () => {
					const contributorCtx: Context = {
						session: createMockSession({ role: config.ROLES.CONTRIBUTOR }),
						db,
					};

					const caller = createCaller(claimRouter, contributorCtx);
					await expect(
						caller.updateClaim({
							claimId: '00000000-0000-0000-0000-000000000001',
							claim_number: 'CHANGED-001',
						})
					).rejects.toThrow('Only admins can update claim_number, recovery_status, or substatus');
				});

				it('should reject contributor updating recovery_status', async () => {
					const contributorCtx: Context = {
						session: createMockSession({ role: config.ROLES.CONTRIBUTOR }),
						db,
					};

					const caller = createCaller(claimRouter, contributorCtx);
					await expect(
						caller.updateClaim({
							claimId: '00000000-0000-0000-0000-000000000001',
							recovery_status: 'in_progress',
						})
					).rejects.toThrow('Only admins can update claim_number, recovery_status, or substatus');
				});

				it('should reject contributor updating substatus', async () => {
					const contributorCtx: Context = {
						session: createMockSession({ role: config.ROLES.CONTRIBUTOR }),
						db,
					};

					const caller = createCaller(claimRouter, contributorCtx);
					await expect(
						caller.updateClaim({
							claimId: '00000000-0000-0000-0000-000000000001',
							substatus: 'under_review',
						})
					).rejects.toThrow('Only admins can update claim_number, recovery_status, or substatus');
				});

				it('should reject contributor updating mix of restricted and non-restricted fields', async () => {
					const contributorCtx: Context = {
						session: createMockSession({ role: config.ROLES.CONTRIBUTOR }),
						db,
					};

					const caller = createCaller(claimRouter, contributorCtx);
					await expect(
						caller.updateClaim({
							claimId: '00000000-0000-0000-0000-000000000001',
							insured: 'Updated Insured', // allowed
							claim_number: 'CHANGED-001', // restricted
						})
					).rejects.toThrow('Only admins can update claim_number, recovery_status, or substatus');
				});
			});
		});

		/**
		 * Party Router Authorization Tests
		 * Tests that contributors can create/update parties but cannot archive/restore them.
		 */
		describe('Party Router Authorization', () => {
			describe('Party CRUD - Contributor Access', () => {
				it('should allow contributor to create party', async () => {
					const contributorCtx: Context = {
						session: createMockSession({ role: config.ROLES.CONTRIBUTOR }),
						db,
					};

					const mockPartyController = await import('@/api/controllers/partyController');
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					vi.mocked(mockPartyController.createParty).mockResolvedValue({} as any);

					const caller = createCaller(partyRouter, contributorCtx);
					await expect(
						caller.createParty({
							name: 'Test Party',
							party_type: 'entity',
						})
					).resolves.toBeDefined();
				});

				it('should allow admin to create party', async () => {
					const adminCtx: Context = {
						session: createMockSession({ role: config.ROLES.ADMIN }),
						db,
					};

					const mockPartyController = await import('@/api/controllers/partyController');
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					vi.mocked(mockPartyController.createParty).mockResolvedValue({} as any);

					const caller = createCaller(partyRouter, adminCtx);
					await expect(
						caller.createParty({
							name: 'Test Party',
							party_type: 'entity',
						})
					).resolves.toBeDefined();
				});

				it('should allow contributor to update party', async () => {
					const contributorCtx: Context = {
						session: createMockSession({ role: config.ROLES.CONTRIBUTOR }),
						db,
					};

					const mockPartyController = await import('@/api/controllers/partyController');
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					vi.mocked(mockPartyController.updateParty).mockResolvedValue({} as any);

					const caller = createCaller(partyRouter, contributorCtx);
					await expect(
						caller.updateParty({
							id: '00000000-0000-0000-0000-000000000001',
							params: { name: 'Updated Party' },
						})
					).resolves.toBeDefined();
				});

				it('should reject contributor archiving party', async () => {
					const contributorCtx: Context = {
						session: createMockSession({ role: config.ROLES.CONTRIBUTOR }),
						db,
					};

					const caller = createCaller(partyRouter, contributorCtx);
					await expect(
						caller.archiveParty({ id: '00000000-0000-0000-0000-000000000001' })
					).rejects.toThrow(TRPCError);
				});

				it('should allow admin to archive party', async () => {
					const adminCtx: Context = {
						session: createMockSession({ role: config.ROLES.ADMIN }),
						db,
					};

					const mockPartyController = await import('@/api/controllers/partyController');
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					vi.mocked(mockPartyController.archiveParty).mockResolvedValue({} as any);

					const caller = createCaller(partyRouter, adminCtx);
					await expect(
						caller.archiveParty({ id: '00000000-0000-0000-0000-000000000001' })
					).resolves.toBeDefined();
				});

				it('should reject contributor restoring party', async () => {
					const contributorCtx: Context = {
						session: createMockSession({ role: config.ROLES.CONTRIBUTOR }),
						db,
					};

					const caller = createCaller(partyRouter, contributorCtx);
					await expect(
						caller.restoreParty({ id: '00000000-0000-0000-0000-000000000001' })
					).rejects.toThrow(TRPCError);
				});

				it('should allow admin to restore party', async () => {
					const adminCtx: Context = {
						session: createMockSession({ role: config.ROLES.ADMIN }),
						db,
					};

					const mockPartyController = await import('@/api/controllers/partyController');
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					vi.mocked(mockPartyController.restoreParty).mockResolvedValue({} as any);

					const caller = createCaller(partyRouter, adminCtx);
					await expect(
						caller.restoreParty({ id: '00000000-0000-0000-0000-000000000001' })
					).resolves.toBeDefined();
				});
			});

			describe('Party Address CRUD - Contributor Access', () => {
				it('should allow contributor to create party address', async () => {
					const contributorCtx: Context = {
						session: createMockSession({ role: config.ROLES.CONTRIBUTOR }),
						db,
					};

					const mockPartyController = await import('@/api/controllers/partyController');
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					vi.mocked(mockPartyController.createPartyAddress).mockResolvedValue({} as any);

					const caller = createCaller(partyRouter, contributorCtx);
					await expect(
						caller.createPartyAddress({
							party_id: '00000000-0000-0000-0000-000000000001',
							name: 'Test Address',
						})
					).resolves.toBeDefined();
				});

				it('should allow contributor to update party address', async () => {
					const contributorCtx: Context = {
						session: createMockSession({ role: config.ROLES.CONTRIBUTOR }),
						db,
					};

					const mockPartyController = await import('@/api/controllers/partyController');
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					vi.mocked(mockPartyController.updatePartyAddress).mockResolvedValue({} as any);

					const caller = createCaller(partyRouter, contributorCtx);
					await expect(
						caller.updatePartyAddress({
							id: '00000000-0000-0000-0000-000000000001',
							params: { name: 'Updated Address' },
						})
					).resolves.toBeDefined();
				});

				it('should reject contributor archiving party address', async () => {
					const contributorCtx: Context = {
						session: createMockSession({ role: config.ROLES.CONTRIBUTOR }),
						db,
					};

					const caller = createCaller(partyRouter, contributorCtx);
					await expect(
						caller.archivePartyAddress({ id: '00000000-0000-0000-0000-000000000001' })
					).rejects.toThrow(TRPCError);
				});

				it('should allow admin to archive party address', async () => {
					const adminCtx: Context = {
						session: createMockSession({ role: config.ROLES.ADMIN }),
						db,
					};

					const mockPartyController = await import('@/api/controllers/partyController');
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					vi.mocked(mockPartyController.archivePartyAddress).mockResolvedValue({} as any);

					const caller = createCaller(partyRouter, adminCtx);
					await expect(
						caller.archivePartyAddress({ id: '00000000-0000-0000-0000-000000000001' })
					).resolves.toBeDefined();
				});

				it('should reject contributor restoring party address', async () => {
					const contributorCtx: Context = {
						session: createMockSession({ role: config.ROLES.CONTRIBUTOR }),
						db,
					};

					const caller = createCaller(partyRouter, contributorCtx);
					await expect(
						caller.restorePartyAddress({ id: '00000000-0000-0000-0000-000000000001' })
					).rejects.toThrow(TRPCError);
				});
			});

			describe('Party Representative CRUD - Contributor Access', () => {
				it('should allow contributor to create party representative', async () => {
					const contributorCtx: Context = {
						session: createMockSession({ role: config.ROLES.CONTRIBUTOR }),
						db,
					};

					const mockPartyController = await import('@/api/controllers/partyController');
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					vi.mocked(mockPartyController.createPartyRepresentative).mockResolvedValue({} as any);

					const caller = createCaller(partyRouter, contributorCtx);
					await expect(
						caller.createPartyRepresentative({
							party_id: '00000000-0000-0000-0000-000000000001',
							first_name: 'John',
							last_name: 'Doe',
							email: 'john@example.com',
						})
					).resolves.toBeDefined();
				});

				it('should allow contributor to update party representative', async () => {
					const contributorCtx: Context = {
						session: createMockSession({ role: config.ROLES.CONTRIBUTOR }),
						db,
					};

					const mockPartyController = await import('@/api/controllers/partyController');
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					vi.mocked(mockPartyController.updatePartyRepresentative).mockResolvedValue({} as any);

					const caller = createCaller(partyRouter, contributorCtx);
					await expect(
						caller.updatePartyRepresentative({
							id: '00000000-0000-0000-0000-000000000001',
							params: { first_name: 'Jane' },
						})
					).resolves.toBeDefined();
				});

				it('should reject contributor archiving party representative', async () => {
					const contributorCtx: Context = {
						session: createMockSession({ role: config.ROLES.CONTRIBUTOR }),
						db,
					};

					const caller = createCaller(partyRouter, contributorCtx);
					await expect(
						caller.archivePartyRepresentative({ id: '00000000-0000-0000-0000-000000000001' })
					).rejects.toThrow(TRPCError);
				});

				it('should allow admin to archive party representative', async () => {
					const adminCtx: Context = {
						session: createMockSession({ role: config.ROLES.ADMIN }),
						db,
					};

					const mockPartyController = await import('@/api/controllers/partyController');
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					vi.mocked(mockPartyController.archivePartyRepresentative).mockResolvedValue({} as any);

					const caller = createCaller(partyRouter, adminCtx);
					await expect(
						caller.archivePartyRepresentative({ id: '00000000-0000-0000-0000-000000000001' })
					).resolves.toBeDefined();
				});

				it('should reject contributor restoring party representative', async () => {
					const contributorCtx: Context = {
						session: createMockSession({ role: config.ROLES.CONTRIBUTOR }),
						db,
					};

					const caller = createCaller(partyRouter, contributorCtx);
					await expect(
						caller.restorePartyRepresentative({ id: '00000000-0000-0000-0000-000000000001' })
					).rejects.toThrow(TRPCError);
				});
			});

			describe('Claim Party Linking - Admin Only', () => {
				it('should reject contributor linking party to claim', async () => {
					const contributorCtx: Context = {
						session: createMockSession({ role: config.ROLES.CONTRIBUTOR }),
						db,
					};

					const caller = createCaller(partyRouter, contributorCtx);
					await expect(
						caller.linkPartyToClaim({
							claim_id: '00000000-0000-0000-0000-000000000100',
							party_id: '00000000-0000-0000-0000-000000000001',
							role: 'Insured',
						})
					).rejects.toThrow(TRPCError);
				});

				it('should allow admin to link party to claim', async () => {
					const adminCtx: Context = {
						session: createMockSession({ role: config.ROLES.ADMIN }),
						db,
					};

					const mockPartyController = await import('@/api/controllers/partyController');
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					vi.mocked(mockPartyController.linkPartyToClaim).mockResolvedValue({} as any);

					const caller = createCaller(partyRouter, adminCtx);
					await expect(
						caller.linkPartyToClaim({
							claim_id: '00000000-0000-0000-0000-000000000100',
							party_id: '00000000-0000-0000-0000-000000000001',
							role: ['Insured'],
						})
					).resolves.toBeDefined();
				});

				it('should reject contributor unlinking party from claim', async () => {
					const contributorCtx: Context = {
						session: createMockSession({ role: config.ROLES.CONTRIBUTOR }),
						db,
					};

					const caller = createCaller(partyRouter, contributorCtx);
					await expect(
						caller.archiveClaimParty({ id: '00000000-0000-0000-0000-000000000001' })
					).rejects.toThrow(TRPCError);
				});

				it('should allow admin to unlink party from claim', async () => {
					const adminCtx: Context = {
						session: createMockSession({ role: config.ROLES.ADMIN }),
						db,
					};

					const mockPartyController = await import('@/api/controllers/partyController');
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					vi.mocked(mockPartyController.archiveClaimParty).mockResolvedValue({} as any);

					const caller = createCaller(partyRouter, adminCtx);
					await expect(
						caller.archiveClaimParty({ id: '00000000-0000-0000-0000-000000000001' })
					).resolves.toBeDefined();
				});
			});

			describe('Party Read Operations - Contributor Access', () => {
				it('should allow contributor to get parties', async () => {
					const contributorCtx: Context = {
						session: createMockSession({ role: config.ROLES.CONTRIBUTOR }),
						db,
					};

					const mockPartyController = await import('@/api/controllers/partyController');
					vi.mocked(mockPartyController.getParties).mockResolvedValue({
						rows: [],
						count: 0,
					});

					const caller = createCaller(partyRouter, contributorCtx);
					await expect(caller.getParties({})).resolves.toBeDefined();
				});

				it('should allow contributor to search parties', async () => {
					const contributorCtx: Context = {
						session: createMockSession({ role: config.ROLES.CONTRIBUTOR }),
						db,
					};

					const mockPartyController = await import('@/api/controllers/partyController');
					vi.mocked(mockPartyController.searchParties).mockResolvedValue([]);

					const caller = createCaller(partyRouter, contributorCtx);
					await expect(caller.searchParties({ searchTerm: 'test' })).resolves.toEqual([]);
				});

				it('should allow contributor to get party offices', async () => {
					const contributorCtx: Context = {
						session: createMockSession({ role: config.ROLES.CONTRIBUTOR }),
						db,
					};

					const mockPartyController = await import('@/api/controllers/partyController');
					vi.mocked(mockPartyController.getAllPartyAddresses).mockResolvedValue({
						rows: [],
						count: 0,
					});

					const caller = createCaller(partyRouter, contributorCtx);
					await expect(caller.getAllPartyOffices({})).resolves.toBeDefined();
				});

				it('should allow contributor to get party representatives', async () => {
					const contributorCtx: Context = {
						session: createMockSession({ role: config.ROLES.CONTRIBUTOR }),
						db,
					};

					const mockPartyController = await import('@/api/controllers/partyController');
					vi.mocked(mockPartyController.getAllPartyRepresentatives).mockResolvedValue({
						rows: [],
						count: 0,
					});

					const caller = createCaller(partyRouter, contributorCtx);
					await expect(caller.getAllPartyRepresentatives({})).resolves.toBeDefined();
				});
			});
		});

		/**
		 * Statute Router Authorization Tests
		 *
		 * The statute router provides access to statute of limitations rules.
		 * READ operations are available to all authenticated users (global reference data).
		 * WRITE operations (updateStatuteRule) are admin-only.
		 */
		describe('Statute Router', () => {
			describe('updateStatuteRule - Admin Only', () => {
				it('should allow admin to update statute rule', async () => {
					const adminCtx: Context = {
						session: createMockSession({ role: config.ROLES.ADMIN }),
						db,
					};

					const mockStatuteController = await import('@/api/controllers/statuteController');
					vi.mocked(mockStatuteController.updateStatuteRule).mockResolvedValue({
						id: 1,
						state_code: 'CA',
						rules: { personal_injury: { default_years: 2, rules: [] } },
						negligence_type: 'pure_comparative',
						negligence_bar_percent: null,
						negligence_notes: null,
						updated_at: new Date('2025-01-01'),
						updated_by: 'admin-user',
					});

					const caller = createCaller(statuteRouter, adminCtx);
					await expect(
						caller.updateStatuteRule({
							stateCode: 'CA',
							rules: { personal_injury: { default_years: 2, rules: [] } },
						})
					).resolves.toBeDefined();
				});

				it('should allow super admin to update statute rule', async () => {
					const superAdminCtx: Context = {
						session: createMockSession({ role: config.ROLES.SUPER_ADMIN }),
						db,
					};

					const mockStatuteController = await import('@/api/controllers/statuteController');
					vi.mocked(mockStatuteController.updateStatuteRule).mockResolvedValue({
						id: 2,
						state_code: 'TX',
						rules: { personal_injury: { default_years: 2, rules: [] } },
						negligence_type: 'modified_comparative',
						negligence_bar_percent: 51,
						negligence_notes: null,
						updated_at: new Date('2025-01-01'),
						updated_by: 'super-admin-user',
					});

					const caller = createCaller(statuteRouter, superAdminCtx);
					await expect(
						caller.updateStatuteRule({
							stateCode: 'TX',
							rules: { personal_injury: { default_years: 2, rules: [] } },
						})
					).resolves.toBeDefined();
				});

				it('should reject contributor from updating statute rule', async () => {
					const contributorCtx: Context = {
						session: createMockSession({ role: config.ROLES.CONTRIBUTOR }),
						db,
					};

					const caller = createCaller(statuteRouter, contributorCtx);
					await expect(
						caller.updateStatuteRule({
							stateCode: 'CA',
							rules: { personal_injury: { default_years: 2, rules: [] } },
						})
					).rejects.toThrow(TRPCError);
				});
			});

			describe('Read Operations - All Authenticated Users', () => {
				it('should allow contributor to get statute rules', async () => {
					const contributorCtx: Context = {
						session: createMockSession({ role: config.ROLES.CONTRIBUTOR }),
						db,
					};

					const mockStatuteController = await import('@/api/controllers/statuteController');
					vi.mocked(mockStatuteController.getStatuteRules).mockResolvedValue([]);

					const caller = createCaller(statuteRouter, contributorCtx);
					await expect(caller.getStatuteRules({})).resolves.toEqual([]);
				});

				it('should allow contributor to get single statute rule', async () => {
					const contributorCtx: Context = {
						session: createMockSession({ role: config.ROLES.CONTRIBUTOR }),
						db,
					};

					const mockStatuteController = await import('@/api/controllers/statuteController');
					vi.mocked(mockStatuteController.getStatuteRule).mockResolvedValue({
						id: 1,
						state_code: 'CA',
						rules: {},
						negligence_type: null,
						negligence_bar_percent: null,
						negligence_notes: null,
						created_at: new Date('2025-01-01'),
						created_by: null,
						updated_at: null,
						updated_by: null,
					});

					const caller = createCaller(statuteRouter, contributorCtx);
					await expect(caller.getStatuteRule({ stateCode: 'CA' })).resolves.toBeDefined();
				});

				it('should allow contributor to calculate statute limit', async () => {
					const contributorCtx: Context = {
						session: createMockSession({ role: config.ROLES.CONTRIBUTOR }),
						db,
					};

					const mockStatuteController = await import('@/api/controllers/statuteController');
					vi.mocked(mockStatuteController.calculateStatuteLimit).mockResolvedValue({
						years: 2,
						stateCode: 'CA',
						tortType: 'personal_injury',
						lob: undefined,
						dateOfLoss: '2024-01-01',
					});

					const caller = createCaller(statuteRouter, contributorCtx);
					await expect(
						caller.calculateStatuteLimit({
							stateCode: 'CA',
							tortType: 'personal_injury',
							dateOfLoss: '2024-01-01',
						})
					).resolves.toBeDefined();
				});
			});
		});
	});
});
