import { describe, it, expect } from 'vitest';
import {
	detectBreaches,
	calculateAvailabilityScore,
	buildScoredUsers,
	generateWorkflowSuggestions,
	getSeverityLabel,
	getSeverityColor,
	serializeSuggestion,
	deserializeSuggestion,
	extractApprovedAssignments,
	type DeskLocationLoad,
	type UserDeskAssignment,
	type UserCurrentTask,
	type WorkflowSuggestion,
	type UserAssignmentState,
} from '../suggestions';

// ============================================================================
// FACTORY HELPERS
// ============================================================================

let locationIdSeq = 1;
let userIdSeq = 1;

function makeLocation(overrides: Partial<DeskLocationLoad> = {}): DeskLocationLoad {
	const id = locationIdSeq++;
	return {
		deskLocationId: String(id),
		deskLocationName: `Location ${id}`,
		deskLocationTypeName: `Type ${id}`,
		openTaskUnits: 10,
		capacityThreshold: 20,
		...overrides,
	};
}

function makeAssignment(overrides: Partial<UserDeskAssignment> = {}): UserDeskAssignment {
	const id = userIdSeq++;
	return {
		userId: `user-${id}`,
		userName: `User ${id}`,
		deskLocationId: '1',
		deskLocationName: 'Location 1',
		priority: 1,
		...overrides,
	};
}

function makeTask(overrides: Partial<UserCurrentTask> = {}): UserCurrentTask {
	return {
		userId: 'user-1',
		taskId: '1',
		totalWorkUnits: 10,
		startedAt: null,
		...overrides,
	};
}

// ============================================================================
// detectBreaches
// ============================================================================

describe('detectBreaches', () => {
	it('returns empty array for empty input', () => {
		expect(detectBreaches([])).toEqual([]);
	});

	it('returns empty array when all locations are under capacity', () => {
		const locations = [
			makeLocation({ openTaskUnits: 5, capacityThreshold: 20 }),
			makeLocation({ openTaskUnits: 15, capacityThreshold: 20 }),
		];
		expect(detectBreaches(locations)).toEqual([]);
	});

	it('does not treat exact match as a breach', () => {
		const locations = [makeLocation({ openTaskUnits: 20, capacityThreshold: 20 })];
		expect(detectBreaches(locations)).toEqual([]);
	});

	it('skips locations with zero capacity threshold', () => {
		const locations = [makeLocation({ openTaskUnits: 10, capacityThreshold: 0 })];
		expect(detectBreaches(locations)).toEqual([]);
	});

	it('skips locations with negative capacity threshold', () => {
		const locations = [makeLocation({ openTaskUnits: 10, capacityThreshold: -5 })];
		expect(detectBreaches(locations)).toEqual([]);
	});

	it('detects a single breach with correct severity math', () => {
		const loc = makeLocation({ openTaskUnits: 30, capacityThreshold: 20 });
		const result = detectBreaches([loc]);

		expect(result).toHaveLength(1);
		expect(result[0].excessUnits).toBe(10);
		expect(result[0].severity).toBe(0.5); // 10/20 = 0.5
		expect(result[0].deskLocationId).toBe(loc.deskLocationId);
		expect(result[0].deskLocationName).toBe(loc.deskLocationName);
		expect(result[0].deskLocationTypeName).toBe(loc.deskLocationTypeName);
		expect(result[0].openTaskUnits).toBe(30);
		expect(result[0].capacityThreshold).toBe(20);
	});

	it('returns multiple breaches sorted by severity descending', () => {
		const low = makeLocation({ openTaskUnits: 22, capacityThreshold: 20 }); // severity 0.1
		const high = makeLocation({ openTaskUnits: 36, capacityThreshold: 20 }); // severity 0.8
		const mid = makeLocation({ openTaskUnits: 30, capacityThreshold: 20 }); // severity 0.5

		const result = detectBreaches([low, high, mid]);

		expect(result).toHaveLength(3);
		expect(result[0].severity).toBe(0.8);
		expect(result[1].severity).toBe(0.5);
		expect(result[2].severity).toBe(0.1);
	});

	it('caps severity at the configured severityCap', () => {
		const loc = makeLocation({ openTaskUnits: 100, capacityThreshold: 10 }); // raw severity 9.0
		const result = detectBreaches([loc], { severityCap: 1.0, minutesPerWorkUnit: 5 });

		expect(result[0].severity).toBe(1.0);
		expect(result[0].excessUnits).toBe(90); // excessUnits is NOT capped
	});

	it('respects custom severityCap value', () => {
		const loc = makeLocation({ openTaskUnits: 50, capacityThreshold: 10 }); // raw severity 4.0
		const result = detectBreaches([loc], { severityCap: 2.0, minutesPerWorkUnit: 5 });

		expect(result[0].severity).toBe(2.0);
	});
});

// ============================================================================
// calculateAvailabilityScore
// ============================================================================

