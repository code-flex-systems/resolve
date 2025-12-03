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
