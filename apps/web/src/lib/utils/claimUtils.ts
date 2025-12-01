/**
 * Shared utility functions for claim-related data and components
 */

import { LineOfBusiness, LossType, ClaimSubstatus } from '@/config/enums';
import { formatCoverageType as formatCoverageTypeInternal } from './coverageUtils';

/**
 * Generic utility to format snake_case or lowercase strings to Title Case.
 * Examples:
 *   - "uninsured_motorist" -> "Uninsured Motorist"
 *   - "uninsured motorist" -> "Uninsured Motorist"
 *   - "AUTO" -> "Auto"
 */
export function formatLabel(value: string | null | undefined): string {
	if (!value) return 'N/A';

	// First replace underscores with spaces, then split on spaces
	return value
		.toLowerCase()
		.replace(/_/g, ' ')
		.split(' ')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
}

/**
 * Format line of business enum to display-friendly text
 */
export function formatLineOfBusiness(lob: string | null): string {
	return formatLabel(lob);
}

/**
 * Format liability coverage type enum to display-friendly text
 */
export function formatLiabilityCoverageType(coverageType: string | null): string {
	return formatLabel(coverageType);
}

/**
 * Format loss type enum to display-friendly text
 */
export function formatLossType(lossType: string | null): string {
	return formatLabel(lossType);
}

/**
 * Format coverage type enum to display-friendly text
 * Uses centralized configuration from coverageUtils
 */
export function formatCoverageType(coverageType: string | null): string {
	return formatCoverageTypeInternal(coverageType);
}

// Icon mappings for line of business
export const LOB_ICONS: Record<LineOfBusiness, string> = {
	[LineOfBusiness.AUTO]: '🚗',
	[LineOfBusiness.PROPERTY]: '🏠',
	[LineOfBusiness.GENERAL_LIABILITY]: '⚖️',
	[LineOfBusiness.WORKERS_COMP]: '👷',
	[LineOfBusiness.PROFESSIONAL_LIABILITY]: '💼',
};

// Icon mappings for loss type
export const LOSS_TYPE_ICONS: Record<LossType, string> = {
	[LossType.COLLISION]: '💥',
	[LossType.COMPREHENSIVE]: '🔒',
	[LossType.FIRE]: '🔥',
	[LossType.THEFT]: '🦹',
	[LossType.WATER_DAMAGE]: '💧',
	[LossType.WIND]: '🌪️',
	[LossType.VANDALISM]: '🔨',
	[LossType.BODILY_INJURY]: '🤕',
	[LossType.PROPERTY_DAMAGE]: '🏚️',
	[LossType.UNINSURED_MOTORIST]: '🚫',
	[LossType.MEDICAL_PAYMENTS]: '🏥',
	[LossType.PERSONAL_INJURY_PROTECTION]: '🩹',
	[LossType.OTHER]: '📋',
};

// Icon mappings for claim substatus
export const SUBSTATUS_ICONS: Record<ClaimSubstatus, string> = {
	[ClaimSubstatus.INVESTIGATION]: '🔍',
	[ClaimSubstatus.DEMAND_SENT]: '📧',
	[ClaimSubstatus.NEGOTIATION]: '🤝',
	[ClaimSubstatus.SETTLEMENT_REACHED]: '✍️',
	[ClaimSubstatus.LITIGATION]: '⚖️',
	[ClaimSubstatus.CLOSED_RECOVERED]: '✅',
	[ClaimSubstatus.CLOSED_NO_RECOVERY]: '❌',
	[ClaimSubstatus.CANCELLED]: '🚫',
};