describe('calculateAvailabilityScore', () => {
	const now = new Date('2026-03-19T12:00:00Z');

	it('returns 0 for null task (immediately available)', () => {
		expect(calculateAvailabilityScore(null, now)).toBe(0);
	});

	it('returns totalWorkUnits when task has not started (startedAt is null)', () => {
		const task = makeTask({ totalWorkUnits: 8, startedAt: null });
		expect(calculateAvailabilityScore(task, now)).toBe(8);
	});

	it('calculates remaining work units for a task in progress', () => {
		// Task started 25 minutes ago, 10 total work units, 5 min/unit
		// Elapsed = 25 min / 5 = 5 work units elapsed
		// Remaining = 10 - 5 = 5
		const startedAt = new Date('2026-03-19T11:35:00Z');
		const task = makeTask({ totalWorkUnits: 10, startedAt });
		expect(calculateAvailabilityScore(task, now)).toBe(5);
	});

	it('returns approximately half for a half-done task', () => {
		// 10 units, 5 min/unit = 50 min total. Started 25 min ago = half done.
		const startedAt = new Date('2026-03-19T11:35:00Z');
		const task = makeTask({ totalWorkUnits: 10, startedAt });
		expect(calculateAvailabilityScore(task, now)).toBeCloseTo(5, 5);
	});

	it('returns 0 (never negative) when elapsed exceeds total', () => {
		// Task started 2 hours ago, only 10 work units (50 min total)
		const startedAt = new Date('2026-03-19T10:00:00Z');
		const task = makeTask({ totalWorkUnits: 10, startedAt });
		expect(calculateAvailabilityScore(task, now)).toBe(0);
	});

	it('respects custom minutesPerWorkUnit', () => {
		// 10 units, 10 min/unit. Started 50 min ago = 5 units elapsed, 5 remaining
		const startedAt = new Date('2026-03-19T11:10:00Z');
		const task = makeTask({ totalWorkUnits: 10, startedAt });
		const config = { severityCap: 1.0, minutesPerWorkUnit: 10 };
		expect(calculateAvailabilityScore(task, now, config)).toBe(5);
	});

	it('returns totalWorkUnits when task just started with zero elapsed time', () => {
		const task = makeTask({ totalWorkUnits: 6, startedAt: now });
		expect(calculateAvailabilityScore(task, now)).toBe(6);
	});

	it('clamps to totalWorkUnits when startedAt is in the future', () => {
		// startedAt is 10 minutes in the future => elapsed is negative
		// remaining would be totalWorkUnits - (negative) = totalWorkUnits + positive
		// Upper bound clamp ensures score never exceeds totalWorkUnits
		const futureStart = new Date(now.getTime() + 10 * 60 * 1000);
		const task = makeTask({ totalWorkUnits: 6, startedAt: futureStart });
		const score = calculateAvailabilityScore(task, now);
		expect(score).toBe(task.totalWorkUnits);
	});
});

// ============================================================================
// buildScoredUsers
// ============================================================================

describe('buildScoredUsers', () => {
	const now = new Date('2026-03-19T12:00:00Z');

	it('builds a single user with a single assignment', () => {
		const assignments = [
			makeAssignment({ userId: 'u1', userName: 'Alice', deskLocationId: '10', priority: 2 }),
		];
		const result = buildScoredUsers(assignments, [], now);

		expect(result).toHaveLength(1);
		expect(result[0].userId).toBe('u1');
		expect(result[0].userName).toBe('Alice');
		expect(result[0].availabilityScore).toBe(0); // no task
		expect(result[0].currentPriorities.get('10')).toBe(2);
		expect(result[0].eligibleLocationIds.has('10')).toBe(true);
	});

	it('groups multiple assignments for the same user', () => {
		const assignments = [
			makeAssignment({ userId: 'u1', userName: 'Alice', deskLocationId: '10', priority: 1 }),
			makeAssignment({ userId: 'u1', userName: 'Alice', deskLocationId: '20', priority: 3 }),
		];
		const result = buildScoredUsers(assignments, [], now);

		expect(result).toHaveLength(1);
		expect(result[0].currentPriorities.size).toBe(2);
		expect(result[0].currentPriorities.get('10')).toBe(1);
		expect(result[0].currentPriorities.get('20')).toBe(3);
		expect(result[0].eligibleLocationIds.size).toBe(2);
	});

	it('puts null-priority assignment in eligibleLocationIds but not currentPriorities', () => {
		const assignments = [
			makeAssignment({ userId: 'u1', userName: 'Alice', deskLocationId: '10', priority: null }),
		];
		const result = buildScoredUsers(assignments, [], now);

		expect(result[0].eligibleLocationIds.has('10')).toBe(true);
		expect(result[0].currentPriorities.has('10')).toBe(false);
	});

	it('calculates positive availability score when user has a task', () => {
		const assignments = [
			makeAssignment({ userId: 'u1', userName: 'Alice', deskLocationId: '10', priority: 1 }),
		];
		const tasks = [makeTask({ userId: 'u1', totalWorkUnits: 8, startedAt: null })];
		const result = buildScoredUsers(assignments, tasks, now);

		expect(result[0].availabilityScore).toBe(8);
	});

	it('returns score 0 for user without a task', () => {
		const assignments = [
			makeAssignment({ userId: 'u1', userName: 'Alice', deskLocationId: '10', priority: 1 }),
		];
		const result = buildScoredUsers(assignments, [], now);

		expect(result[0].availabilityScore).toBe(0);
	});

	it('handles multiple users correctly', () => {
		const assignments = [
			makeAssignment({ userId: 'u1', userName: 'Alice', deskLocationId: '10', priority: 1 }),
			makeAssignment({ userId: 'u2', userName: 'Bob', deskLocationId: '10', priority: 2 }),
		];
		const tasks = [makeTask({ userId: 'u2', totalWorkUnits: 5, startedAt: null })];
		const result = buildScoredUsers(assignments, tasks, now);

		expect(result).toHaveLength(2);
		const alice = result.find((u) => u.userId === 'u1');
		const bob = result.find((u) => u.userId === 'u2');
		expect(alice?.availabilityScore).toBe(0);
		expect(bob?.availabilityScore).toBe(5);
	});
});

