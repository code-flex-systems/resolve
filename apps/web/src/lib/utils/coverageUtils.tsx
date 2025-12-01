import { CoverageType } from '@/config/enums';
import DirectionsCar from '@mui/icons-material/DirectionsCar';
import Security from '@mui/icons-material/Security';
import Gavel from '@mui/icons-material/Gavel';
import PersonOff from '@mui/icons-material/PersonOff';
import LocalHospital from '@mui/icons-material/LocalHospital';
import Healing from '@mui/icons-material/Healing';
import Home from '@mui/icons-material/Home';
import Checkroom from '@mui/icons-material/Checkroom';
import Hotel from '@mui/icons-material/Hotel';
import MoreHoriz from '@mui/icons-material/MoreHoriz';
import { formatLabel } from './claimUtils';

/**
 * Centralized coverage type configuration with icons and labels.
 * Use this for all coverage type displays (dropdowns, chips, etc.)
 */
export const COVERAGE_TYPE_CONFIG = {
	[CoverageType.COLLISION]: {
		label: 'Collision',
		icon: DirectionsCar,
	},
	[CoverageType.COMPREHENSIVE]: {
		label: 'Comprehensive',
		icon: Security,
	},
	[CoverageType.LIABILITY]: {
		label: 'Liability',
		icon: Gavel,
	},
	[CoverageType.UNINSURED_MOTORIST]: {
		label: 'Uninsured Motorist',
		icon: PersonOff,
	},
	[CoverageType.MEDICAL_PAYMENTS]: {
		label: 'Medical Payments',
		icon: LocalHospital,
	},
	[CoverageType.PERSONAL_INJURY_PROTECTION]: {
		label: 'Personal Injury Protection',
		icon: Healing,
	},
	[CoverageType.DWELLING]: {
		label: 'Dwelling',
		icon: Home,
	},
	[CoverageType.PERSONAL_PROPERTY]: {
		label: 'Personal Property',
		icon: Checkroom,
	},
	[CoverageType.LOSS_OF_USE]: {
		label: 'Loss of Use',
		icon: Hotel,
	},
	[CoverageType.OTHER]: {
		label: 'Other',
		icon: MoreHoriz,
	},
} as const;

/**
 * Format a coverage type for display.
 * Uses centralized configuration for consistent labeling.
 */
export function formatCoverageType(coverageType: string | null | undefined): string {
	if (!coverageType) return 'Unknown';
	const config = COVERAGE_TYPE_CONFIG[coverageType as CoverageType];
	return config?.label || formatLabel(coverageType);
}

/**
 * Get the icon component for a coverage type.
 */
export function getCoverageTypeIcon(coverageType: CoverageType) {
	return COVERAGE_TYPE_CONFIG[coverageType]?.icon || MoreHoriz;
}
