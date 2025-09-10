import { ActionType } from '@/config/enums';
import { parseDate } from '@/lib/parsers/zodParsers';
import { z } from 'zod';

const actionBaseParams = z.object({
	type: z.nativeEnum(ActionType),
});

const actionEmailParams = z.object({
	recipients: z.array(z.string().email()),
	title: z.string(),
	message: z.string(),
	template_id: z.string().optional(),
});

const actionEventParams = z.object({
	title: z.string(),
	message: z.string().optional(),
	schedule: parseDate(),
});

const actionLetterParams = z.object({
	address: z.array(z.string().email()),
	message: z.string(),
	template_id: z.string().optional(),
});

const actionTaskParams = z.object({
	dept: z.string(),
	desk_type: z.string(),
	desk: z.string(),
	task_type: z.string(),
	message: z.string().optional(),
});

export const actionParams = z.discriminatedUnion('type', [
	actionBaseParams.extend({
		type: z.literal(ActionType.EMAIL),
		definition: actionEmailParams,
	}),
	actionBaseParams.extend({
		type: z.literal(ActionType.EVENT),
		definition: actionEventParams,
	}),
	actionBaseParams.extend({
		type: z.literal(ActionType.LETTER),
		definition: actionLetterParams,
	}),
	actionBaseParams.extend({
		type: z.literal(ActionType.TASK),
		definition: actionTaskParams,
	}),
]);
export type ActionInput = z.infer<typeof actionParams>;

export const createActionInput = z.intersection(z.object({ answerId: z.number().int() }), actionParams);

export const getActionInput = z.object({ answerId: z.number().int() });

export const getActionStatsDetailInput = z.object({
	filters: z.object({
		range: z.tuple([parseDate(), parseDate()]),
		checklistId: z.number().int().optional(),
		claimId: z.number().int().optional(),
		users: z.array(z.string()).optional(),
	}),
});
