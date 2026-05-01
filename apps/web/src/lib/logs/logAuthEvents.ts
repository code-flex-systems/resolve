import { db } from '@/api/database/kysely'; // update path as needed
import { AuthEventType } from '@/config/enums';

export interface AuthEventMetadata {
	ip?: string;
	userAgent?: string;
	details?: Record<string, unknown>; // optional structured context
}

export async function logAuthEvent(
	userId: string | null,
	eventType: AuthEventType,
	metadata: AuthEventMetadata = {}
) {
	const { ip, userAgent, details } = metadata;

	await db
		.insertInto('auth_events')
		.values({
			user_id: userId,
			event_type: eventType,
			event_details: details ? JSON.stringify(details) : null,
			ip_address: ip ?? null,
			user_agent: userAgent ?? null,
		})
		.execute();
}
