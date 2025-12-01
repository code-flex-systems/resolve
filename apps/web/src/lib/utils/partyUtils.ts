import { ClaimPartyRole } from '@/config/enums';

/**
 * Format claim party role for display
 */
export function formatClaimPartyRole(role: string | null): string {
	if (!role) return 'N/A';
	// Convert snake_case to Title Case
	return role
		.split('_')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
}

// Icon mappings for claim party roles
export const CLAIM_PARTY_ROLE_ICONS: Record<ClaimPartyRole, string> = {
	[ClaimPartyRole.ADVERSE_CARRIER]: '🏢',
	[ClaimPartyRole.OUR_ATTORNEY]: '⚖️',
	[ClaimPartyRole.THEIR_ATTORNEY]: '👔',
	[ClaimPartyRole.EXPERT]: '🎓',
	[ClaimPartyRole.RESPONSIBLE_PARTY]: '👤',
	[ClaimPartyRole.WITNESS]: '👁️',
	[ClaimPartyRole.PROPERTY_OWNER]: '🏠',
	[ClaimPartyRole.CLAIMANT]: '📋',
	[ClaimPartyRole.OTHER]: '📌',
};
