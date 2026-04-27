import type { ProtectedContext } from '@/server/trpc/trpc';
import { sql } from 'kysely';
import {
	DeadlineEntityType,
	DeadlineStatus,
	DerivedTaskStatus,
	TaskStatus,
	TaskType,
} from '@/config/enums';

// ============================================================================
// SHARED SQL HELPERS
// ============================================================================

/**
 * Derived status expression based on task.status column
 * Used for queries that select task.status directly (getTasks)
 *
 * Logic:
 * - task.status = 'cancelled' → cancelled
 * - task.status = 'completed' AND deadline.status = 'met' → completed_on_time
 * - task.status = 'completed' AND deadline.status = 'missed' → completed_late
 * - task.status = 'completed' (no deadline or pending) → completed_on_time
 * - task.status = 'in_progress' → in_progress
 * - task.status = 'pending' → available
 */
const derivedStatusFromTaskStatus = sql<string>`
	CASE
		WHEN task.status = 'cancelled' THEN 'cancelled'
		WHEN task.status = 'completed' AND deadline.status = 'met' THEN 'completed_on_time'
		WHEN task.status = 'completed' AND deadline.status = 'missed' THEN 'completed_late'
		WHEN task.status = 'completed' THEN 'completed_on_time'
		WHEN task.status = 'in_progress' THEN 'in_progress'
		WHEN task.status = 'pending' THEN 'available'
		ELSE 'available'
	END
`;

/**
 * Derived status expression based on deadline.status and task columns
 * Used for queries that derive status from deadline state (getTask, getTasksForUser, etc.)
 *
 * Logic:
 * - deadline.status = 'cancelled' → cancelled
 * - task.completed_at IS NOT NULL AND deadline.status = 'met' → completed_on_time
 * - task.completed_at IS NOT NULL AND deadline.status = 'missed' → completed_late
 * - task.status = 'in_progress' AND deadline.status = 'pending' → in_progress
 * - task.status = 'pending' AND deadline.status = 'pending' → available
 */
const derivedStatusFromDeadline = sql<string>`
	CASE
		WHEN deadline.status = 'cancelled' THEN 'cancelled'
		WHEN task.completed_at IS NOT NULL AND deadline.status = 'met' THEN 'completed_on_time'
		WHEN task.completed_at IS NOT NULL AND deadline.status = 'missed' THEN 'completed_late'
		WHEN task.status = 'in_progress' AND deadline.status = 'pending' THEN 'in_progress'
		WHEN task.status = 'pending' AND deadline.status = 'pending' THEN 'available'
		ELSE 'available'
	END
`;

// ============================================================================
// TASK CRUD OPERATIONS
// ============================================================================

/**
 * Get paginated list of tasks with optional filters
 * Returns { rows, count } for server-side pagination
 *
 * Uses single query with COUNT(*) OVER() for both data and count (avoids duplicate query).
 * Uses prefix search (term%) for index usage on task.title.
 */
