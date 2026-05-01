import { z } from 'zod';
import { parseDate, parseNumber } from '@/lib/parsers/zodParsers';
import { RecoveryStatus } from '@/config/enums';

// =====================================================================
// RECOVERY EVENT SCHEMAS
// =====================================================================

export const recoveryEventParams = z
	.object({
		claim_id: z.string().uuid(),
		settlement_id: z.string().uuid(),
		recovery_date: parseDate(),
		recovery_amount: parseNumber(),
		recovery_source: z.string().nullable().optional(),
		notes: z.string().nullable().optional(),
	})
	.strict();

export type RecoveryEventParams = z.infer<typeof recoveryEventParams>;

export const recoveryEventUpdateParams = recoveryEventParams.omit({ claim_id: true }).partial();

export type RecoveryEventUpdateParams = z.infer<typeof recoveryEventUpdateParams>;

export const createRecoveryEventInput = z.object({
	claimId: z.string().uuid(),
	params: recoveryEventParams.omit({ claim_id: true }),
});

// Settlement ID is required for recovery event creation
// claim_id is derived from the settlement on the backend

export const updateRecoveryEventInput = z.object({
	recoveryEventId: z.string().uuid(),
	claimId: z.string().uuid(),
	params: recoveryEventUpdateParams,
});

export const deleteRecoveryEventInput = z.object({
	recoveryEventId: z.string().uuid(),
	claimId: z.string().uuid(),
});

export const listRecoveryEventsInput = z.object({
	claimId: z.string().uuid(),
});

export const listRecoveryEventsWithFiltersInput = z.object({
	filters: z.object({
		range: z.tuple([parseDate(), parseDate()]).optional(),
		recoverySource: z.string().optional(),
		recoveryStatus: z.nativeEnum(RecoveryStatus).optional(),
		checklistId: z.string().uuid().optional(),
	}),
	limit: z.number().int().positive().optional(),
	offset: z.number().int().nonnegative().optional(),
});

export const exportRecoveryEventsInput = z.object({
	filters: z.object({
		range: z.tuple([parseDate(), parseDate()]).optional(),
		recoverySource: z.string().optional(),
		recoveryStatus: z.nativeEnum(RecoveryStatus).optional(),
		checklistId: z.string().uuid().optional(),
	}),
});

// =====================================================================
// RECOVERY SUMMARY BY COVERAGE
// =====================================================================

export const getRecoverySummaryByCoverageInput = z.object({
	claimId: z.string().uuid(),
});

// =====================================================================
// RECOVERY METRICS SCHEMAS
// =====================================================================

const recoveryMetricsFilters = z.object({
	range: z.tuple([parseDate(), parseDate()]),
	recoverySource: z.string().optional(),
	recoveryStatus: z.nativeEnum(RecoveryStatus).optional(),
	checklistId: z.string().uuid().optional(),
});

export const getRecoveryMetricsSummaryInput = recoveryMetricsFilters;

export const getRecoveryMetricsTimeSeriesInput = recoveryMetricsFilters;

export const getQuarterlyRecoveryStatsInput = z.object({
	fiscalYearStart: parseDate().optional(),
});
