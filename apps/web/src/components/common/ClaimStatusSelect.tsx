import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import CustomChip from '@/components/ui/Chip';
import React, { useEffect, useState } from 'react';
import BasicPopper from './BasicPopper';
import { IconCircleCheck } from '@tabler/icons-react';
import { BASE_COLOR_LIGHT } from '@/styles/theme';
import { ClaimStatus } from '@/config/enums';
import ClaimStatusIcon from '../checklist/ClaimStatusIcon';

const OPTIONS = [{ status: ClaimStatus.SUBMITTED }];

export default function ClaimStatusSelect({
	claimStatus,
	setClaimStatus,
	clearable = true,
	height,
	text = 'Filter by claim status',
	disabled = false,
}: {
	claimStatus: ClaimStatus | null;
	setClaimStatus: (newStatus: ClaimStatus | null) => void;
	clearable?: boolean;
	height?: number;
	text?: string;
	disabled?: boolean;
}) {
	const { data: options = [], isFetching } = useChecklistTrpc().list({});
	const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

	useEffect(() => {
		if (!clearable && options.length > 0) {
			setClaimStatus(ClaimStatus.IN_PROGRESS);
		}
	}, [options, clearable]);

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
				<CustomChip color={claimStatus ? 'info' : 'neutral'} size="sm">
				{claimStatus ? (
						<span style={{ marginLeft: 5, marginTop: 5, display: 'inline-flex' }}>
							<ClaimStatusIcon status={claimStatus} />
						</span>
					) : (
						<IconCircleCheck size={20} style={{ color: BASE_COLOR_LIGHT }} />
					)}
					<span>{claimStatus ?? text}</span>
				</CustomChip>
				{claimStatus && (
					<button onClick={(e: React.MouseEvent) => { e.stopPropagation(); setClaimStatus(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 14 }}>x</button>
				)}
			</span>
			{!!anchorEl && (
				<BasicPopper anchorEl={anchorEl} setAnchorEl={() => setAnchorEl(null)} placement="bottom-start">
					<div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', padding: 8, marginTop: 5, minWidth: 200 }}>
						{Object.values(ClaimStatus)
							.sort((a, b) => a.localeCompare(b))
							.map((o) => (
								<div
									key={o}
									style={{
										padding: '8px 12px',
										borderRadius: 6,
										cursor: 'pointer',
										fontSize: 13,
										backgroundColor: claimStatus === o ? 'var(--status-info-bg)' : undefined,
									}}
									onClick={() => {
										setClaimStatus(o);
										setAnchorEl(null);
									}}
								>
									<div style={{ width: '100%', display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
										<ClaimStatusIcon status={o} />
										<span style={{ fontSize: 13, marginLeft: 5 }}>
											{o}
										</span>
									</div>
								</div>
							))}
					</div>
				</BasicPopper>
			)}
		</>
	);
}
