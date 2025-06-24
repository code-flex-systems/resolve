import { logAuthEvent } from '@/lib/logs/logAuthEvents';
import { AuthEventType } from '@/config/enums';
import { enqueueLog } from '@/lib/logs/logQueue';
import { safeLog } from '@/lib/logs/safeLog';

const FAILURE_THRESHOLD = 3;
const failureCounts = new Map<string, number>(); // keyed by email or IP

export function logAuthMiddleware(
	userId: string | null,
	eventType: AuthEventType,
	options: {
		ip?: string;
		userAgent?: string;
		details?: Record<string, unknown>;
		identityKey?: string; // e.g. email or IP for thresholding
	} = {}
) {
	const { ip, userAgent, details, identityKey } = options;

	// For login failures, apply threshold
	if (eventType === AuthEventType.LoginFailure && identityKey) {
		const prev = failureCounts.get(identityKey) ?? 0;
		const next = prev + 1;
		failureCounts.set(identityKey, next);
		if (next < FAILURE_THRESHOLD) return; // don't log yet
	}

	enqueueLog(() => safeLog(() => logAuthEvent(userId, eventType, { ip, userAgent, details }), 'logAuth'));
}
