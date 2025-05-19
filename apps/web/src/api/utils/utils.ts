import { TRPCError } from '@trpc/server';
import { PageInstanceStatus } from '@/config/enums';

export function getUpdatedPageStatus(questionCount: number, responseCount: number) {
	if (questionCount === responseCount) return PageInstanceStatus.COMPLETE;
	if (responseCount > 0) return PageInstanceStatus.IN_PROGRESS;
	return PageInstanceStatus.UNSTARTED;
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