export async function getTasks(
	ctx: ProtectedContext,
	params: {
		deskLocationId?: string;
		claimId?: string;
		status?: TaskStatus;
		taskType?: TaskType;
		assignedTo?: string;
		searchTerm?: string;
		limit?: number;
		offset?: number;
		showCancelled?: boolean;
	}
) {
	// Base query with client scoping and deadline join
	let baseQuery = ctx.db
		.selectFrom('task')
		.leftJoin('desk_location', 'task.desk_location_id', 'desk_location.id')
		.leftJoin('users as assigned_user', 'task.assigned_to', 'assigned_user.id')
		.leftJoin('claim', 'task.claim_id', 'claim.id')
		.leftJoin('deadline', (join) =>
			join
				.onRef('deadline.entity_id', '=', 'task.id')
				.on('deadline.entity_type', '=', DeadlineEntityType.TASK)
		)
		.where('task.client_id', '=', ctx.session.user.client_id);

	// Filter by cancelled status
	if (!params.showCancelled) {
		baseQuery = baseQuery.where('task.status', '!=', TaskStatus.CANCELLED);
	}

	// Apply filters
	if (params.deskLocationId !== undefined) {
		baseQuery = baseQuery.where('task.desk_location_id', '=', params.deskLocationId);
	}
	if (params.claimId !== undefined) {
		baseQuery = baseQuery.where('task.claim_id', '=', params.claimId);
	}
	if (params.status !== undefined) {
		baseQuery = baseQuery.where('task.status', '=', params.status);
	}
	if (params.taskType !== undefined) {
		baseQuery = baseQuery.where('task.task_type', '=', params.taskType);
	}
	if (params.assignedTo !== undefined) {
		baseQuery = baseQuery.where('task.assigned_to', '=', params.assignedTo);
	}
	// Prefix search for index usage (term% instead of %term%)
	if (params.searchTerm !== undefined) {
		baseQuery = baseQuery.where(sql<boolean>`task.title ILIKE ${`${params.searchTerm}%`}`);
	}

	// Single query with COUNT(*) OVER() for total count
	const rowsWithCount = await baseQuery
		.select([
			'task.id',
			'task.client_id',
			'task.claim_id',
			'task.desk_location_id',
			'task.task_type',
			'task.status',
			'task.work_units',
			'task.title',
			'task.description',
			'task.assigned_to',
			'task.assigned_at',
			'task.started_at',
			'task.completed_at',
			'task.completion_notes',
			'task.created_at',
			'task.updated_at',
			'desk_location.name as desk_location_name',
			'assigned_user.first as assigned_to_first',
			'assigned_user.last as assigned_to_last',
			'claim.claim_number',
			// Deadline fields
			'deadline.id as deadline_id',
			'deadline.deadline_date',
			'deadline.deadline_type',
			'deadline.description as deadline_description',
			'deadline.status as deadline_status',
			// Derived status using shared helper
			derivedStatusFromTaskStatus.as('derived_status'),
			// Window function for total count
			sql<string>`COUNT(*) OVER()`.as('total_count'),
		])
		.orderBy(sql`deadline.deadline_date asc nulls last`)
		.orderBy('task.created_at asc')
		.$if(params.limit !== undefined, (qb) => qb.limit(params.limit!))
		.$if(params.offset !== undefined, (qb) => qb.offset(params.offset!))
		.execute();

	// Extract count from first row (or default to 0 if empty)
	const count = rowsWithCount.length > 0 ? parseInt(rowsWithCount[0].total_count ?? '0') : 0;

	// Strip the total_count column from results
	const rows = rowsWithCount.map(({ total_count, ...rest }) => rest);

	return { rows, count };
}

/**
 * Get single task by ID
 */
export async function getTask(ctx: ProtectedContext, id: string) {
	return await ctx.db
		.selectFrom('task')
		.leftJoin('desk_location', 'task.desk_location_id', 'desk_location.id')
		.leftJoin('users as assigned_user', 'task.assigned_to', 'assigned_user.id')
		.leftJoin('claim', 'task.claim_id', 'claim.id')
		.leftJoin('deadline', (join) =>
			join
				.onRef('deadline.entity_id', '=', 'task.id')
				.on('deadline.entity_type', '=', DeadlineEntityType.TASK)
		)
		.select([
			'task.id',
			'task.client_id',
			'task.claim_id',
			'task.desk_location_id',
			'task.task_type',
			'task.status',
			'task.work_units',
			'task.title',
			'task.description',
			'task.assigned_to',
			'task.assigned_at',
			'task.started_at',
			'task.completed_at',
			'task.completion_notes',
			'task.created_at',
			'task.updated_at',
			'desk_location.name as desk_location_name',
			'assigned_user.first as assigned_to_first',
			'assigned_user.last as assigned_to_last',
			'claim.claim_number',
			// Deadline fields
			'deadline.id as deadline_id',
			'deadline.deadline_date',
			'deadline.deadline_type',
			'deadline.description as deadline_description',
			'deadline.status as deadline_status',
			// Derived status using shared helper
			derivedStatusFromDeadline.as('derived_status'),
		])
		.where('task.id', '=', id)
		.where('task.client_id', '=', ctx.session.user.client_id)
		.executeTakeFirst();
}

/**
 * Get tasks for a specific claim
 */
