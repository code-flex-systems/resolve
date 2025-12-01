import { z } from 'zod';
import { parseDate, parseNumber } from '@/lib/parsers/zodParsers';
import { RecoveryStatus } from '@/config/enums';

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