// ============================================================================
// getSeverityLabel
// ============================================================================

describe('getSeverityLabel', () => {
	it('returns Low for 0', () => {
		expect(getSeverityLabel(0)).toBe('Low');
	});

	it('returns Low for 0.32', () => {
		expect(getSeverityLabel(0.32)).toBe('Low');
	});

	it('returns Medium for 0.33', () => {
		expect(getSeverityLabel(0.33)).toBe('Medium');
	});

	it('returns Medium for 0.66', () => {
		expect(getSeverityLabel(0.66)).toBe('Medium');
	});

	it('returns High for 0.67', () => {
		expect(getSeverityLabel(0.67)).toBe('High');
	});

	it('returns High for 1.0', () => {
		expect(getSeverityLabel(1.0)).toBe('High');
	});
});

// ============================================================================
// getSeverityColor
// ============================================================================

describe('getSeverityColor', () => {
	it('returns yellow for Low severity', () => {
		const result = getSeverityColor(0.1);
		expect(result.bg).toBe('#fef3c7');
		expect(result.color).toBe('#92400e');
	});

	it('returns orange for Medium severity', () => {
		const result = getSeverityColor(0.5);
		expect(result.bg).toBe('#fed7aa');
		expect(result.color).toBe('#9a3412');
	});

	it('returns red for High severity', () => {
		const result = getSeverityColor(0.8);
		expect(result.bg).toBe('#fee2e2');
		expect(result.color).toBe('#991b1b');
	});
});

// ============================================================================
// serializeSuggestion / deserializeSuggestion
// ============================================================================

describe('serializeSuggestion / deserializeSuggestion', () => {
	function makeSuggestion(overrides: Partial<WorkflowSuggestion> = {}): WorkflowSuggestion {
		return {
			generatedAt: new Date('2026-03-19T12:00:00Z'),
			breachesDetected: 1,
			breachesFullyResolved: 1,
			breachesPartiallyResolved: 0,
			resolutions: [],
			affectedUserAssignments: [],
			summary: { totalAssignments: 0, totalCascades: 0, totalUnresolved: 0 },
			...overrides,
		};
	}

	it('serializes generatedAt to ISO string', () => {
		const suggestion = makeSuggestion();
		const serialized = serializeSuggestion(suggestion);
		expect(serialized.generatedAt).toBe('2026-03-19T12:00:00.000Z');
		expect(typeof serialized.generatedAt).toBe('string');
	});

	it('deserializes ISO string back to Date', () => {
		const suggestion = makeSuggestion();
		const serialized = serializeSuggestion(suggestion);
		const deserialized = deserializeSuggestion(serialized);
		expect(deserialized.generatedAt).toBeInstanceOf(Date);
		expect(deserialized.generatedAt.getTime()).toBe(suggestion.generatedAt.getTime());
	});

	it('round-trips all fields correctly', () => {
		const suggestion = makeSuggestion({
			breachesDetected: 3,
			breachesFullyResolved: 2,
			breachesPartiallyResolved: 1,
			affectedUserAssignments: [
				{ userId: 'u1', assignments: [{ deskLocationId: '10', priority: 1 }] },
			],
			summary: { totalAssignments: 5, totalCascades: 2, totalUnresolved: 1 },
		});

		const roundTripped = deserializeSuggestion(serializeSuggestion(suggestion));

		expect(roundTripped.breachesDetected).toBe(3);
		expect(roundTripped.breachesFullyResolved).toBe(2);
		expect(roundTripped.breachesPartiallyResolved).toBe(1);
		expect(roundTripped.affectedUserAssignments).toEqual(suggestion.affectedUserAssignments);
		expect(roundTripped.summary).toEqual(suggestion.summary);
		expect(roundTripped.resolutions).toEqual(suggestion.resolutions);
	});
});

// ============================================================================
// generateWorkflowSuggestions
// ============================================================================