export async function getTasksByClaim(
	ctx: ProtectedContext,
	claimId: string,
	showCancelled?: boolean
) {
	return await getTasks(ctx, {
		claimId,
		showCancelled,
	});
}

/**
 * Get tasks for a specific desk location
 */
export async function getTasksByDeskLocation(
	ctx: ProtectedContext,
	deskLocationId: string,
	params?: {
		status?: TaskStatus;
		showCancelled?: boolean;
		limit?: number;
		offset?: number;
	}
) {
	return await getTasks(ctx, {
		deskLocationId,
		...params,
	});
}

/**
 * Get tasks visible to a specific user (via their desk location assignments)
 *
 * Uses EXISTS for desk location access check (avoids duplicate rows).
 * Uses single query with COUNT(*) OVER() for both data and count.
 * Keeps LEFT JOIN on user_desk_location for priority ordering only.
 */
export async function getTasksForUser(
	ctx: ProtectedContext,
	params?: {
		userId?: string;
		status?: TaskStatus;
		limit?: number;
		offset?: number;
	}
) {
	const userId = params?.userId || ctx.session.user.id;

	// Base query with EXISTS for desk location access check
	let baseQuery = ctx.db
		.selectFrom('task')
		.leftJoin('desk_location', 'task.desk_location_id', 'desk_location.id')
		.leftJoin('user_desk_location', (join) =>
			join
				.onRef('user_desk_location.desk_location_id', '=', 'task.desk_location_id')
				.on('user_desk_location.user_id', '=', userId)
				.on('user_desk_location.removed_at', 'is', null)
		)
		.leftJoin('claim', 'task.claim_id', 'claim.id')
		.leftJoin('deadline', (join) =>
			join
				.onRef('deadline.entity_id', '=', 'task.id')
				.on('deadline.entity_type', '=', DeadlineEntityType.TASK)
		)
		.where('task.client_id', '=', ctx.session.user.client_id)
		.where('task.status', '!=', TaskStatus.CANCELLED)
		// Use EXISTS for access check (replaces IN subquery, avoids duplicates)
		.where((eb) =>
			eb.exists(
				eb
					.selectFrom('user_desk_location as udl_access')
					.select(sql`1`.as('one'))
					.whereRef('udl_access.desk_location_id', '=', 'task.desk_location_id')
					.where('udl_access.user_id', '=', userId)
					.where('udl_access.removed_at', 'is', null)
			)
		);

	if (params?.status !== undefined) {
		baseQuery = baseQuery.where('task.status', '=', params.status);
	}

	// Single query with COUNT(*) OVER() for total count
	const rowsWithCount = await baseQuery
		.select([
			'task.id',
			'task.client_id',
			'task.claim_id',
			'task.desk_location_id',
			'task.task_type',
			'task.work_units',
			'task.title',
			'task.description',
			'task.assigned_to',
			'task.assigned_at',
			'task.started_at',
			'task.created_at',
			'desk_location.name as desk_location_name',
			'user_desk_location.priority as user_priority',
			'claim.claim_number',
			// Deadline fields
			'deadline.id as deadline_id',
			'deadline.deadline_date',
			'deadline.deadline_type',
			'deadline.description as deadline_description',
			'deadline.status as deadline_status',
			// Derived status using shared helper
			derivedStatusFromDeadline.as('derived_status'),
			// Window function for total count
			sql<string>`COUNT(*) OVER()`.as('total_count'),
		])
		.orderBy('user_desk_location.priority asc')
		.orderBy(sql`deadline.deadline_date asc nulls last`)
		.orderBy('task.created_at asc')
		.$if(params?.limit !== undefined, (qb) => qb.limit(params!.limit!))
		.$if(params?.offset !== undefined, (qb) => qb.offset(params!.offset!))
		.execute();

	// Extract count from first row (or default to 0 if empty)
	const count = rowsWithCount.length > 0 ? parseInt(rowsWithCount[0].total_count ?? '0') : 0;

	// Strip the total_count column from results
	const rows = rowsWithCount.map(({ total_count, ...rest }) => rest);

	return { rows, count };
}

