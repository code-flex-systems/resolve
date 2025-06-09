import { z } from 'zod';

export const parseNumber = (message = 'Must be a number') =>
	z.string().transform((val, ctx) => {
		const parsed = Number(val);
		if (isNaN(parsed)) {
			ctx.addIssue({ code: 'custom', message });
			return z.NEVER;
		}
		return parsed;
	});

export const parseFloatNumber = (message = 'Must be a valid float') =>
	z.string().transform((val, ctx) => {
		const parsed = Number.parseFloat(val);
		if (isNaN(parsed)) {
			ctx.addIssue({ code: 'custom', message });
			return z.NEVER;
		}
		return parsed;
	});

export const parseIntNumber = (message = 'Must be an integer') =>
	z.string().transform((val, ctx) => {
		const parsed = parseInt(val, 10);
		if (isNaN(parsed)) {
			ctx.addIssue({ code: 'custom', message });
			return z.NEVER;
		}
		return parsed;
	});

export const parseDate = (message = 'Invalid date') =>
	z.string().transform((val, ctx) => {
		const parsed = new Date(val);
		if (isNaN(parsed.getTime())) {
			ctx.addIssue({ code: 'custom', message });
			return z.NEVER;
		}
		return parsed;
	});

export const parseBoolean = (message = 'Must be true or false') =>
	z.string().transform((val, ctx) => {
		const lower = val.toLowerCase();
		if (lower === 'true') return true;
		if (lower === 'false') return false;
		ctx.addIssue({ code: 'custom', message });
		return z.NEVER;
	});

export const currencyNumber = (message = 'Invalid currency format') =>
	z.string().transform((val, ctx) => {
		const cleaned = val.replace(/[^0-9.-]+/g, '').trim();
		const parsed = Number.parseFloat(cleaned);
		if (isNaN(parsed)) {
			ctx.addIssue({ code: 'custom', message });
			return z.NEVER;
		}
		return parsed;
	});

export const trimmedString = () => z.string().transform((s) => s.trim());
