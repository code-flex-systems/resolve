/**
 * Workflow Suggestion Algorithm
 *
 * Generates priority reassignment suggestions to address capacity breaches
 * at desk locations. Suggestions are surfaced for manager approval, not
 * auto-applied.
 *
 * Core concepts:
 * - Breach: desk location where open task units > capacity threshold
 * - Severity: % over capacity (capped at configured limit)
 * - Eligibility: users assigned to a location (priority 1-5 or null)
 * - Availability: based on current task assignment and remaining work
 */

import { SuggestionStatus } from '@/config/enums';

// ============================================================================
// TYPES
// ============================================================================

/** Desk location with current load and capacity */
export interface DeskLocationLoad {
	deskLocationId: string;
	deskLocationName: string;
	deskLocationTypeName: string;
	openTaskUnits: number;
	capacityThreshold: number;
}

/** User's assignment to a desk location */
export interface UserDeskAssignment {
	userId: string;
	userName: string;
	deskLocationId: string;
	deskLocationName: string;
	priority: number | null; // null = eligible but not currently prioritized
}

/** User's current task (if any) */
export interface UserCurrentTask {
	userId: string;
	taskId: string;
	totalWorkUnits: number;
	startedAt: Date | null;
}

/** Calculated breach at a desk location */
export interface Breach {
	deskLocationId: string;
	deskLocationName: string;
	deskLocationTypeName: string;
	openTaskUnits: number;
	capacityThreshold: number;
	excessUnits: number;
	severity: number; // 0-1, capped at severityCap
}

/** User scored for assignment eligibility */
export interface ScoredUser {
	userId: string;
	userName: string;
	availabilityScore: number; // lower = sooner available (0 = immediately)
	currentPriorities: Map<string, number>; // locationId -> priority
	eligibleLocationIds: Set<string>; // all locations they can work
}

/** A single priority assignment in the suggestion */
export interface PriorityAssignment {
	userId: string;
	userName: string;
	deskLocationId: string;
	deskLocationName: string;
	newPriority: number;
	previousPriority: number | null;
}

/** Priority changes cascaded from an assignment */
export interface CascadedChange {
	userId: string;
	userName: string;
	deskLocationId: string;
	deskLocationName: string;
	previousPriority: number;
	newPriority: number | null; // null if dropped (pushed past P5)
}

/** Result of attempting to resolve a single breach */
export interface BreachResolution {
	suggestionId?: string; // UUID of the workflow_suggestion record (added by controller after persistence)
	status?: SuggestionStatus; // Status of the suggestion (pending, ignored, executed, hidden)
	breach: Breach;
	usersNeeded: number;
	assignments: PriorityAssignment[];
	cascadedChanges: CascadedChange[];
	shortfall: number; // usersNeeded - assignments.length
	skippedUsers: Array<{
		userId: string;
		userName: string;
		reason: string;
	}>;
}

/** Full desired assignment state for a single user after algorithm runs */
export interface UserAssignmentState {
	userId: string;
	assignments: Array<{ deskLocationId: string; priority: number | null }>;
}

/** Full output of the suggestion algorithm */
export interface WorkflowSuggestion {
	generatedAt: Date;
	breachesDetected: number;
	breachesFullyResolved: number;
	breachesPartiallyResolved: number;
	resolutions: BreachResolution[];
	/** Complete final assignment state for each user modified by the algorithm */
	affectedUserAssignments: UserAssignmentState[];
	summary: {
		totalAssignments: number;
		totalCascades: number;
		totalUnresolved: number;
	};
}

/** Configuration for the algorithm */
export interface SuggestionConfig {
	/** Maximum severity value (e.g., 1.0 = 100% over capacity) */
	severityCap: number;
	/** Minutes per work unit (fixed at 5 per requirements) */
	minutesPerWorkUnit: number;
}

const DEFAULT_CONFIG: SuggestionConfig = {
	severityCap: 1.0,
	minutesPerWorkUnit: 5,
};

// ============================================================================
// BREACH DETECTION
// ============================================================================

/**
 * Identifies desk locations where load exceeds capacity threshold.
 * Returns breaches sorted by severity (highest first).
 */
