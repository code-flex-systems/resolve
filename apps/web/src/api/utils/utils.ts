import { TRPCError } from '@trpc/server';
import { PageInstanceStatus } from '@/config/enums';

export function getUpdatedPageStatus(questionCount: number, responseCount: number) {
	if (questionCount === responseCount) return PageInstanceStatus.COMPLETE;
	if (responseCount > 0) return PageInstanceStatus.IN_PROGRESS;
	return PageInstanceStatus.UNSTARTED;
}

/**
 * Deep-equals two values (primitives, arrays, or plain objects).
 * Handles circular references and NaN equality.
 */
export function isEqual(a: any, b: any, visited = new WeakSet()): boolean {
	// Handle NaN explicitly (NaN should equal NaN for deep equality)
	if (Number.isNaN(a) && Number.isNaN(b)) return true;

	if (a === b) return true;

	// both must be non-null objects to continue
	if (a && b && typeof a === 'object' && typeof b === 'object') {
		// Check for circular reference
		if (visited.has(a)) return true; // Assume equal if already visiting
		visited.add(a);

		// Arrays
		if (Array.isArray(a) && Array.isArray(b)) {
			if (a.length !== b.length) return false;
			for (let i = 0; i < a.length; i++) {
				if (!isEqual(a[i], b[i], visited)) return false;
			}
			return true;
		}

		// Mismatched array vs object
		if (Array.isArray(a) !== Array.isArray(b)) {
			return false;
		}

		// Plain objects
		const keysA = Object.keys(a);
		const keysB = Object.keys(b);
		if (keysA.length !== keysB.length) return false;

		for (const key of keysA) {
			if (!Object.prototype.hasOwnProperty.call(b, key)) {
				return false;
			}
			if (!isEqual(a[key], b[key], visited)) {
				return false;
			}
		}
		return true;
	}

	// all other cases (functions, differing types, one is null/undefined)
	return false;
}

export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(fn: T): T {
	return (async (...args: Parameters<T>) => {
		try {
			return await fn(...args);
		} catch (cause) {
			console.error('Controller error:', cause);
			throw new TRPCError({
				code: 'INTERNAL_SERVER_ERROR',
				message: (cause as Error).message,
				cause,
			});
		}
	}) as T;
}
