import { createClerkClient } from '@clerk/backend';
import config from '@/config/config';

/**
 * Singleton Clerk client instance for backend operations
 */
let clerkClientInstance: ReturnType<typeof createClerkClient> | null = null;

export function getClerkClient() {
	if (!clerkClientInstance) {
		clerkClientInstance = createClerkClient({
			secretKey: process.env.CLERK_SECRET_KEY!,
		});
	}
	return clerkClientInstance;
}

/**
 * Maps Clerk organization role to application role
 * Clerk default roles: org:admin, org:member
 * App roles: Admin, Contributor
 *
 * Note: Super Admin is handled via user metadata (publicMetadata.isSuperAdmin),
 * not via org roles, since it's a cross-organization role.
 */
export function mapClerkRoleToAppRole(
	clerkRole: string | undefined,
	isSuperAdmin: boolean = false
): string {
	if (isSuperAdmin) {
		return config.ROLES.SUPER_ADMIN;
	}

	if (!clerkRole) return config.ROLES.CONTRIBUTOR;

	const roleMap: Record<string, string> = {
		'org:admin': config.ROLES.ADMIN,
		'org:member': config.ROLES.CONTRIBUTOR,
	};

	return roleMap[clerkRole] || config.ROLES.CONTRIBUTOR;
}