export function detectBreaches(locations: DeskLocationLoad[], config: SuggestionConfig = DEFAULT_CONFIG): Breach[] {
	const breaches: Breach[] = [];

	for (const loc of locations) {
		if (loc.capacityThreshold <= 0) continue; // Skip locations with no capacity configured
		if (loc.openTaskUnits > loc.capacityThreshold) {
			const excessUnits = loc.openTaskUnits - loc.capacityThreshold;
			const rawSeverity = excessUnits / loc.capacityThreshold;
			const severity = Math.min(rawSeverity, config.severityCap);

			breaches.push({
				deskLocationId: loc.deskLocationId,
				deskLocationName: loc.deskLocationName,
				deskLocationTypeName: loc.deskLocationTypeName,
				openTaskUnits: loc.openTaskUnits,
				capacityThreshold: loc.capacityThreshold,
				excessUnits,
				severity,
			});
		}
	}

	// Sort by severity descending (most severe first)
	return breaches.sort((a, b) => b.severity - a.severity);
}

// ============================================================================
// USER AVAILABILITY SCORING
// ============================================================================

/**
 * Calculates availability score for a user based on their current task.
 * Lower score = sooner available (in work units). 0 = immediately available.
 */
export function calculateAvailabilityScore(
	currentTask: UserCurrentTask | null,
	now: Date,
	config: SuggestionConfig = DEFAULT_CONFIG
): number {
	if (!currentTask) {
		return 0; // Immediately available
	}

	if (!currentTask.startedAt) {
		// Task assigned but not started — full work units remain
		return currentTask.totalWorkUnits;
	}

	// Task in progress — estimate remaining work units
	const elapsedMs = now.getTime() - currentTask.startedAt.getTime();
	const elapsedMinutes = elapsedMs / (1000 * 60);
	const elapsedWorkUnits = elapsedMinutes / config.minutesPerWorkUnit;
	const remainingWorkUnits = Math.min(
		currentTask.totalWorkUnits,
		Math.max(0, currentTask.totalWorkUnits - elapsedWorkUnits)
	);

	return remainingWorkUnits;
}

/**
 * Builds scored user list with availability and current priority state.
 */
export function buildScoredUsers(
	assignments: UserDeskAssignment[],
	currentTasks: UserCurrentTask[],
	now: Date,
	config: SuggestionConfig = DEFAULT_CONFIG
): ScoredUser[] {
	// Group assignments by user
	const userAssignments = new Map<string, UserDeskAssignment[]>();
	for (const assignment of assignments) {
		const existing = userAssignments.get(assignment.userId) ?? [];
		existing.push(assignment);
		userAssignments.set(assignment.userId, existing);
	}

	// Map current tasks by user
	const taskByUser = new Map<string, UserCurrentTask>();
	for (const task of currentTasks) {
		taskByUser.set(task.userId, task);
	}

	// Build scored users
	const scoredUsers: ScoredUser[] = [];

	for (const [userId, userAssigns] of userAssignments) {
		const currentTask = taskByUser.get(userId) ?? null;
		const availabilityScore = calculateAvailabilityScore(currentTask, now, config);

		const currentPriorities = new Map<string, number>();
		const eligibleLocationIds = new Set<string>();

		for (const assign of userAssigns) {
			eligibleLocationIds.add(assign.deskLocationId);
			if (assign.priority !== null) {
				currentPriorities.set(assign.deskLocationId, assign.priority);
			}
		}

		scoredUsers.push({
			userId,
			userName: userAssigns[0].userName,
			availabilityScore,
			currentPriorities,
			eligibleLocationIds,
		});
	}

	return scoredUsers;
}

// ============================================================================
// PRIORITY ASSIGNMENT WITH CASCADE
// ============================================================================

/** Mutable state tracking assignments made during suggestion generation */
interface AssignmentState {
	/** userId -> (locationId -> priority) for new/updated assignments */
	userPriorities: Map<string, Map<string, number>>;
}

function createAssignmentState(scoredUsers: ScoredUser[]): AssignmentState {
	const userPriorities = new Map<string, Map<string, number>>();

	for (const user of scoredUsers) {
		userPriorities.set(user.userId, new Map(user.currentPriorities));
	}

	return { userPriorities };
}

/**
 * Finds the lowest available priority slot for a user at a given location.
 * Returns null if no slot available (all P1-P5 occupied by other locations).
 */