/**
 * Create a new task
 * If deadlineDate is provided, creates a linked deadline record automatically
 * Uses transaction to ensure task and deadline are created atomically
 */
export async function createTask(
	ctx: ProtectedContext,
	params: {
		claimId: string;
		deskLocationId: string;
		taskType?: TaskType;
		title: string;
		description?: string;
		assignedTo?: string;
		workUnits?: number;
		deadlineDate?: string;
		deadlineDescription?: string;
	}
) {
	if (!ctx.session.user.client_id) {
		throw new Error('User client_id is required to create task');
	}

	const executeOperation = async (db: typeof ctx.db) => {
		// Create the task
		const task = await db
			.insertInto('task')
			.values({
				client_id: ctx.session.user.client_id!,
				claim_id: params.claimId,
				desk_location_id: params.deskLocationId,
				task_type: params.taskType || TaskType.GENERIC,
				status: TaskStatus.PENDING,
				title: params.title,
				description: params.description,
				work_units: params.workUnits || 2,
				assigned_to: params.assignedTo,
			})
			.returningAll()
			.executeTakeFirstOrThrow();

		// If deadline date provided, create linked deadline
		if (params.deadlineDate) {
			await db
				.insertInto('deadline')
				.values({
					client_id: ctx.session.user.client_id!,
					claim_id: params.claimId,
					entity_type: DeadlineEntityType.TASK,
					entity_id: task.id,
					deadline_type: params.taskType || TaskType.GENERIC,
					deadline_date: sql<Date>`${params.deadlineDate}::date`,
					description: params.deadlineDescription || params.title,
					status: DeadlineStatus.PENDING,
					created_by: ctx.session.user.id,
				})
				.execute();
		}

		return task;
	};

	// Check if we're already in a transaction to avoid nested transactions
	if (ctx.db.isTransaction) {
		return await executeOperation(ctx.db);
	}
	return await ctx.db.transaction().execute(executeOperation);
}

/**
 * Assign task to a user
 * Sets assigned_to without changing task status
 */
