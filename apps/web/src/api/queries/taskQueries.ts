import type { ProtectedContext } from '@/server/trpc/trpc';
import { sql } from 'kysely';
import { TaskStatus, TaskType } from '@/config/enums';

// ============================================================================
// TASK CRUD OPERATIONS
// ============================================================================

/**
 * Get paginated list of tasks with optional filters
 * Returns { rows, count } for server-side pagination
 */
export async function getTasks(
	ctx: ProtectedContext,
	params: {
		deskLocationId?: number;
		claimId?: number;
		status?: TaskStatus;
		taskType?: TaskType;
		assignedBy?: string;
		claimedBy?: string;
		searchTerm?: string;
		limit?: number;
		offset?: number;
		showCancelled?: boolean;
	}
) {
	// Base query with client scoping
	let query = ctx.db
		.selectFrom('task')
		.leftJoin('desk_location', 'task.desk_location_id', 'desk_location.id')
		.leftJoin('users as assigned_user', 'task.assigned_by', 'assigned_user.id')
		.leftJoin('users as claimed_user', 'task.claimed_by', 'claimed_user.id')
		.leftJoin('claim', 'task.claim_id', 'claim.id')
		.select([
			'task.id',
			'task.client_id',
			'task.claim_id',
			'task.desk_location_id',
			'task.task_type',
			'task.work_units',
			'task.title',
			'task.description',
			'task.due_date',
			'task.status',
			'task.assigned_by',
			'task.assigned_at',
			'task.claimed_by',
			'task.claimed_at',
			'task.completed_by',
			'task.completed_at',
			'task.completion_notes',
			'task.cancelled_by',
			'task.cancelled_at',
			'task.cancellation_reason',
			'task.created_at',
			'task.updated_at',
			'desk_location.name as desk_location_name',
			'assigned_user.first as assigned_by_first',
			'assigned_user.last as assigned_by_last',
			'claimed_user.first as claimed_by_first',
			'claimed_user.last as claimed_by_last',
			'claim.claim_number',
		])
		.where('task.client_id', '=', ctx.session.user.client_id);

	// Filter by cancelled status
	if (!params.showCancelled) {
		query = query.where('task.cancelled_at', 'is', null);
	}

	// Apply filters
	if (params.deskLocationId) {
		query = query.where('task.desk_location_id', '=', params.deskLocationId);
	}

	if (params.claimId) {
		query = query.where('task.claim_id', '=', params.claimId);
	}

	if (params.status) {
		query = query.where('task.status', '=', params.status);
	}

	if (params.taskType) {
		query = query.where('task.task_type', '=', params.taskType);
	}

	if (params.assignedBy) {
		query = query.where('task.assigned_by', '=', params.assignedBy);
	}

	if (params.claimedBy) {
		query = query.where('task.claimed_by', '=', params.claimedBy);
	}

	if (params.searchTerm) {
		query = query.where(sql<boolean>`task.title ILIKE ${`%${params.searchTerm}%`}`);
	}

	// Order by due date (urgent first), then created date
	query = query.orderBy(sql`task.due_date asc nulls last`).orderBy('task.created_at asc');

	// Count query (run in parallel with data query)
	const countQuery = ctx.db
		.selectFrom('task')
		.select(({ fn }) => fn.countAll().as('count'))
		.where('task.client_id', '=', ctx.session.user.client_id)
		.$if(!params.showCancelled, (qb) => qb.where('task.cancelled_at', 'is', null))
		.$if(params.deskLocationId !== undefined, (qb) =>
			qb.where('task.desk_location_id', '=', params.deskLocationId!)
		)
		.$if(params.claimId !== undefined, (qb) => qb.where('task.claim_id', '=', params.claimId!))
		.$if(params.status !== undefined, (qb) => qb.where('task.status', '=', params.status!))
		.$if(params.taskType !== undefined, (qb) => qb.where('task.task_type', '=', params.taskType!))
		.$if(params.assignedBy !== undefined, (qb) =>
			qb.where('task.assigned_by', '=', params.assignedBy!)
		)
		.$if(params.claimedBy !== undefined, (qb) =>
			qb.where('task.claimed_by', '=', params.claimedBy!)
		)
		.$if(params.searchTerm !== undefined, (qb) =>
			qb.where(sql<boolean>`task.title ILIKE ${`%${params.searchTerm}%`}`)
		)
		.executeTakeFirst();

	// Data query with pagination
	const rowsQuery = query
		.$if(params.limit !== undefined, (qb) => qb.limit(params.limit!))
		.$if(params.offset !== undefined, (qb) => qb.offset(params.offset!))
		.execute();

	// Execute in parallel
	const [countResult, rows] = await Promise.all([countQuery, rowsQuery]);

	return {
		rows,
		count: countResult?.count ? Number(countResult.count) : 0,
	};
}

