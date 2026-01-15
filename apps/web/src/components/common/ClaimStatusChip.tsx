import { Chip } from '@mui/material';
import { formatClaimStatus } from '@/lib/utils/claimUtils';
import { RecoveryStatus } from '@/config/enums';

/**
 * Get chip color based on recovery status
 */
function getChipColor(recoveryStatus: string | null | undefined): 'warning' | 'info' | 'success' | 'default' {
	switch (recoveryStatus) {
		case RecoveryStatus.PENDING:
			return 'warning';
		case RecoveryStatus.IN_PROGRESS:
			return 'info';
		case RecoveryStatus.RECOVERED:
			return 'success';
		case RecoveryStatus.CLOSED_NO_RECOVERY:
			return 'default';
		default:
			return 'default';
	}
}

interface ClaimStatusChipProps {
	recoveryStatus: string | null | undefined;
	substatus: string | null | undefined;
	size?: 'small' | 'medium';
}

/**
 * Displays claim status as a colored chip.
 * Color is based on recovery_status (the less granular status):
 * - pending: warning (orange)
 * - in_progress: info (blue)
 * - recovered: success (green)
 * - closed_no_recovery: default (grey)
 */
export default function ClaimStatusChip({ recoveryStatus, substatus, size = 'small' }: ClaimStatusChipProps) {
	const label = formatClaimStatus(recoveryStatus, substatus);
	const color = getChipColor(recoveryStatus);

	return (
		<Chip
			label={label}
			color={color}
			size={size}
			sx={{
				fontWeight: 500,
				fontSize: size === 'small' ? 12 : 13,
			}}
		/>
	);
}
