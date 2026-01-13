import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { db } from '@/api/database/kysely';
import { upsertUserFromClerk } from '@/api/queries/userQueries';
import { getClientByClerkOrgId } from '@/api/queries/clientQueries';
import { getClerkClient, mapClerkRoleToAppRole } from '@/lib/clerk/clerk-utils';
import { logAuthEvent } from '@/lib/logs/logAuthEvents';
import { AuthEventType } from '@/config/enums';

/**
 * Clerk Webhook Handler
 *
 * Handles events from Clerk to sync data with our local database.
 *
 * Events handled:
 * - user.created / user.updated - sync user profile (including email_verified)
 * - user.deleted - remove user from local DB
 * - organizationMembership.created / updated - set client_id and role
 * - organization.created / updated - sync client table
 * - session.created - update last_login timestamp
 */
export async function POST(req: Request) {
	const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

	if (!WEBHOOK_SECRET) {
		throw new Error('CLERK_WEBHOOK_SECRET is not set');
	}

	// Get the headers
	const headerPayload = await headers();
	const svix_id = headerPayload.get('svix-id');
	const svix_timestamp = headerPayload.get('svix-timestamp');
	const svix_signature = headerPayload.get('svix-signature');

	// If there are no headers, error out
	if (!svix_id || !svix_timestamp || !svix_signature) {
		return new Response('Missing svix headers', { status: 400 });
	}

	// Get the raw body for verification
	const body = await req.text();

	// Create a new Svix instance with your secret
	const wh = new Webhook(WEBHOOK_SECRET);

	let evt: WebhookEvent;

	// Verify the payload with the headers
	try {
		evt = wh.verify(body, {
			'svix-id': svix_id,
			'svix-timestamp': svix_timestamp,
			'svix-signature': svix_signature,
		}) as WebhookEvent;
	} catch (err) {
		console.error('Error verifying webhook:', err);
		await logAuthEvent(null, AuthEventType.ClerkWebhookFailure, {
			details: {
				error: (err as Error).message,
				svixId: svix_id,
				step: 'verification',
			},
		});
		return new Response('Error verifying webhook', { status: 400 });
	}

	try {
		await processClerkEvent(evt);
		await logAuthEvent(null, AuthEventType.ClerkWebhookSuccess, {
			details: { svixId: svix_id, eventType: evt.type },
		});
		return new Response('Webhook processed', { status: 200 });
	} catch (error) {
		console.error(`Error handling webhook ${evt.type}:`, error);
		await logAuthEvent(null, AuthEventType.ClerkWebhookFailure, {
			details: {
				error: (error as Error).message,
				svixId: svix_id,
				eventType: evt.type,
			},
		});
		return new Response('Error processing webhook', { status: 500 });
	}
}

async function processClerkEvent(evt: WebhookEvent) {
	const eventType = evt.type;

	switch (eventType) {
		case 'user.created':
		case 'user.updated':
			await handleUserSync(evt.data);
			break;

		case 'user.deleted':
			await handleUserDeleted(evt.data);
			break;

		case 'organizationMembership.created':
		case 'organizationMembership.updated':
			await handleMembershipSync(evt.data);
			break;

		case 'organizationMembership.deleted':
			await handleMembershipDeleted(evt.data);
			break;

		case 'organization.created':
			await handleOrganizationCreated(evt.data);
			break;

		case 'organization.updated':
			await handleOrganizationUpdated(evt.data);
			break;

		case 'session.created':
			await handleSessionCreated(evt.data);
			break;

		default:
			console.log(`Unhandled webhook event type: ${eventType}`);
	}
}

/**
 * Sync user data from Clerk to local database
 */
