'use client';

import { IconX } from '@tabler/icons-react';
import { Drawer } from '@mui/material';
import Button from '@/components/ui/Button';
import ClaimSummary from './ClaimSummary';

interface ClaimDetailPanelProps {
	claimId: number | null;
	open: boolean;
	onClose: () => void;
	onStartChecklist?: () => void;
}

export default function ClaimDetailPanel({ claimId, open, onClose, onStartChecklist }: ClaimDetailPanelProps) {
	return (
		<Drawer
			anchor="right"
			open={open}
			onClose={onClose}
			style={{
				}}
		>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexShrink: 0 }}>
				<span>Claim Details</span>
				<Button variant="icon" onClick={onClose} size="sm">
					<IconX size={20} />
				</Button>
			</div>

			<div style={{ flex: 1, overflow: 'hidden' }}>
				{claimId && <ClaimSummary claimId={claimId} onStartChecklist={onStartChecklist} />}
			</div>
		</Drawer>
	);
}