function findLowestAvailablePriority(userId: string, targetLocationId: string, state: AssignmentState): number | null {
	const userPriorities = state.userPriorities.get(userId);
	if (!userPriorities) return 1; // No assignments, P1 is open

	// Check if already assigned to this location
	const existingPriority = userPriorities.get(targetLocationId);

	// Find which priorities are taken by OTHER locations
	const takenPriorities = new Set<number>();
	for (const [locId, priority] of userPriorities) {
		if (locId !== targetLocationId) {
			takenPriorities.add(priority);
		}
	}

	// Find lowest available priority that is DIFFERENT from existing priority
	for (let p = 1; p <= 5; p++) {
		if (!takenPriorities.has(p) && p !== existingPriority) {
			return p;
		}
	}

	return null; // No different priority available
}

/**
 * Assigns a user to a location at a given priority, cascading existing
 * assignments as needed. Returns the changes made.
 */
function assignWithCascade(
	userId: string,
	userName: string,
	targetLocationId: string,
	targetLocationName: string,
	targetPriority: number,
	state: AssignmentState,
	locationNames: Map<string, string>
): { assignment: PriorityAssignment; cascaded: CascadedChange[] } {
	const userPriorities = state.userPriorities.get(userId) ?? new Map();
	const previousPriority = userPriorities.get(targetLocationId) ?? null;
	const cascaded: CascadedChange[] = [];

	// Build list of assignments to cascade (those at or below target priority)
	const toShift: Array<{ locationId: string; currentPriority: number }> = [];

	for (const [locId, priority] of userPriorities) {
		if (locId !== targetLocationId && priority >= targetPriority) {
			toShift.push({ locationId: locId, currentPriority: priority });
		}
	}

	// Sort by priority ascending so we shift in order
	toShift.sort((a, b) => a.currentPriority - b.currentPriority);

	// Perform cascade
	for (const item of toShift) {
		const newPriority = item.currentPriority + 1;

		if (newPriority > 5) {
			// Pushed past P5 — remove from active priorities
			userPriorities.delete(item.locationId);
			cascaded.push({
				userId,
				userName,
				deskLocationId: item.locationId,
				deskLocationName: locationNames.get(item.locationId) ?? '',
				previousPriority: item.currentPriority,
				newPriority: null,
			});
		} else {
			userPriorities.set(item.locationId, newPriority);
			cascaded.push({
				userId,
				userName,
				deskLocationId: item.locationId,
				deskLocationName: locationNames.get(item.locationId) ?? '',
				previousPriority: item.currentPriority,
				newPriority,
			});
		}
	}

	// Set the target assignment
	userPriorities.set(targetLocationId, targetPriority);
	state.userPriorities.set(userId, userPriorities);

	const assignment: PriorityAssignment = {
		userId,
		userName,
		deskLocationId: targetLocationId,
		deskLocationName: targetLocationName,
		newPriority: targetPriority,
		previousPriority,
	};

	return { assignment, cascaded };
}

// ============================================================================
// BREACH RESOLUTION
// ============================================================================

/**
 * Attempts to resolve a single breach by assigning eligible users.
 */
function resolveBreach(
	breach: Breach,
	scoredUsers: ScoredUser[],
	state: AssignmentState,
	locationNames: Map<string, string>
): BreachResolution {
	// Get eligible users for this location
	// Users already assigned to this location ARE eligible for reassignment to a different priority
	const eligible = scoredUsers
		.filter((u) => u.eligibleLocationIds.has(breach.deskLocationId))
		.sort((a, b) => a.availabilityScore - b.availabilityScore); // Soonest first

	// Calculate users needed based on severity and pool size
	const usersNeeded = Math.ceil(breach.severity * eligible.length);

	const assignments: PriorityAssignment[] = [];
	const cascadedChanges: CascadedChange[] = [];
	const skippedUsers: Array<{ userId: string; userName: string; reason: 'PRIORITY_EXHAUSTION' }> = [];

	for (const user of eligible) {
		if (assignments.length >= usersNeeded) {
			break; // We have enough
		}

		const availablePriority = findLowestAvailablePriority(user.userId, breach.deskLocationId, state);

		if (availablePriority !== null) {
			const { assignment, cascaded } = assignWithCascade(
				user.userId,
				user.userName,
				breach.deskLocationId,
				breach.deskLocationName,
				availablePriority,
				state,
				locationNames
			);

			assignments.push(assignment);
			cascadedChanges.push(...cascaded);
		} else {
			skippedUsers.push({
				userId: user.userId,
				userName: user.userName,
				reason: 'PRIORITY_EXHAUSTION',
			});
		}
	}

	return {
		breach,
		usersNeeded,
		assignments,
		cascadedChanges,
		shortfall: Math.max(0, usersNeeded - assignments.length),
		skippedUsers,
	};
}