/**
 * Get single task by ID
 */
export async function getTask(ctx: ProtectedContext, id: number) {
	return await ctx.db
		.selectFrom('task')
		.leftJoin('desk_location', 'task.desk_location_id', 'desk_location.id')
		.leftJoin('users as assigned_user', 'task.assigned_by', 'assigned_user.id')
		.leftJoin('users as claimed_user', 'task.claimed_by', 'claimed_user.id')
		.leftJoin('claim', 'task.claim_id', 'claim.id')
		.select([
			'task.id',
			'task.client_id',
			'task.claim_id',
			'task.desk_location_id',
			'task.task_type',
			'task.work_units',
			'task.title',
			'task.description',
			'task.due_date',
			'task.status',
			'task.assigned_by',
			'task.assigned_at',
			'task.claimed_by',
			'task.claimed_at',
			'task.completed_by',
			'task.completed_at',
			'task.completion_notes',
			'task.cancelled_by',
			'task.cancelled_at',
			'task.cancellation_reason',
			'task.created_at',
			'task.updated_at',
			'desk_location.name as desk_location_name',
			'assigned_user.first as assigned_by_first',
			'assigned_user.last as assigned_by_last',
			'claimed_user.first as claimed_by_first',
			'claimed_user.last as claimed_by_last',
			'claim.claim_number',
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
	claimId: number,
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
	deskLocationId: number,
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
 * Optimized to use single query with subquery for desk location filtering
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

	// Build base query with subquery for desk location filtering (single query, no N+1)
	let query = ctx.db
		.selectFrom('task')
		.leftJoin('desk_location', 'task.desk_location_id', 'desk_location.id')
		.leftJoin('user_desk_location', (join) =>
			join
				.onRef('user_desk_location.desk_location_id', '=', 'task.desk_location_id')
				.on('user_desk_location.user_id', '=', userId)
				.on('user_desk_location.removed_at', 'is', null)
		)
		.leftJoin('claim', 'task.claim_id', 'claim.id')
		.select([
			'task.id',
			'task.client_id',
			'task.claim_id',
			'task.desk_location_id',
			'task.task_type',
			'task.work_units',
			'task.title',
			'task.description',
			'task.due_date',
			'task.status',
			'task.assigned_by',
			'task.assigned_at',
			'task.claimed_by',
			'task.claimed_at',
			'task.created_at',
			'desk_location.name as desk_location_name',
			'user_desk_location.priority as user_priority',
			'claim.claim_number',
		])
		.where('task.client_id', '=', ctx.session.user.client_id)
		.where('task.cancelled_at', 'is', null)
		.where('task.desk_location_id', 'in', (eb) =>
			eb
				.selectFrom('user_desk_location')
				.select('desk_location_id')
				.where('user_id', '=', userId)
				.where('removed_at', 'is', null)
		);

	if (params?.status) {
		query = query.where('task.status', '=', params.status);
	}

	// Order by user priority, then due date, then created date
	query = query
		.orderBy('user_desk_location.priority asc')
		.orderBy(sql`task.due_date asc nulls last`)
		.orderBy('task.created_at asc');

	// Count query using same subquery pattern
	const countQuery = ctx.db
		.selectFrom('task')
		.select(({ fn }) => fn.countAll().as('count'))
		.where('task.client_id', '=', ctx.session.user.client_id)
		.where('task.cancelled_at', 'is', null)
		.where('task.desk_location_id', 'in', (eb) =>
			eb
				.selectFrom('user_desk_location')
				.select('desk_location_id')
				.where('user_id', '=', userId)
				.where('removed_at', 'is', null)
		)
		.$if(params?.status !== undefined, (qb) => qb.where('task.status', '=', params!.status!))
		.executeTakeFirst();

	// Data query with pagination
	const rowsQuery = query
		.$if(params?.limit !== undefined, (qb) => qb.limit(params!.limit!))
		.$if(params?.offset !== undefined, (qb) => qb.offset(params!.offset!))
		.execute();

	const [countResult, rows] = await Promise.all([countQuery, rowsQuery]);

	return {
		rows,
		count: countResult?.count ? Number(countResult.count) : 0,
	};
}

/**
 * Create a new task
 */
export async function createTask(
	ctx: ProtectedContext,
	params: {
		claimId: number;
		deskLocationId: number;
		taskType?: TaskType;
		title: string;
		description?: string;
		dueDate?: string;
		workUnits?: number;
	}
) {
	if (!ctx.session.user.client_id) {
		throw new Error('User client_id is required to create task');
	}

	return await ctx.db
		.insertInto('task')
		.values({
			client_id: ctx.session.user.client_id,
			claim_id: params.claimId,
			desk_location_id: params.deskLocationId,
			task_type: params.taskType || TaskType.GENERIC,
			title: params.title,
			description: params.description,
			due_date: params.dueDate ? sql<Date>`${params.dueDate}::date` : undefined,
			work_units: params.workUnits || 2,
			status: TaskStatus.PENDING,
			assigned_by: ctx.session.user.id,
		})
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Update task details
 */
export async function updateTask(
	ctx: ProtectedContext,
	id: number,
	params: {
		title?: string;
		description?: string;
		dueDate?: string | null;
		workUnits?: number;
		deskLocationId?: number;
	}
) {
	// Build update object dynamically - Kysely will infer correct types
	// Possible fields: title, description, due_date, work_units, desk_location_id, updated_at
	const updateValues: {
		[K in 'title' | 'description' | 'due_date' | 'work_units' | 'desk_location_id' | 'updated_at']?: any;
	} = {
		updated_at: sql`now()`,
	};

	if (params.title !== undefined) updateValues.title = params.title;
	if (params.description !== undefined) updateValues.description = params.description;
	if (params.dueDate !== undefined)
		updateValues.due_date = params.dueDate ? sql`${params.dueDate}::date` : null;
	if (params.workUnits !== undefined) updateValues.work_units = params.workUnits;
	if (params.deskLocationId !== undefined) updateValues.desk_location_id = params.deskLocationId;

	return await ctx.db
		.updateTable('task')
		.set(updateValues)
		.where('task.id', '=', id)
		.where('task.client_id', '=', ctx.session.user.client_id)
		.where('task.cancelled_at', 'is', null)
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Claim task (start working on it)
 */
export async function claimTask(ctx: ProtectedContext, id: number) {
	return await ctx.db
		.updateTable('task')
		.set({
			status: TaskStatus.IN_PROGRESS,
			claimed_by: ctx.session.user.id,
			claimed_at: sql`now()`,
			updated_at: sql`now()`,
		})
		.where('task.id', '=', id)
		.where('task.client_id', '=', ctx.session.user.client_id)
		.where('task.status', '=', TaskStatus.PENDING)
		.where('task.cancelled_at', 'is', null)
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Unclaim task (release it back to queue)
 */
export async function unclaimTask(ctx: ProtectedContext, id: number) {
	return await ctx.db
		.updateTable('task')
		.set({
			status: TaskStatus.PENDING,
			claimed_by: null,
			claimed_at: null,
			updated_at: sql`now()`,
		})
		.where('task.id', '=', id)
		.where('task.client_id', '=', ctx.session.user.client_id)
		.where('task.status', '=', TaskStatus.IN_PROGRESS)
		.where('task.cancelled_at', 'is', null)
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Complete task
 */
export async function completeTask(
	ctx: ProtectedContext,
	id: number,
	completionNotes?: string
) {
	return await ctx.db
		.updateTable('task')
		.set({
			status: TaskStatus.COMPLETED,
			completed_by: ctx.session.user.id,
			completed_at: sql`now()`,
			completion_notes: completionNotes,
			updated_at: sql`now()`,
		})
		.where('task.id', '=', id)
		.where('task.client_id', '=', ctx.session.user.client_id)
		.where('task.cancelled_at', 'is', null)
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Cancel task
 */
export async function cancelTask(
	ctx: ProtectedContext,
	id: number,
	cancellationReason: string
) {
	return await ctx.db
		.updateTable('task')
		.set({
			status: TaskStatus.CANCELLED,
			cancelled_by: ctx.session.user.id,
			cancelled_at: sql`now()`,
			cancellation_reason: cancellationReason,
			updated_at: sql`now()`,
		})
		.where('task.id', '=', id)
		.where('task.client_id', '=', ctx.session.user.client_id)
		.where('task.cancelled_at', 'is', null)
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Get desk location capacity usage for a specific date
 * Returns current usage and limit
 */
export async function getDeskCapacity(
	ctx: ProtectedContext,
	deskLocationId: number,
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
	const usageResult = await ctx.db
		.selectFrom('task')
		.select(({ fn }) => fn.sum('work_units').as('total_work_units'))
		.where('task.desk_location_id', '=', deskLocationId)
		.where('task.client_id', '=', ctx.session.user.client_id)
		.where('task.status', 'in', [TaskStatus.PENDING, TaskStatus.IN_PROGRESS])
		.where('task.cancelled_at', 'is', null)
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
 * Get task counts by status for a desk location
 */
export async function getTaskCountsByStatus(ctx: ProtectedContext, deskLocationId: number) {
	const result = await ctx.db
		.selectFrom('task')
		.select(['status', ({ fn }) => fn.countAll().as('count')])
		.where('task.desk_location_id', '=', deskLocationId)
		.where('task.client_id', '=', ctx.session.user.client_id)
		.where('task.cancelled_at', 'is', null)
		.groupBy('status')
		.execute();

	return {
		pending: Number(result.find((r) => r.status === TaskStatus.PENDING)?.count || 0),
		in_progress: Number(result.find((r) => r.status === TaskStatus.IN_PROGRESS)?.count || 0),
		completed: Number(result.find((r) => r.status === TaskStatus.COMPLETED)?.count || 0),
	};
}

// ============================================================================
// ADMIN TASK MANAGEMENT
// ============================================================================

/**
 * Get all tasks with due_date within a given week range
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
		.leftJoin('users as assigned_user', 'task.assigned_by', 'assigned_user.id')
		.leftJoin('users as claimed_user', 'task.claimed_by', 'claimed_user.id')
		.leftJoin('claim', 'task.claim_id', 'claim.id')
		.select([
			'task.id',
			'task.client_id',
			'task.claim_id',
			'task.desk_location_id',
			'task.task_type',
			'task.work_units',
			'task.title',
			'task.description',
			'task.due_date',
			'task.status',
			'task.assigned_by',
			'task.assigned_at',
			'task.claimed_by',
			'task.claimed_at',
			'task.completed_by',
			'task.completed_at',
			'task.completion_notes',
			'task.cancelled_by',
			'task.cancelled_at',
			'task.cancellation_reason',
			'task.created_at',
			'task.updated_at',
			'desk_location.name as desk_location_name',
			'assigned_user.first as assigned_by_first',
			'assigned_user.last as assigned_by_last',
			'claimed_user.first as claimed_by_first',
			'claimed_user.last as claimed_by_last',
			'claim.claim_number',
		])
		.where('task.client_id', '=', ctx.session.user.client_id)
		.where('task.due_date', '>=', sql<Date>`${params.weekStart}::date`)
		.where('task.due_date', '<=', sql<Date>`${params.weekEnd}::date`)
		.orderBy('task.due_date', 'asc')
		.orderBy('task.created_at', 'asc')
		.execute();

	return { rows };
}

/**
 * Bulk cancel multiple tasks with the same cancellation reason
 * Used for admin bulk task management
 */
export async function bulkCancelTasks(
	ctx: ProtectedContext,
	params: {
		ids: number[];
		cancellationReason: string;
	}
) {
	if (params.ids.length === 0) {
		return { cancelledCount: 0 };
	}

	const result = await ctx.db
		.updateTable('task')
		.set({
			status: TaskStatus.CANCELLED,
			cancelled_by: ctx.session.user.id,
			cancelled_at: sql`now()`,
			cancellation_reason: params.cancellationReason,
			updated_at: sql`now()`,
		})
		.where('task.id', 'in', params.ids)
		.where('task.client_id', '=', ctx.session.user.client_id)
		.where('task.cancelled_at', 'is', null) // Only cancel tasks not already cancelled
		.executeTakeFirst();

	return {
		cancelledCount: Number(result.numUpdatedRows || 0),
	};
}