async function handleUserSync(data: WebhookEvent['data']) {
	if (!('id' in data)) return;

	const userData = data as {
		id: string;
		first_name?: string | null;
		last_name?: string | null;
		email_addresses?: Array<{
			email_address: string;
			id: string;
			verification?: { status: string };
		}>;
		primary_email_address_id?: string;
		phone_numbers?: Array<{ phone_number: string; id: string }>;
		primary_phone_number_id?: string;
		public_metadata?: { isSuperAdmin?: boolean; internalUserId?: string };
		organization_memberships?: Array<{
			organization: { id: string };
			role: string;
		}>;
	};

	// Get primary email
	const primaryEmail = userData.email_addresses?.find((e) => e.id === userData.primary_email_address_id);

	// Get primary phone
	const primaryPhone = userData.phone_numbers?.find((p) => p.id === userData.primary_phone_number_id);

	// Get organization membership (if any)
	const membership = userData.organization_memberships?.[0];

	// Check for super admin via public metadata
	const isSuperAdmin = userData.public_metadata?.isSuperAdmin === true;

	if (!primaryEmail?.email_address) {
		console.log('User has no email, skipping sync');
		return;
	}

	// Only sync if user has an organization membership
	if (!membership) {
		console.log('User has no organization membership, skipping sync');
		return;
	}

	// Look up internal client_id from Clerk org ID
	const client = await getClientByClerkOrgId(db, membership.organization.id);
	if (!client) {
		console.log(`No client found for Clerk org ${membership.organization.id}, skipping sync`);
		return;
	}

	// Check email verification status
	const emailVerified = primaryEmail.verification?.status === 'verified';

	// Upsert user to local DB (uses email for conflict resolution, generates internal UUID)
	const internalUser = await upsertUserFromClerk(db, {
		first: userData.first_name || '',
		last: userData.last_name || '',
		email: primaryEmail.email_address,
		phone: primaryPhone?.phone_number,
		role: mapClerkRoleToAppRole(membership.role, isSuperAdmin),
		client_id: client.id,
		email_verified: emailVerified,
	});

	// Update Clerk user's public metadata with internal user ID (for client-side session)
	// Only update if the internal ID has changed or is not set
	if (internalUser && userData.public_metadata?.internalUserId !== internalUser.id) {
		try {
			await getClerkClient().users.updateUser(userData.id, {
				publicMetadata: {
					...userData.public_metadata,
					internalUserId: internalUser.id,
				},
			});
			console.log(`Updated Clerk user ${userData.id} with internal ID ${internalUser.id}`);
		} catch (error) {
			console.error(`Failed to update Clerk user metadata for ${userData.id}:`, error);
		}
	}

	console.log(`Synced user ${userData.id} from Clerk to client ${client.id}`);
}

/**
 * Handle user deletion
 * Note: Clerk's user.deleted event includes limited data, so we fetch the email
 * from the deleted user's email_addresses if available
 */
async function handleUserDeleted(data: WebhookEvent['data']) {
	if (!('id' in data)) return;

	const userData = data as {
		id: string;
		email_addresses?: Array<{ email_address: string; id: string }>;
	};

	// Try to find email from the deleted user data
	const email = userData.email_addresses?.[0]?.email_address;

	if (email) {
		// Delete by email (our primary identifier)
		await db.deleteFrom('users').where('email', '=', email).execute();
		console.log(`Deleted user with email ${email} from local database`);
	} else {
		console.log(`User ${userData.id} deleted but no email found, skipping local deletion`);
	}
}

/**
 * Handle organization membership changes
 */
async function handleMembershipSync(data: WebhookEvent['data']) {
	const membershipData = data as {
		id: string;
		organization: { id: string };
		public_user_data: {
			user_id: string;
			first_name?: string | null;
			last_name?: string | null;
			identifier?: string; // This is typically the email
		};
		role: string;
	};

	// Look up internal client_id from Clerk org ID
	const client = await getClientByClerkOrgId(db, membershipData.organization.id);
	if (!client) {
		console.log(`No client found for Clerk org ${membershipData.organization.id}, skipping membership sync`);
		return;
	}

	// Get user email from Clerk to find internal user
	let email: string | null = membershipData.public_user_data.identifier || null;

	// If identifier is not an email, fetch the user from Clerk
	if (!email || !email.includes('@')) {
		try {
			const clerkUser = await getClerkClient().users.getUser(membershipData.public_user_data.user_id);
			email = clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress || null;
		} catch (error) {
			console.error(`Failed to fetch Clerk user ${membershipData.public_user_data.user_id}:`, error);
			return;
		}
	}

	if (!email) {
		console.log(`No email found for user ${membershipData.public_user_data.user_id}, skipping membership sync`);
		return;
	}

	// Update user's role and client_id by email
	const result = await db
		.updateTable('users')
		.set({
			role: mapClerkRoleToAppRole(membershipData.role),
			client_id: client.id,
		})
		.where('email', '=', email)
		.executeTakeFirst();

	if (result.numUpdatedRows > 0) {
		console.log(`Updated membership for user ${email} to client ${client.id}`);
	} else {
		console.log(`No local user found with email ${email}, membership sync skipped`);
	}
}

/**
 * Handle organization membership deletion
 * When a user is removed from an organization, clear their client_id in our DB
 */
