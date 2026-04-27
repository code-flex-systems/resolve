'use client';

import { IconX } from '@tabler/icons-react';
import Drawer from '@/components/ui/Drawer';
import Button from '@/components/ui/Button';
import ClaimSummary from './ClaimSummary';

interface ClaimDetailPanelProps {
	claimId: string | null;
	open: boolean;
	onClose: () => void;
	onStartChecklist?: () => void;
}

export default function ClaimDetailPanel({ claimId, open, onClose, onStartChecklist }: ClaimDetailPanelProps) {
	return (
		<Drawer open={open} onClose={onClose} anchor="right" width={480}>
			<div style={{ display: 'flex', flexDirection: 'column' as const, height: '100%', overflow: 'hidden' }}>
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 20px 15px', flexShrink: 0 }}>
					<span style={{ fontSize: 16, fontWeight: 600 }}>Claim Details</span>
					<Button variant="icon" onClick={onClose} size="sm">
						<IconX size={20} stroke={1.5} />
					</Button>
				</div>

				<div style={{ flex: 1, minHeight: 0, padding: '0 20px' }}>
					{claimId && <ClaimSummary claimId={claimId} onStartChecklist={onStartChecklist} />}
				</div>
			</div>
		</Drawer>
	);
}
