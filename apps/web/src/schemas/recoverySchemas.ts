import { z } from 'zod';
import { parseDate, parseNumber } from '@/lib/parsers/zodParsers';
import { DeadlineStatus, RecoveryStatus } from '@/config/enums';

// =====================================================================
// RECOVERY EVENT SCHEMAS
// =====================================================================

export const recoveryEventParams = z
	.object({
		claim_id: z.number().int(),
		recovery_date: parseDate(),
		recovery_amount: parseNumber(),
		recovery_source: z.string().nullable().optional(),
		notes: z.string().nullable().optional(),
	})
	.strict();

export type RecoveryEventParams = z.infer<typeof recoveryEventParams>;

export const recoveryEventUpdateParams = recoveryEventParams
	.omit({ claim_id: true })
	.partial();

export type RecoveryEventUpdateParams = z.infer<typeof recoveryEventUpdateParams>;

export const createRecoveryEventInput = z.object({
	claimId: z.number().int(),
	params: recoveryEventParams.omit({ claim_id: true }),
});

export const updateRecoveryEventInput = z.object({
	recoveryEventId: z.number().int(),
	params: recoveryEventUpdateParams,
});

export const deleteRecoveryEventInput = z.object({
	recoveryEventId: z.number().int(),
	claimId: z.number().int(),
});

export const listRecoveryEventsInput = z.object({
	claimId: z.number().int(),
});

export const listRecoveryEventsWithFiltersInput = z.object({
	filters: z.object({
		range: z.tuple([parseDate(), parseDate()]).optional(),
		recoverySource: z.string().optional(),
		recoveryStatus: z.nativeEnum(RecoveryStatus).optional(),
		checklistId: z.number().int().optional(),
		userId: z.string().uuid().optional(),
	}),
	limit: z.number().int().positive().optional(),
	offset: z.number().int().nonnegative().optional(),
});

export const exportRecoveryEventsInput = z.object({
	filters: z.object({
		range: z.tuple([parseDate(), parseDate()]).optional(),
		recoverySource: z.string().optional(),
		recoveryStatus: z.nativeEnum(RecoveryStatus).optional(),
		checklistId: z.number().int().optional(),
		userId: z.string().uuid().optional(),
	}),
});

// =====================================================================
// DEADLINE SCHEMAS
// =====================================================================

export const deadlineParams = z
	.object({
		claim_id: z.number().int(),
		deadline_type: z.string().min(1),
		deadline_date: parseDate(),
		description: z.string().nullable().optional(),
		status: z.nativeEnum(DeadlineStatus).optional(),
	})
	.strict();

export type DeadlineParams = z.infer<typeof deadlineParams>;

export const deadlineUpdateParams = deadlineParams
	.omit({ claim_id: true })
	.partial();

export type DeadlineUpdateParams = z.infer<typeof deadlineUpdateParams>;

export const createDeadlineInput = z.object({
	claimId: z.number().int(),
	params: deadlineParams.omit({ claim_id: true }),
});

export const updateDeadlineInput = z.object({
	deadlineId: z.number().int(),
	params: deadlineUpdateParams,
});

export const deleteDeadlineInput = z.object({
	deadlineId: z.number().int(),
});

export const listDeadlinesInput = z.object({
	claimId: z.number().int().optional(),
	status: z.nativeEnum(DeadlineStatus).optional(),
	dateRange: z.tuple([parseDate(), parseDate()]).optional(),
	personalOnly: z.boolean().optional(),
});

export const updateDeadlineStatusInput = z.object({
	deadlineId: z.number().int(),
	status: z.nativeEnum(DeadlineStatus),
});

// =====================================================================
// RECOVERY METRICS SCHEMAS
// =====================================================================

const recoveryMetricsFilters = z.object({
	range: z.tuple([parseDate(), parseDate()]),
	recoverySource: z.string().optional(),
	recoveryStatus: z.nativeEnum(RecoveryStatus).optional(),
	checklistId: z.number().int().optional(),
	userId: z.string().uuid().optional(),
});

export const getRecoveryMetricsSummaryInput = recoveryMetricsFilters;

export const getRecoveryMetricsTimeSeriesInput = recoveryMetricsFilters;

export const getQuarterlyRecoveryStatsInput = z.object({
	fiscalYearStart: parseDate().optional(),
	userId: z.string().uuid().optional(),
});
