import CustomChip from '@/components/ui/Chip';
import React, { useState } from 'react';
import BasicPopper from './BasicPopper';
import { BASE_COLOR_LIGHT } from '@/styles/theme';
import { RecoveryStatus } from '@/config/enums';
import { formatRecoveryStatus } from '@/lib/utils/recoveryUtils';
import { IconCurrencyDollar } from '@tabler/icons-react';

export default function RecoveryStatusSelect({
	recoveryStatus,
	setRecoveryStatus,
	clearable = true,
	height,
	text = 'Filter by recovery status',
	disabled = false,
}: {
	recoveryStatus: string | null;
	setRecoveryStatus: (newStatus: string | null) => void;
	clearable?: boolean;
	height?: number;
	text?: string;
	disabled?: boolean;
}) {
	const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

	const displayLabel = recoveryStatus ? formatRecoveryStatus(recoveryStatus) : text;

	return (
		<>
			<span
				onClick={(e: React.MouseEvent) => {
				setAnchorEl(e.currentTarget as HTMLElement);
				e.preventDefault();
				e.stopPropagation();
			}}
				style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer', margin: '5px 0px', opacity: disabled ? 0.5 : 1 }}
			>
				<CustomChip color={recoveryStatus ? 'info' : 'neutral'} size="sm">
				<IconCurrencyDollar size={20} style={{ color: recoveryStatus ? undefined : BASE_COLOR_LIGHT }} />
					<span>{displayLabel}</span>
				</CustomChip>
				{recoveryStatus && (
					<button onClick={(e: React.MouseEvent) => { e.stopPropagation(); setRecoveryStatus(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 14 }}>x</button>
				)}
			</span>
			{!!anchorEl && (
				<BasicPopper anchorEl={anchorEl} setAnchorEl={() => setAnchorEl(null)} placement="bottom-start">
					<div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', padding: 8, marginTop: 5, minWidth: 200 }}>
						{Object.values(RecoveryStatus).map((status) => (
							<div
								key={status}
								style={{
									padding: '8px 12px',
									borderRadius: 6,
									cursor: 'pointer',
									fontSize: 13,
									backgroundColor: recoveryStatus === status ? 'var(--status-info-bg)' : undefined,
								}}
								onClick={() => {
									setRecoveryStatus(status);
									setAnchorEl(null);
								}}
							>
								<span style={{ fontSize: 13 }}>{formatRecoveryStatus(status)}</span>
							</div>
						))}
					</div>
				</BasicPopper>
			)}
		</>
	);
}