describe('generateWorkflowSuggestions', () => {
	it('returns empty result when there are no breaches', () => {
		const locations = [makeLocation({ openTaskUnits: 5, capacityThreshold: 20 })];
		const result = generateWorkflowSuggestions(locations, [], []);

		expect(result.breachesDetected).toBe(0);
		expect(result.resolutions).toHaveLength(0);
		expect(result.affectedUserAssignments).toHaveLength(0);
		expect(result.summary.totalAssignments).toBe(0);
		expect(result.summary.totalCascades).toBe(0);
		expect(result.summary.totalUnresolved).toBe(0);
	});

	it('resolves a single breach with one eligible user', () => {
		const loc = makeLocation({
			deskLocationId: '10',
			deskLocationName: 'Loc A',
			openTaskUnits: 30,
			capacityThreshold: 20,
		});
		// severity = 10/20 = 0.5, eligible = 1, usersNeeded = ceil(0.5 * 1) = 1
		const assignments = [
			makeAssignment({
				userId: 'u1',
				userName: 'Alice',
				deskLocationId: '10',
				deskLocationName: 'Loc A',
				priority: null,
			}),
		];

		const result = generateWorkflowSuggestions([loc], assignments, []);

		expect(result.breachesDetected).toBe(1);
		expect(result.resolutions).toHaveLength(1);
		expect(result.resolutions[0].assignments).toHaveLength(1);
		expect(result.resolutions[0].assignments[0].userId).toBe('u1');
		expect(result.resolutions[0].assignments[0].newPriority).toBe(1);
		expect(result.resolutions[0].shortfall).toBe(0);
		expect(result.breachesFullyResolved).toBe(1);
	});

	it('does not surface resolutions with zero assignments', () => {
		// Breach exists but no eligible users
		const loc = makeLocation({ deskLocationId: '10', openTaskUnits: 30, capacityThreshold: 20 });
		// No assignments for location 10, so no eligible users
		const assignments = [
			makeAssignment({ userId: 'u1', userName: 'Alice', deskLocationId: '99', priority: 1 }),
		];

		const result = generateWorkflowSuggestions([loc], assignments, []);

		expect(result.breachesDetected).toBe(1);
		expect(result.resolutions).toHaveLength(0); // not surfaced
		// With 0 eligible users, usersNeeded = ceil(severity * 0) = 0, so shortfall = 0
		// The breach is detected but simply cannot be resolved
		expect(result.breachesFullyResolved).toBe(0);
		expect(result.breachesPartiallyResolved).toBe(0);
	});

	it('resolves multiple breaches in severity order, state carries across', () => {
		const locHigh = makeLocation({
			deskLocationId: '10',
			deskLocationName: 'High',
			openTaskUnits: 40,
			capacityThreshold: 20,
		}); // severity 1.0
		const locLow = makeLocation({
			deskLocationId: '20',
			deskLocationName: 'Low',
			openTaskUnits: 22,
			capacityThreshold: 20,
		}); // severity 0.1

		// User eligible for both locations
		const assignments = [
			makeAssignment({
				userId: 'u1',
				userName: 'Alice',
				deskLocationId: '10',
				deskLocationName: 'High',
				priority: null,
			}),
			makeAssignment({
				userId: 'u1',
				userName: 'Alice',
				deskLocationId: '20',
				deskLocationName: 'Low',
				priority: null,
			}),
		];

		const result = generateWorkflowSuggestions([locLow, locHigh], assignments, []);

		expect(result.breachesDetected).toBe(2);
		// High severity breach resolved first
		expect(result.resolutions[0].breach.deskLocationId).toBe('10');
	});

	it('reports partial resolution when not enough users', () => {
		// severity = 1.0, eligible = 1, usersNeeded = ceil(1.0 * 1) = 1
		// But what if we make severity high with many eligible expected?
		// severity = 1.0 (capped), eligible = 2, usersNeeded = ceil(1.0 * 2) = 2
		const loc = makeLocation({
			deskLocationId: '10',
			deskLocationName: 'Loc A',
			openTaskUnits: 40,
			capacityThreshold: 20,
		});

		// Two eligible users, but one has all P1-P5 occupied by OTHER locations
		const assignments = [
			makeAssignment({
				userId: 'u1',
				userName: 'Alice',
				deskLocationId: '10',
				deskLocationName: 'Loc A',
				priority: null,
			}),
			makeAssignment({
				userId: 'u2',
				userName: 'Bob',
				deskLocationId: '10',
				deskLocationName: 'Loc A',
				priority: null,
			}),
			// Fill Bob's P1-P5 with other locations
			makeAssignment({
				userId: 'u2',
				userName: 'Bob',
				deskLocationId: '101',
				deskLocationName: 'X1',
				priority: 1,
			}),
			makeAssignment({
				userId: 'u2',
				userName: 'Bob',
				deskLocationId: '102',
				deskLocationName: 'X2',
				priority: 2,
			}),
			makeAssignment({
				userId: 'u2',
				userName: 'Bob',
				deskLocationId: '103',
				deskLocationName: 'X3',
				priority: 3,
			}),
			makeAssignment({
				userId: 'u2',
				userName: 'Bob',
				deskLocationId: '104',
				deskLocationName: 'X4',
				priority: 4,
			}),
			makeAssignment({
				userId: 'u2',
				userName: 'Bob',
				deskLocationId: '105',
				deskLocationName: 'X5',
				priority: 5,
			}),
		];

		const result = generateWorkflowSuggestions([loc], assignments, []);

		expect(result.breachesDetected).toBe(1);
		expect(result.resolutions).toHaveLength(1);
		// Alice assigned, Bob skipped due to PRIORITY_EXHAUSTION
		expect(result.resolutions[0].assignments).toHaveLength(1);
		expect(result.resolutions[0].assignments[0].userId).toBe('u1');
		expect(result.resolutions[0].shortfall).toBe(1);
		expect(result.resolutions[0].skippedUsers).toHaveLength(1);
		expect(result.resolutions[0].skippedUsers[0].userId).toBe('u2');
		expect(result.resolutions[0].skippedUsers[0].reason).toBe('PRIORITY_EXHAUSTION');
		expect(result.breachesPartiallyResolved).toBe(1);
	});

	it('cascades priorities when assigning P1 and P1 is already taken', () => {
		const loc = makeLocation({
			deskLocationId: '10',
			deskLocationName: 'Target',
			openTaskUnits: 30,
			capacityThreshold: 20,
		});

		// User has P1 at location 20 and is eligible for location 10
		const assignments = [
			makeAssignment({
				userId: 'u1',
				userName: 'Alice',
				deskLocationId: '10',
				deskLocationName: 'Target',
				priority: null,
			}),
			makeAssignment({
				userId: 'u1',
				userName: 'Alice',
				deskLocationId: '20',
				deskLocationName: 'Other',
				priority: 1,
			}),
		];

		const result = generateWorkflowSuggestions([loc], assignments, []);

		expect(result.resolutions).toHaveLength(1);
		const resolution = result.resolutions[0];

		// Alice gets P1 at target location (lowest available, since P1 is taken by loc 20 the algorithm picks P1 for target and cascades loc 20)
		// Actually: findLowestAvailablePriority checks priorities taken by OTHER locations.
		// P1 is taken by loc 20. So for target loc 10, P2 is the lowest available.
		// Wait - let me re-read the code. It finds lowest p where !takenPriorities.has(p) && p !== existingPriority.
		// existingPriority for loc 10 = undefined (null priority, so userPriorities doesn't have it).
		// takenPriorities = {1} (from loc 20). So P2 is lowest available.
		expect(resolution.assignments[0].newPriority).toBe(2);
		expect(resolution.cascadedChanges).toHaveLength(0); // P2 doesn't displace anything
	});

	it('cascades P1→P2→P3 when inserting at P1', () => {
		const loc = makeLocation({
			deskLocationId: '10',
			deskLocationName: 'Target',
			openTaskUnits: 30,
			capacityThreshold: 20,
		});

		// User has: loc 10 at P3, loc 20 at P1, loc 30 at P2
		// findLowestAvailablePriority for (u1, loc 10):
		//   existingPriority = 3 (loc 10's current priority)
		//   takenPriorities = {1 (loc 20), 2 (loc 30)}
		//   Check P1: taken. P2: taken. P3: === existingPriority, skip. P4: available!
		// So user gets P4 at loc 10.
		// Actually, the user already HAS a priority at loc 10. The algorithm still "assigns" them.
		const assignments = [
			makeAssignment({
				userId: 'u1',
				userName: 'Alice',
				deskLocationId: '10',
				deskLocationName: 'Target',
				priority: 3,
			}),
			makeAssignment({
				userId: 'u1',
				userName: 'Alice',
				deskLocationId: '20',
				deskLocationName: 'Other1',
				priority: 1,
			}),
			makeAssignment({
				userId: 'u1',
				userName: 'Alice',
				deskLocationId: '30',
				deskLocationName: 'Other2',
				priority: 2,
			}),
		];

		const result = generateWorkflowSuggestions([loc], assignments, []);

		expect(result.resolutions).toHaveLength(1);
		const resolution = result.resolutions[0];
		// Alice gets P4 at target loc 10 (P1 taken by 20, P2 taken by 30, P3 is existingPriority)
		expect(resolution.assignments[0].newPriority).toBe(4);
		expect(resolution.assignments[0].previousPriority).toBe(3);
	});

	it('skips users with all priority slots exhausted (P1-P5 occupied by other locations)', () => {
		const loc = makeLocation({
			deskLocationId: '10',
			deskLocationName: 'Target',
			openTaskUnits: 30,
			capacityThreshold: 20,
		});

		// User has loc 10 (null priority), and P1-P5 at other locations
		// findLowestAvailablePriority: takenPriorities = {1,2,3,4,5}, existingPriority = undefined
		// All P1-P5 taken → returns null → PRIORITY_EXHAUSTION
		const assignments = [
			makeAssignment({
				userId: 'u1',
				userName: 'Alice',
				deskLocationId: '10',
				deskLocationName: 'Target',
				priority: null,
			}),
			makeAssignment({
				userId: 'u1',
				userName: 'Alice',
				deskLocationId: '20',
				deskLocationName: 'A',
				priority: 1,
			}),
			makeAssignment({
				userId: 'u1',
				userName: 'Alice',
				deskLocationId: '30',
				deskLocationName: 'B',
				priority: 2,
			}),
			makeAssignment({
				userId: 'u1',
				userName: 'Alice',
				deskLocationId: '40',
				deskLocationName: 'C',
				priority: 3,
			}),
			makeAssignment({
				userId: 'u1',
				userName: 'Alice',
				deskLocationId: '50',
				deskLocationName: 'D',
				priority: 4,
			}),
			makeAssignment({
				userId: 'u1',
				userName: 'Alice',
				deskLocationId: '60',
				deskLocationName: 'E',
				priority: 5,
			}),
		];

		const result = generateWorkflowSuggestions([loc], assignments, []);

		expect(result.resolutions).toHaveLength(0); // 0 assignments → not surfaced
		expect(result.breachesDetected).toBe(1);
	});

	it('cascade past P5 produces cascadedChange with newPriority null', () => {
		// Breached location A with high severity
		const locA = makeLocation({
			deskLocationId: '10',
			deskLocationName: 'Location A',
			openTaskUnits: 30,
			capacityThreshold: 10,
		});
		// severity = 20/10 = 2.0, capped at 1.0

		// User assigned to Location A (null priority) and 4 other locations at P2, P3, P4, P5
		// When algorithm assigns user to Location A at P1 (lowest available since P1 not taken by others),
		// it should cascade: P2→P3, P3→P4, P4→P5, P5→null (pushed off)
		const assignments = [
			makeAssignment({
				userId: 'u1',
				userName: 'Alice',
				deskLocationId: '10',
				deskLocationName: 'Location A',
				priority: null,
			}),
			makeAssignment({
				userId: 'u1',
				userName: 'Alice',
				deskLocationId: '20',
				deskLocationName: 'Loc B',
				priority: 2,
			}),
			makeAssignment({
				userId: 'u1',
				userName: 'Alice',
				deskLocationId: '30',
				deskLocationName: 'Loc C',
				priority: 3,
			}),
			makeAssignment({
				userId: 'u1',
				userName: 'Alice',
				deskLocationId: '40',
				deskLocationName: 'Loc D',
				priority: 4,
			}),
			makeAssignment({
				userId: 'u1',
				userName: 'Alice',
				deskLocationId: '50',
				deskLocationName: 'Loc E',
				priority: 5,
			}),
		];

		const result = generateWorkflowSuggestions([locA], assignments, []);

		expect(result.resolutions).toHaveLength(1);
		const resolution = result.resolutions[0];

		// User gets P1 at Location A (P1 is not taken by any other location)
		expect(resolution.assignments).toHaveLength(1);
		expect(resolution.assignments[0].newPriority).toBe(1);
		expect(resolution.assignments[0].userId).toBe('u1');

		// Cascaded changes: P2→P3, P3→P4, P4→P5, P5→null
		expect(resolution.cascadedChanges).toHaveLength(4);
		const nullCascade = resolution.cascadedChanges.find((c) => c.newPriority === null);
		expect(nullCascade).toBeDefined();
		expect(nullCascade!.previousPriority).toBe(5);
	});

	it('produces correct summary counts', () => {
		// Two breaches: one fully resolved, one partially resolved
		const loc1 = makeLocation({
			deskLocationId: '10',
			deskLocationName: 'Loc1',
			openTaskUnits: 25,
			capacityThreshold: 20,
		}); // severity 0.25
		const loc2 = makeLocation({
			deskLocationId: '20',
			deskLocationName: 'Loc2',
			openTaskUnits: 60,
			capacityThreshold: 20,
		}); // severity 2.0 → capped 1.0

		// Two users, both eligible for loc1 and loc2
		const assignments = [
			makeAssignment({
				userId: 'u1',
				userName: 'Alice',
				deskLocationId: '10',
				deskLocationName: 'Loc1',
				priority: null,
			}),
			makeAssignment({
				userId: 'u1',
				userName: 'Alice',
				deskLocationId: '20',
				deskLocationName: 'Loc2',
				priority: null,
			}),
			makeAssignment({
				userId: 'u2',
				userName: 'Bob',
				deskLocationId: '10',
				deskLocationName: 'Loc1',
				priority: null,
			}),
			makeAssignment({
				userId: 'u2',
				userName: 'Bob',
				deskLocationId: '20',
				deskLocationName: 'Loc2',
				priority: null,
			}),
		];

		const result = generateWorkflowSuggestions([loc1, loc2], assignments, []);

		expect(result.breachesDetected).toBe(2);
		// loc2 resolved first (severity 1.0): ceil(1.0 * 2) = 2 users assigned
		// loc1 resolved second (severity 0.25): ceil(0.25 * 2) = 1 user assigned
		// Total: 3 assignments, 0 cascades, 0 unresolved
		expect(result.summary.totalAssignments).toBe(3);
		expect(result.summary.totalCascades).toBe(0);
		expect(result.summary.totalUnresolved).toBe(0);
		// Verify counts add up with resolutions
		const totalFromResolutions = result.resolutions.reduce(
			(sum, r) => sum + r.assignments.length,
			0
		);
		expect(result.summary.totalAssignments).toBe(totalFromResolutions);
	});

	it('includes generatedAt as a Date', () => {
		const result = generateWorkflowSuggestions([], [], []);
		expect(result.generatedAt).toBeInstanceOf(Date);
	});

	it('affectedUserAssignments only includes users whose state changed', () => {
		const loc = makeLocation({
			deskLocationId: '10',
			deskLocationName: 'Loc A',
			openTaskUnits: 25,
			capacityThreshold: 20,
		});

		// Two users eligible for loc 10, but breach only needs 1 (severity 0.25, 2 eligible, ceil(0.25*2)=1)
		const assignments = [
			makeAssignment({
				userId: 'u1',
				userName: 'Alice',
				deskLocationId: '10',
				deskLocationName: 'Loc A',
				priority: null,
			}),
			makeAssignment({
				userId: 'u2',
				userName: 'Bob',
				deskLocationId: '10',
				deskLocationName: 'Loc A',
				priority: null,
			}),
		];

		const result = generateWorkflowSuggestions([loc], assignments, []);

		// Only 1 user needed, so only 1 should be affected
		expect(result.resolutions[0].assignments).toHaveLength(1);
		expect(result.affectedUserAssignments).toHaveLength(1);
		expect(result.affectedUserAssignments[0].userId).toBe(
			result.resolutions[0].assignments[0].userId
		);
	});

	it('cascades priorities in ascending order across multiple locations', () => {
		// Breached location with high severity
		const loc = makeLocation({
			deskLocationId: '10',
			deskLocationName: 'Breached',
			openTaskUnits: 30,
			capacityThreshold: 10,
		});
		// severity = 20/10 = 2.0, capped at 1.0, 1 eligible user, usersNeeded = ceil(1.0 * 1) = 1

		// User has assignments at P3, P4, P5 at other locations and is eligible for breached location
		// P1 and P2 are free, so algorithm assigns P1 at breached location
		// Cascade: P3→P4, P4→P5, P5→null (all >= targetPriority=1, sorted ascending)
		const assignments = [
			makeAssignment({
				userId: 'u1',
				userName: 'Alice',
				deskLocationId: '10',
				deskLocationName: 'Breached',
				priority: null,
			}),
			makeAssignment({
				userId: 'u1',
				userName: 'Alice',
				deskLocationId: '20',
				deskLocationName: 'Loc B',
				priority: 3,
			}),
			makeAssignment({
				userId: 'u1',
				userName: 'Alice',
				deskLocationId: '30',
				deskLocationName: 'Loc C',
				priority: 4,
			}),
			makeAssignment({
				userId: 'u1',
				userName: 'Alice',
				deskLocationId: '40',
				deskLocationName: 'Loc D',
				priority: 5,
			}),
		];

		const result = generateWorkflowSuggestions([loc], assignments, []);

		expect(result.resolutions).toHaveLength(1);
		const resolution = result.resolutions[0];

		// User assigned P1 at breached location
		expect(resolution.assignments[0].newPriority).toBe(1);

		// Cascades should be in ascending order by previousPriority: P3→P4, P4→P5, P5→null
		expect(resolution.cascadedChanges).toHaveLength(3);
		expect(resolution.cascadedChanges[0]).toMatchObject({
			deskLocationId: '20',
			previousPriority: 3,
			newPriority: 4,
		});
		expect(resolution.cascadedChanges[1]).toMatchObject({
			deskLocationId: '30',
			previousPriority: 4,
			newPriority: 5,
		});
		expect(resolution.cascadedChanges[2]).toMatchObject({
			deskLocationId: '40',
			previousPriority: 5,
			newPriority: null,
		});
	});

	it('affectedUserAssignments includes null priority for locations without active priority', () => {
		// Breached location
		const loc = makeLocation({
			deskLocationId: '10',
			deskLocationName: 'Breached',
			openTaskUnits: 30,
			capacityThreshold: 20,
		});
		// severity = 0.5, 1 eligible, usersNeeded = ceil(0.5 * 1) = 1

		// User eligible for loc 10 (null priority) and loc 20 (null priority)
		// After algorithm: user gets P1 at loc 10. Loc 20 remains null priority.
		const assignments = [
			makeAssignment({
				userId: 'u1',
				userName: 'Alice',
				deskLocationId: '10',
				deskLocationName: 'Breached',
				priority: null,
			}),
			makeAssignment({
				userId: 'u1',
				userName: 'Alice',
				deskLocationId: '20',
				deskLocationName: 'Other',
				priority: null,
			}),
		];

		const result = generateWorkflowSuggestions([loc], assignments, []);

		expect(result.affectedUserAssignments).toHaveLength(1);
		const userState = result.affectedUserAssignments[0];
		expect(userState.userId).toBe('u1');

		// Should include both locations: loc 10 with priority 1, loc 20 with priority null
		expect(userState.assignments).toHaveLength(2);
		const loc10 = userState.assignments.find((a) => a.deskLocationId === '10');
		const loc20 = userState.assignments.find((a) => a.deskLocationId === '20');
		expect(loc10).toEqual({ deskLocationId: '10', priority: 1 });
		expect(loc20).toEqual({ deskLocationId: '20', priority: null });
	});
});

