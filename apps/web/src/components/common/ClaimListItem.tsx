'use client';

import { Box, MenuItem, Stack, Typography } from '@mui/material';
import CheckCircle from '@mui/icons-material/CheckCircle';
import ContentPasteSearch from '@mui/icons-material/ContentPasteSearch';
import CurrencyExchange from '@mui/icons-material/CurrencyExchange';
import { formatMDYAbv } from '@/lib/utils/utils';
import { formatCurrencyExact } from '@/lib/utils/recoveryUtils';
import theme, { BASE_COLOR_LIGHT } from '@/styles/theme';
import ClaimStatusChip from '@/components/common/ClaimStatusChip';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

/**
 * Generic claim data interface that works for both search results and desk queue results
 */
export interface ClaimListItemData {
	id: number;
	claim_number: string | null;
	client: string | null;
	insured: string | null;
	claim_amount?: string | number | null;
	date_of_loss?: Date | string | null;
	recovery_status: string | null;
	substatus?: string | null;
	last_update?: Date | string | null;
	desk_location_name?: string | null;
}

interface ClaimListItemProps {
	claim: ClaimListItemData;
	onClick?: () => void;
	selected?: boolean;
	showStatusChip?: boolean;
	showAmount?: boolean;
	showLastUpdate?: boolean;
	showDeskLocation?: boolean;
	variant?: 'menuItem' | 'listRow';
	index?: number; // For alternating row backgrounds
}

/**
 * Generic claim list item component for search dropdowns and queue lists.
 * Supports two variants:
 * - menuItem: For search dropdown results (shows claim icon, amount badge)
 * - listRow: For queue list rows (shows last update, alternating backgrounds)
 */
export default function ClaimListItem({
	claim,
	onClick,
	selected = false,
	showStatusChip = true,
	showAmount = false,
	showLastUpdate = false,
	showDeskLocation = false,
	variant = 'menuItem',
	index = 0,
}: ClaimListItemProps) {
	const claimAmount = claim?.claim_amount ? parseFloat(claim.claim_amount.toString()) : null;

	const content = (
		<Stack width="100%" spacing={0.5}>
			{/* Top row: Claim number and status/amount */}
			<Box display="flex" alignItems="center" justifyContent="space-between">
				<Box display="flex" alignItems="center" gap={1}>
					{variant === 'menuItem' && (
						<ContentPasteSearch sx={{ color: theme.palette.primary.main, fontSize: 20 }} />
					)}
					<Typography
						variant={variant === 'menuItem' ? 'subtitle1' : 'body1'}
						fontSize={variant === 'menuItem' ? 16 : 15}
						fontWeight={variant === 'menuItem' ? 600 : 400}
						color={variant === 'listRow' ? 'primary' : undefined}
						sx={
							variant === 'listRow'
								? {
										cursor: 'pointer',
										'&:hover': { textDecoration: 'underline' },
									}
								: undefined
						}
					>
						{claim?.claim_number ?? 'N/A'}
					</Typography>
					{selected && <CheckCircle sx={{ color: theme.palette.primary.main, fontSize: 20 }} />}
				</Box>

				<Box display="flex" alignItems="center" gap={1}>
					{/* Status Chip */}
					{showStatusChip && (
						<ClaimStatusChip recoveryStatus={claim.recovery_status} substatus={claim.substatus} />
					)}

					{/* Claim Amount Badge */}
					{showAmount && claimAmount !== null && (
						<Box
							px={1.5}
							py={0.5}
							borderRadius={2}
							bgcolor={theme.palette.primary.light}
							display="flex"
							alignItems="center"
							gap={0.5}
						>
							<CurrencyExchange sx={{ fontSize: 14, color: 'white' }} />
							<Typography fontSize={12} fontWeight={600} color="white">
								{formatCurrencyExact(claimAmount)}
							</Typography>
						</Box>
					)}
				</Box>
			</Box>

			{/* Second row: Client and Insured */}
			<Box display="flex" alignItems="center" gap={1}>
				{claim?.client && (
					<Typography variant="body2" fontSize={13} color="text.primary">
						{claim.client}
					</Typography>
				)}
				{claim?.client && claim?.insured && (
					<Box width={4} height={4} borderRadius="50%" bgcolor={BASE_COLOR_LIGHT} />
				)}
				{claim?.insured && (
					<Typography variant="body2" fontSize={13} color="text.secondary">
						{claim.insured}
					</Typography>
				)}
			</Box>

			{/* Third row: Date of loss or Last update or Desk location */}
			<Box display="flex" alignItems="center" gap={1}>
				{/* Show date of loss for menu items */}
				{variant === 'menuItem' && claim?.date_of_loss && (
					<Typography variant="caption" fontSize={12} color={BASE_COLOR_LIGHT}>
						Loss Date: {formatMDYAbv(claim.date_of_loss.toString())}
					</Typography>
				)}

				{/* Show desk location for list rows */}
				{variant === 'listRow' && showDeskLocation && claim?.desk_location_name && (
					<>
						<Typography variant="caption" fontSize={12} color={BASE_COLOR_LIGHT} noWrap>
							{claim.desk_location_name}
						</Typography>
						{showLastUpdate && claim?.last_update && (
							<Box width={4} height={4} borderRadius="50%" bgcolor={BASE_COLOR_LIGHT} />
						)}
					</>
				)}

				{/* Show last update for list rows */}
				{variant === 'listRow' && showLastUpdate && claim?.last_update && (
					<Typography variant="caption" fontSize={12} color={BASE_COLOR_LIGHT}>
						{dayjs(claim.last_update).fromNow()}
					</Typography>
				)}
			</Box>
		</Stack>
	);

	if (variant === 'menuItem') {
		return (
			<MenuItem sx={styles.menuItem} onClick={onClick}>
				{content}
			</MenuItem>
		);
	}

	// listRow variant
	return (
		<Box
			onClick={onClick}
			sx={{
				...styles.listRow,
				backgroundColor: index % 2 === 0 ? 'white' : '#FAFAFA',
			}}
		>
			{content}
		</Box>
	);
}

const styles = {
	menuItem: {
		minHeight: 80,
		padding: '16px',
		borderBottom: '1px solid #f0f0f0',
		transition: 'background-color 0.2s ease',
		'&:hover': {
			backgroundColor: '#F0F7F5 !important',
		},
		'&:last-child': {
			borderBottom: 'none',
		},
		'&.Mui-focused': {
			backgroundColor: '#F0F7F5',
		},
	},
	listRow: {
		width: '100%',
		padding: '12px 16px',
		cursor: 'pointer',
		transition: 'all 0.2s ease',
		borderBottom: '1px solid #f0f0f0',
		'&:hover': {
			backgroundColor: '#F0F7F5 !important',
			transform: 'translateX(4px)',
		},
		'&:last-child': {
			borderBottom: 'none',
		},
	},
};