export async function assignTask(ctx: ProtectedContext, id: string, userId: string) {
	return await ctx.db
		.updateTable('task')
		.set({
			assigned_to: userId,
			updated_at: sql`now()`,
		})
		.where('task.id', '=', id)
		.where('task.client_id', '=', ctx.session.user.client_id)
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Get task ownership info for authorization checks
 * Lightweight query that only fetches fields needed for ownership verification
 */
export async function getTaskOwnership(ctx: ProtectedContext, id: string) {
	return await ctx.db
		.selectFrom('task')
		.select(['task.id', 'task.assigned_to', 'task.status'])
		.where('task.id', '=', id)
		.where('task.client_id', '=', ctx.session.user.client_id)
		.executeTakeFirst();
}

/**
 * Unassign task (clear assigned_to)
 * Only allowed on pending tasks
 */
export async function unassignTask(ctx: ProtectedContext, id: string) {
	return await ctx.db
		.updateTable('task')
		.set({
			assigned_to: null,
			started_at: null,
			status: TaskStatus.PENDING,
			updated_at: sql`now()`,
		})
		.where('task.id', '=', id)
		.where('task.client_id', '=', ctx.session.user.client_id)
		.where((eb) =>
			eb.or([
				eb('task.status', '=', TaskStatus.PENDING),
				eb('task.status', '=', TaskStatus.IN_PROGRESS),
			])
		)
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Start task (begin working on it)
 * Sets status to IN_PROGRESS
 */
export async function startTask(ctx: ProtectedContext, id: string) {
	return await ctx.db
		.updateTable('task')
		.set({
			status: TaskStatus.IN_PROGRESS,
			started_at: sql`now()`,
			updated_at: sql`now()`,
		})
		.where('task.id', '=', id)
		.where('task.client_id', '=', ctx.session.user.client_id)
		.where('task.status', '=', TaskStatus.PENDING)
		.where('task.started_at', 'is', null)
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Update task details
 * Updates the linked deadline if dueDate is provided
 * Uses transaction to ensure task and deadline are updated atomically
 */
export async function updateTask(
	ctx: ProtectedContext,
	id: string,
	params: {
		title?: string;
		description?: string;
		dueDate?: string | null;
		workUnits?: number;
		deskLocationId?: string;
	}
) {
	const executeOperation = async (db: typeof ctx.db) => {
		// Update task fields
		const task = await db
			.updateTable('task')
			.set({
				...(params.title !== undefined && { title: params.title }),
				...(params.description !== undefined && { description: params.description }),
				...(params.workUnits !== undefined && { work_units: params.workUnits }),
				...(params.deskLocationId !== undefined && { desk_location_id: params.deskLocationId }),
				updated_at: sql`now()`,
			})
			.where('task.id', '=', id)
			.where('task.client_id', '=', ctx.session.user.client_id)
			.returningAll()
			.executeTakeFirstOrThrow();

		// Update linked deadline's due date if provided
		if (params.dueDate !== undefined) {
			if (params.dueDate === null) {
				// If dueDate is null, cancel the existing deadline
				await db
					.updateTable('deadline')
					.set({
						status: DeadlineStatus.CANCELLED,
						cancelled_at: sql`now()`,
						cancelled_by: ctx.session.user.id,
						cancellation_reason: 'Due date removed',
					})
					.where('deadline.entity_type', '=', DeadlineEntityType.TASK)
					.where('deadline.entity_id', '=', id)
					.where('deadline.status', '=', DeadlineStatus.PENDING)
					.execute();
			} else {
				// Update the deadline date
				await db
					.updateTable('deadline')
					.set({
						deadline_date: sql<Date>`${params.dueDate}::date`,
					})
					.where('deadline.entity_type', '=', DeadlineEntityType.TASK)
					.where('deadline.entity_id', '=', id)
					.where('deadline.status', '=', DeadlineStatus.PENDING)
					.execute();
			}
		}

		return task;
	};

	// Check if we're already in a transaction to avoid nested transactions
	if (ctx.db.isTransaction) {
		return await executeOperation(ctx.db);
	}
	return await ctx.db.transaction().execute(executeOperation);
}

/**
 * Complete task and sync linked deadline status to 'met' or 'missed'
 * Uses transaction to ensure task and deadline are updated atomically
 */
export async function completeTask(
	ctx: ProtectedContext,
	id: string,
	completionNotes?: string
) {
	const executeOperation = async (db: typeof ctx.db) => {
		// Update task completion fields
		const task = await db
			.updateTable('task')
			.set({
				status: TaskStatus.COMPLETED,
				completed_at: sql`now()`,
				completion_notes: completionNotes,
				updated_at: sql`now()`,
			})
			.where('task.id', '=', id)
			.where('task.client_id', '=', ctx.session.user.client_id)
			.where('task.status', '!=', TaskStatus.COMPLETED) // Only complete if not already completed
			.where('task.status', '!=', TaskStatus.CANCELLED) // Don't complete cancelled tasks
			.returningAll()
			.executeTakeFirstOrThrow();

		// Update linked deadline status to 'met' or 'missed' based on deadline_date
		await db
			.updateTable('deadline')
			.set({
				status: sql<DeadlineStatus>`
					CASE
						WHEN deadline_date >= CURRENT_DATE THEN 'met'
						ELSE 'missed'
					END
				`,
				completed_at: sql`now()`,
				completed_by: ctx.session.user.id,
			})
			.where('deadline.entity_type', '=', DeadlineEntityType.TASK)
			.where('deadline.entity_id', '=', id)
			.where('deadline.status', '=', DeadlineStatus.PENDING)
			.execute();

		return task;
	};

	// Check if we're already in a transaction to avoid nested transactions
	if (ctx.db.isTransaction) {
		return await executeOperation(ctx.db);
	}
	return await ctx.db.transaction().execute(executeOperation);
}

/**
 * Cancel task
 * Sets task status to CANCELLED and cancels linked deadline
 */
export async function cancelTask(
	ctx: ProtectedContext,
	id: string,
	cancellationReason: string
) {
	// Update task status to cancelled
	const task = await ctx.db
		.updateTable('task')
		.set({
			status: TaskStatus.CANCELLED,
			updated_at: sql`now()`,
		})
		.where('task.id', '=', id)
		.where('task.client_id', '=', ctx.session.user.client_id)
		.where('task.status', '!=', TaskStatus.CANCELLED) // Don't cancel if already cancelled
		.where('task.status', '!=', TaskStatus.COMPLETED) // Don't cancel completed tasks
		.returningAll()
		.executeTakeFirstOrThrow();

	// Cancel the linked deadline
	await ctx.db
		.updateTable('deadline')
		.set({
			status: DeadlineStatus.CANCELLED,
			cancelled_at: sql`now()`,
			cancelled_by: ctx.session.user.id,
			cancellation_reason: cancellationReason,
		})
		.where('deadline.entity_type', '=', DeadlineEntityType.TASK)
		.where('deadline.entity_id', '=', id)
		.where('deadline.status', '!=', DeadlineStatus.CANCELLED) // Don't cancel if already cancelled
		.execute();

	return task;
}

/**
 * Get desk location capacity usage for a specific date
 * Returns current usage and limit
 */
export async function getDeskCapacity(
	ctx: ProtectedContext,
	deskLocationId: string,
	date?: string
) {
	const targetDate = date || new Date().toISOString().split('T')[0];

	// Get desk location with capacity limit
	const deskLocation = await ctx.db
		.selectFrom('desk_location')
		.select(['id', 'name', 'daily_work_units'])
		.where('desk_location.id', '=', deskLocationId)
		.where('desk_location.client_id', '=', ctx.session.user.client_id)
		.executeTakeFirst();

	if (!deskLocation) {
		throw new Error('Desk location not found');
	}

	// Get current usage (sum of work units for pending/in_progress tasks assigned on target date)
	// Both must have completed_at IS NULL and deadline.status = 'pending'
	const usageResult = await ctx.db
		.selectFrom('task')
		.leftJoin('deadline', (join) =>
			join
				.onRef('deadline.entity_id', '=', 'task.id')
				.on('deadline.entity_type', '=', DeadlineEntityType.TASK)
		)
		.select(({ fn }) => fn.sum('task.work_units').as('total_work_units'))
		.where('task.desk_location_id', '=', deskLocationId)
		.where('task.client_id', '=', ctx.session.user.client_id)
		.where('task.completed_at', 'is', null)
		.where((eb) =>
			eb.or([
				eb('deadline.status', '=', DeadlineStatus.PENDING),
				eb('deadline.status', 'is', null),
			])
		)
		.where(sql<boolean>`DATE(task.assigned_at) = ${targetDate}::date`)
		.executeTakeFirst();

	return {
		deskLocationId,
		deskLocationName: deskLocation.name,
		date: targetDate,
		usedWorkUnits: Number(usageResult?.total_work_units || 0),
		dailyWorkUnitsLimit: deskLocation.daily_work_units,
		isAtCapacity:
			deskLocation.daily_work_units !== null &&
			Number(usageResult?.total_work_units || 0) >= deskLocation.daily_work_units,
	};
}

/**
 * Get task counts by derived status for a desk location
 */
export async function getTaskCountsByStatus(ctx: ProtectedContext, deskLocationId: string) {
	const result = await ctx.db
		.selectFrom('task')
		.leftJoin('deadline', (join) =>
			join
				.onRef('deadline.entity_id', '=', 'task.id')
				.on('deadline.entity_type', '=', DeadlineEntityType.TASK)
		)
		.select([derivedStatusFromDeadline.as('derived_status'), ({ fn }) => fn.countAll().as('count')])
		.where('task.desk_location_id', '=', deskLocationId)
		.where('task.client_id', '=', ctx.session.user.client_id)
		.where((eb) =>
			eb.or([
				eb('deadline.status', '!=', DeadlineStatus.CANCELLED),
				eb('deadline.status', 'is', null),
			])
		)
		.groupBy(derivedStatusFromDeadline)
		.execute();

	return {
		available: Number(result.find((r) => r.derived_status === DerivedTaskStatus.AVAILABLE)?.count || 0),
		in_progress: Number(
			result.find((r) => r.derived_status === DerivedTaskStatus.IN_PROGRESS)?.count || 0
		),
		completed_on_time: Number(
			result.find((r) => r.derived_status === DerivedTaskStatus.COMPLETED_ON_TIME)?.count || 0
		),
		completed_late: Number(
			result.find((r) => r.derived_status === DerivedTaskStatus.COMPLETED_LATE)?.count || 0
		),
	};
}

// ============================================================================
// ADMIN TASK MANAGEMENT
// ============================================================================

/**
 * Get all tasks with deadline_date within a given week range
 * Used for admin task management view with client-side filtering
 */
export async function getTasksByDueDateWeek(
	ctx: ProtectedContext,
	params: {
		weekStart: string; // ISO date string (YYYY-MM-DD)
		weekEnd: string; // ISO date string (YYYY-MM-DD)
	}
) {
	const rows = await ctx.db
		.selectFrom('task')
		.leftJoin('desk_location', 'task.desk_location_id', 'desk_location.id')
		.leftJoin('users as assigned_user', 'task.assigned_to', 'assigned_user.id')
		.leftJoin('claim', 'task.claim_id', 'claim.id')
		.leftJoin('deadline', (join) =>
			join
				.onRef('deadline.entity_id', '=', 'task.id')
				.on('deadline.entity_type', '=', DeadlineEntityType.TASK)
		)
		.select([
			'task.id',
			'task.client_id',
			'task.claim_id',
			'task.desk_location_id',
			'task.task_type',
			'task.status',
			'task.work_units',
			'task.title',
			'task.description',
			'task.assigned_to',
			'task.assigned_at',
			'task.started_at',
			'task.completed_at',
			'task.completion_notes',
			'task.created_at',
			'task.updated_at',
			'desk_location.name as desk_location_name',
			'assigned_user.first as assigned_to_first',
			'assigned_user.last as assigned_to_last',
			'claim.claim_number',
			// Deadline fields
			'deadline.id as deadline_id',
			'deadline.deadline_date',
			'deadline.deadline_type',
			'deadline.description as deadline_description',
			'deadline.status as deadline_status',
			// Derived status using shared helper
			derivedStatusFromDeadline.as('derived_status'),
		])
		.where('task.client_id', '=', ctx.session.user.client_id)
		.where('deadline.deadline_date', '>=', sql<Date>`${params.weekStart}::date`)
		.where('deadline.deadline_date', '<=', sql<Date>`${params.weekEnd}::date`)
		.orderBy('deadline.deadline_date', 'asc')
		.orderBy('task.created_at', 'asc')
		.execute();

	return { rows };
}

/**
 * Bulk cancel multiple tasks by cancelling their linked deadlines
 * Used for admin bulk task management
 */
export async function bulkCancelTasks(
	ctx: ProtectedContext,
	params: {
		ids: string[];
		cancellationReason: string;
	}
) {
	if (params.ids.length === 0) {
		return { cancelledCount: 0 };
	}

	// Update task statuses to cancelled
	const taskResult = await ctx.db
		.updateTable('task')
		.set({
			status: TaskStatus.CANCELLED,
			updated_at: sql`now()`,
		})
		.where('task.id', 'in', params.ids)
		.where('task.client_id', '=', ctx.session.user.client_id)
		.where('task.status', '!=', TaskStatus.CANCELLED) // Only cancel tasks not already cancelled
		.where('task.status', '!=', TaskStatus.COMPLETED) // Don't cancel completed tasks
		.executeTakeFirst();

	// Cancel all linked deadlines for these tasks
	await ctx.db
		.updateTable('deadline')
		.set({
			status: DeadlineStatus.CANCELLED,
			cancelled_at: sql`now()`,
			cancelled_by: ctx.session.user.id,
			cancellation_reason: params.cancellationReason,
		})
		.where('deadline.entity_type', '=', DeadlineEntityType.TASK)
		.where('deadline.entity_id', 'in', params.ids)
		.where('deadline.client_id', '=', ctx.session.user.client_id)
		.where('deadline.status', '!=', DeadlineStatus.CANCELLED) // Only cancel deadlines not already cancelled
		.execute();

	return {
		cancelledCount: Number(taskResult.numUpdatedRows || 0),
	};
}