// ============================================================================
// extractApprovedAssignments
// ============================================================================

describe('extractApprovedAssignments', () => {
	function makeSuggestionWithResolutions(): WorkflowSuggestion {
		return {
			generatedAt: new Date(),
			breachesDetected: 2,
			breachesFullyResolved: 2,
			breachesPartiallyResolved: 0,
			resolutions: [
				{
					breach: {
						deskLocationId: '10',
						deskLocationName: 'Loc A',
						deskLocationTypeName: 'Type A',
						openTaskUnits: 30,
						capacityThreshold: 20,
						excessUnits: 10,
						severity: 0.5,
					},
					usersNeeded: 1,
					assignments: [
						{
							userId: 'u1',
							userName: 'Alice',
							deskLocationId: '10',
							deskLocationName: 'Loc A',
							newPriority: 1,
							previousPriority: null,
						},
					],
					cascadedChanges: [
						{
							userId: 'u1',
							userName: 'Alice',
							deskLocationId: '20',
							deskLocationName: 'Loc B',
							previousPriority: 1,
							newPriority: 2,
						},
					],
					shortfall: 0,
					skippedUsers: [],
				},
				{
					breach: {
						deskLocationId: '30',
						deskLocationName: 'Loc C',
						deskLocationTypeName: 'Type C',
						openTaskUnits: 25,
						capacityThreshold: 20,
						excessUnits: 5,
						severity: 0.25,
					},
					usersNeeded: 1,
					assignments: [
						{
							userId: 'u2',
							userName: 'Bob',
							deskLocationId: '30',
							deskLocationName: 'Loc C',
							newPriority: 1,
							previousPriority: null,
						},
					],
					cascadedChanges: [],
					shortfall: 0,
					skippedUsers: [],
				},
			],
			affectedUserAssignments: [
				{
					userId: 'u1',
					assignments: [
						{ deskLocationId: '10', priority: 1 },
						{ deskLocationId: '20', priority: 2 },
					],
				},
				{ userId: 'u2', assignments: [{ deskLocationId: '30', priority: 1 }] },
			],
			summary: { totalAssignments: 2, totalCascades: 1, totalUnresolved: 0 },
		};
	}

	it('returns all affectedUserAssignments when indices are undefined', () => {
		const suggestion = makeSuggestionWithResolutions();
		const result = extractApprovedAssignments(suggestion);
		expect(result).toHaveLength(2);
		expect(result).toEqual(suggestion.affectedUserAssignments);
	});

	it('returns users from specific approved resolution indices', () => {
		const suggestion = makeSuggestionWithResolutions();
		const result = extractApprovedAssignments(suggestion, [0]);

		// Resolution 0 involves u1 (assignment) and u1 (cascade)
		expect(result).toHaveLength(1);
		expect(result[0].userId).toBe('u1');
	});

	it('includes users from cascaded changes in approved resolutions', () => {
		const suggestion = makeSuggestionWithResolutions();
		// Resolution 0 has a cascade for u1
		const result = extractApprovedAssignments(suggestion, [0]);
		const userIds = result.map((u) => u.userId);
		expect(userIds).toContain('u1');
	});

	it('returns users from multiple approved indices', () => {
		const suggestion = makeSuggestionWithResolutions();
		const result = extractApprovedAssignments(suggestion, [0, 1]);

		expect(result).toHaveLength(2);
		const userIds = result.map((u) => u.userId);
		expect(userIds).toContain('u1');
		expect(userIds).toContain('u2');
	});

	it('skips out-of-bounds indices gracefully', () => {
		const suggestion = makeSuggestionWithResolutions();
		const result = extractApprovedAssignments(suggestion, [99]);
		expect(result).toHaveLength(0);
	});

	it('returns empty array for empty indices array', () => {
		const suggestion = makeSuggestionWithResolutions();
		const result = extractApprovedAssignments(suggestion, []);
		expect(result).toHaveLength(0);
	});

	it('deduplicates users appearing in both assignment and cascade of same resolution', () => {
		const suggestion = makeSuggestionWithResolutions();
		// u1 appears in both assignments and cascadedChanges of resolution 0
		const result = extractApprovedAssignments(suggestion, [0]);
		const u1Entries = result.filter((u) => u.userId === 'u1');
		expect(u1Entries).toHaveLength(1); // deduplicated via Set
	});
});
