'use client';

import { MenuItem } from '@mui/material';
import { IconCircleCheck, IconFileSearch, IconCurrencyDollar } from '@tabler/icons-react';
import { formatMDYAbv } from '@/lib/utils/utils';
import { formatCurrencyExact } from '@/lib/utils/recoveryUtils';
import { BASE_COLOR_LIGHT } from '@/styles/theme';
import ClaimStatusChip from '@/components/common/ClaimStatusChip';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import css from './ClaimListItem.module.css';

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
		<div className={css.stack}>
			{/* Top row: Claim number and status/amount */}
			<div className={css.topRow}>
				<div className={css.nameGroup}>
					{variant === 'menuItem' && (
						<IconFileSearch size={20} style={{ color: 'var(--text-accent)' }} />
					)}
					<span
						style={{
							fontSize: variant === 'menuItem' ? 16 : 15,
							fontWeight: variant === 'menuItem' ? 600 : 400,
							color: variant === 'listRow' ? 'var(--text-accent)' : undefined,
						}}
						className={variant === 'listRow' ? css.claimLink : undefined}
					>
						{claim?.claim_number ?? 'N/A'}
					</span>
					{selected && <IconCircleCheck size={20} style={{ color: 'var(--text-accent)' }} />}
				</div>

				<div className={css.badgeGroup}>
					{/* Status Chip */}
					{showStatusChip && (
						<ClaimStatusChip recoveryStatus={claim.recovery_status} substatus={claim.substatus} />
					)}

					{/* Claim Amount Badge */}
					{showAmount && claimAmount !== null && (
						<div
							className={css.amountBadge}
							style={{ backgroundColor: 'var(--status-info-bg)' }}
						>
							<IconCurrencyDollar size={14} style={{ color: 'white' }} />
							<span style={{ fontSize: 12, fontWeight: 600, color: 'white' }}>
								{formatCurrencyExact(claimAmount)}
							</span>
						</div>
					)}
				</div>
			</div>

			{/* Second row: Client and Insured */}
			<div className={css.infoRow}>
				{claim?.client && (
					<span style={{ fontSize: 13 }}>
						{claim.client}
					</span>
				)}
				{claim?.client && claim?.insured && (
					<div className={css.dot} />
				)}
				{claim?.insured && (
					<span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
						{claim.insured}
					</span>
				)}
			</div>

			{/* Third row: Date of loss or Last update or Desk location */}
			<div className={css.infoRow}>
				{/* Show date of loss for menu items */}
				{variant === 'menuItem' && claim?.date_of_loss && (
					<span style={{ fontSize: 12, color: BASE_COLOR_LIGHT }}>
						Loss Date: {formatMDYAbv(claim.date_of_loss.toString())}
					</span>
				)}

				{/* Show desk location for list rows */}
				{variant === 'listRow' && showDeskLocation && claim?.desk_location_name && (
					<>
						<span style={{ fontSize: 12, color: BASE_COLOR_LIGHT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
							{claim.desk_location_name}
						</span>
						{showLastUpdate && claim?.last_update && (
							<div className={css.dot} />
						)}
					</>
				)}

				{/* Show last update for list rows */}
				{variant === 'listRow' && showLastUpdate && claim?.last_update && (
					<span style={{ fontSize: 12, color: BASE_COLOR_LIGHT }}>
						{dayjs(claim.last_update).fromNow()}
					</span>
				)}
			</div>
		</div>
	);

	if (variant === 'menuItem') {
		return (
			<MenuItem className={css.menuItem} onClick={onClick}>
				{content}
			</MenuItem>
		);
	}

	// listRow variant
	return (
		<div
			onClick={onClick}
			className={css.listRow}
			style={{ backgroundColor: index % 2 === 0 ? 'white' : '#FAFAFA' }}
		>
			{content}
		</div>
	);
}