// ============================================================================
// MAIN ORCHESTRATOR
// ============================================================================

/**
 * Generates workflow suggestions based on current load and user assignments.
 *
 * @param locations - Current load and capacity for each desk location
 * @param assignments - User desk location assignments (with priority or null)
 * @param currentTasks - Current task for each user (if any)
 * @param config - Algorithm configuration
 * @returns Suggestions for manager review
 */
export function generateWorkflowSuggestions(
	locations: DeskLocationLoad[],
	assignments: UserDeskAssignment[],
	currentTasks: UserCurrentTask[],
	config: SuggestionConfig = DEFAULT_CONFIG
): WorkflowSuggestion {
	const now = new Date();

	// Step 1: Detect and rank breaches
	const breaches = detectBreaches(locations, config);

	if (breaches.length === 0) {
		return {
			generatedAt: now,
			breachesDetected: 0,
			breachesFullyResolved: 0,
			breachesPartiallyResolved: 0,
			resolutions: [],
			affectedUserAssignments: [],
			summary: {
				totalAssignments: 0,
				totalCascades: 0,
				totalUnresolved: 0,
			},
		};
	}

	// Step 2: Build location name lookup (for cascade change labeling)
	const locationNames = new Map<string, string>();
	for (const loc of locations) {
		locationNames.set(loc.deskLocationId, loc.deskLocationName);
	}
	for (const assign of assignments) {
		// Assignments may reference locations not in the load list
		if (!locationNames.has(assign.deskLocationId)) {
			locationNames.set(assign.deskLocationId, assign.deskLocationName);
		}
	}

	// Step 3: Build scored user list
	const scoredUsers = buildScoredUsers(assignments, currentTasks, now, config);

	// Step 4: Initialize assignment state (snapshot of current priorities)
	const initialState = new Map<string, Map<string, number>>();
	for (const user of scoredUsers) {
		initialState.set(user.userId, new Map(user.currentPriorities));
	}
	const state = createAssignmentState(scoredUsers);

	// Step 5: Resolve breaches in severity order
	const allResolutions: BreachResolution[] = [];

	for (const breach of breaches) {
		const resolution = resolveBreach(breach, scoredUsers, state, locationNames);
		allResolutions.push(resolution);
	}

	// Step 6: Build affected user assignments by comparing initial vs final state
	const affectedUserAssignments = buildAffectedUserAssignments(
		scoredUsers,
		initialState,
		state
	);

	// Step 7: Compile summary
	// Discard resolutions with 0 assignments (completely unresolvable breaches)
	// These still count toward totalUnresolved but aren't surfaced as actionable suggestions
	const resolutions: BreachResolution[] = [];
	let breachesFullyResolved = 0;
	let breachesPartiallyResolved = 0;
	let totalAssignments = 0;
	let totalCascades = 0;
	let totalUnresolved = 0;

	for (const res of allResolutions) {
		totalAssignments += res.assignments.length;
		totalCascades += res.cascadedChanges.length;
		totalUnresolved += res.shortfall;

		if (res.assignments.length === 0) {
			// No users could be assigned — unresolvable, don't surface as a suggestion
			continue;
		}

		if (res.shortfall === 0) {
			breachesFullyResolved++;
		} else {
			breachesPartiallyResolved++;
		}
		resolutions.push(res);
	}

	return {
		generatedAt: now,
		breachesDetected: breaches.length,
		breachesFullyResolved,
		breachesPartiallyResolved,
		resolutions,
		affectedUserAssignments,
		summary: {
			totalAssignments,
			totalCascades,
			totalUnresolved,
		},
	};
}

/**
 * Compares initial and final assignment state to produce the complete
 * desired assignment list for each user who was modified.
 *
 * Includes all eligible locations for affected users — locations with
 * an active priority get that priority, locations pushed past P5 or
 * without a priority get null.
 */