async function handleMembershipDeleted(data: WebhookEvent['data']) {
	const membershipData = data as {
		id: string;
		organization: { id: string };
		public_user_data: {
			user_id: string;
			identifier?: string; // This is typically the email
		};
	};

	// Get user email from Clerk to find internal user
	let email: string | null = membershipData.public_user_data.identifier || null;

	// If identifier is not an email, fetch the user from Clerk
	if (!email || !email.includes('@')) {
		try {
			const clerkUser = await getClerkClient().users.getUser(membershipData.public_user_data.user_id);
			email = clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress || null;
		} catch (error) {
			console.error(`Failed to fetch Clerk user ${membershipData.public_user_data.user_id}:`, error);
			return;
		}
	}

	if (!email) {
		console.log(`No email found for user ${membershipData.public_user_data.user_id}, skipping membership deletion sync`);
		return;
	}

	// Clear user's client_id when they are removed from the organization
	const result = await db
		.updateTable('users')
		.set({
			client_id: null,
		})
		.where('email', '=', email)
		.executeTakeFirst();

	if (result.numUpdatedRows > 0) {
		console.log(`Cleared client_id for user ${email} after membership deletion`);
	} else {
		console.log(`No local user found with email ${email}, membership deletion sync skipped`);
	}
}

/**
 * Handle organization creation - create client record
 */
async function handleOrganizationCreated(data: WebhookEvent['data']) {
	const orgData = data as {
		id: string;
		name: string;
		public_metadata?: { internalClientId?: string };
	};

	// Check if client already exists for this org
	const existingClient = await getClientByClerkOrgId(db, orgData.id);
	if (existingClient) {
		console.log(`Client already exists for Clerk org ${orgData.id}, skipping creation`);
		return;
	}

	// Create new client record
	const client = await db
		.insertInto('client')
		.values({
			name: orgData.name,
			clerk_org_id: orgData.id,
		})
		.returningAll()
		.executeTakeFirst();

	if (!client) {
		console.error(`Failed to create client for Clerk org ${orgData.id}`);
		return;
	}

	// Update Clerk org's public metadata with internal client ID (for client-side session)
	try {
		await getClerkClient().organizations.updateOrganization(orgData.id, {
			publicMetadata: {
				...orgData.public_metadata,
				internalClientId: client.id,
			},
		});
		console.log(`Created client ${client.id} for Clerk org ${orgData.id} and updated org metadata`);
	} catch (error) {
		console.error(`Failed to update Clerk org metadata for ${orgData.id}:`, error);
		// Client was still created, just metadata update failed
		console.log(`Created client ${client.id} for Clerk org ${orgData.id} (metadata update failed)`);
	}
}

/**
 * Handle organization update - sync client name
 */
async function handleOrganizationUpdated(data: WebhookEvent['data']) {
	const orgData = data as {
		id: string;
		name: string;
		public_metadata?: { internalClientId?: string };
	};

	// Update client name
	const result = await db
		.updateTable('client')
		.set({ name: orgData.name })
		.where('clerk_org_id', '=', orgData.id)
		.executeTakeFirst();

	if (result.numUpdatedRows > 0) {
		console.log(`Updated client name for Clerk org ${orgData.id} to "${orgData.name}"`);
	} else {
		console.log(`No client found for Clerk org ${orgData.id}, skipping name update`);
	}

	// Ensure internalClientId is set in org metadata (in case it was cleared)
	const client = await getClientByClerkOrgId(db, orgData.id);
	if (client && orgData.public_metadata?.internalClientId !== client.id) {
		try {
			await getClerkClient().organizations.updateOrganization(orgData.id, {
				publicMetadata: {
					...orgData.public_metadata,
					internalClientId: client.id,
				},
			});
			console.log(`Updated Clerk org ${orgData.id} metadata with internal client ID`);
		} catch (error) {
			console.error(`Failed to update Clerk org metadata for ${orgData.id}:`, error);
		}
	}
}

/**
 * Handle session creation - update last_login timestamp
 */
async function handleSessionCreated(data: WebhookEvent['data']) {
	const sessionData = data as {
		id: string;
		user_id: string;
		created_at: number; // Unix timestamp in milliseconds
	};

	// Fetch user from Clerk to get their email
	let email: string | null = null;
	try {
		const clerkUser = await getClerkClient().users.getUser(sessionData.user_id);
		email = clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress || null;
	} catch (error) {
		console.error(`Failed to fetch Clerk user ${sessionData.user_id}:`, error);
		return;
	}

	if (!email) {
		console.log(`No email found for user ${sessionData.user_id}, skipping last_login update`);
		return;
	}

	// Update last_login timestamp
	const result = await db
		.updateTable('users')
		.set({
			last_login: new Date(sessionData.created_at),
		})
		.where('email', '=', email)
		.executeTakeFirst();

	if (result.numUpdatedRows > 0) {
		console.log(`Updated last_login for user ${email}`);
	} else {
		console.log(`No local user found with email ${email}, skipping last_login update`);
	}
}