function buildAffectedUserAssignments(
	scoredUsers: ScoredUser[],
	initialState: Map<string, Map<string, number>>,
	finalState: AssignmentState
): UserAssignmentState[] {
	const result: UserAssignmentState[] = [];

	for (const user of scoredUsers) {
		const initial = initialState.get(user.userId);
		const final = finalState.userPriorities.get(user.userId);

		// Check if anything changed for this user
		if (!hasStateChanged(initial, final)) {
			continue;
		}

		// Build full assignment list from eligible locations + final priorities
		const assignments: Array<{ deskLocationId: string; priority: number | null }> = [];
		for (const locId of user.eligibleLocationIds) {
			const priority = final?.get(locId) ?? null;
			assignments.push({ deskLocationId: locId, priority });
		}

		result.push({ userId: user.userId, assignments });
	}

	return result;
}

/** Compares two priority maps to detect changes */
function hasStateChanged(
	initial: Map<string, number> | undefined,
	final: Map<string, number> | undefined
): boolean {
	if (!initial && !final) return false;
	if (!initial || !final) return true;
	if (initial.size !== final.size) return true;

	for (const [locId, priority] of initial) {
		if (final.get(locId) !== priority) return true;
	}
	return false;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Converts severity value (0-1) to a human-readable label
 */
export function getSeverityLabel(severity: number): 'Low' | 'Medium' | 'High' {
	if (severity < 0.33) return 'Low';
	if (severity < 0.67) return 'Medium';
	return 'High';
}

/**
 * Gets color configuration for severity label
 */
export function getSeverityColor(severity: number): { bg: string; color: string } {
	const label = getSeverityLabel(severity);
	if (label === 'Low') return { bg: '#fef3c7', color: '#92400e' }; // yellow
	if (label === 'Medium') return { bg: '#fed7aa', color: '#9a3412' }; // orange
	return { bg: '#fee2e2', color: '#991b1b' }; // red
}

// ============================================================================
// SUGGESTION SERIALIZATION (for storage/API response)
// ============================================================================

/** Serializable format for storing suggestions */
export interface SerializedSuggestion {
	generatedAt: string;
	breachesDetected: number;
	breachesFullyResolved: number;
	breachesPartiallyResolved: number;
	resolutions: BreachResolution[];
	affectedUserAssignments: UserAssignmentState[];
	summary: {
		totalAssignments: number;
		totalCascades: number;
		totalUnresolved: number;
	};
}

export function serializeSuggestion(suggestion: WorkflowSuggestion): SerializedSuggestion {
	return {
		...suggestion,
		generatedAt: suggestion.generatedAt.toISOString(),
	};
}

export function deserializeSuggestion(data: SerializedSuggestion): WorkflowSuggestion {
	return {
		generatedAt: new Date(data.generatedAt),
		breachesDetected: data.breachesDetected,
		breachesFullyResolved: data.breachesFullyResolved,
		breachesPartiallyResolved: data.breachesPartiallyResolved,
		resolutions: data.resolutions,
		affectedUserAssignments: data.affectedUserAssignments,
		summary: data.summary,
	};
}

// ============================================================================
// APPLYING APPROVED SUGGESTIONS
// ============================================================================

/**
 * Extracts the full desired assignment state for affected users from an
 * approved suggestion. Returns the format expected by updateUsersDeskAssignments.
 *
 * For partial approval, only users involved in the approved resolutions
 * are included. Their assignment state reflects ALL algorithm changes
 * (since breaches are resolved sequentially and state is cumulative).
 */
export function extractApprovedAssignments(
	suggestion: WorkflowSuggestion,
	approvedResolutionIndices?: number[] // If undefined, approve all
): UserAssignmentState[] {
	if (!approvedResolutionIndices) {
		return suggestion.affectedUserAssignments;
	}

	// Identify which users are involved in approved resolutions
	const approvedUserIds = new Set<string>();
	for (const idx of approvedResolutionIndices) {
		const resolution = suggestion.resolutions[idx];
		if (!resolution) continue;

		for (const assignment of resolution.assignments) {
			approvedUserIds.add(assignment.userId);
		}
		for (const cascade of resolution.cascadedChanges) {
			approvedUserIds.add(cascade.userId);
		}
	}

	return suggestion.affectedUserAssignments.filter((u) =>
		approvedUserIds.has(u.userId)
	);
}
