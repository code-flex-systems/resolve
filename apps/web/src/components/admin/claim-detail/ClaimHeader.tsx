'use client';

import {
	IconArchive,
	IconArrowLeft,
	IconClipboard,
	IconEdit,
	IconPrinter,
} from '@tabler/icons-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';
import Chip from '@/components/ui/Chip';
import { usePathname, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { formatCurrencyExact } from '@/lib/utils/recoveryUtils';
import useIsAdmin from '@/hooks/useIsAdmin';
import useIsSuperAdmin from '@/hooks/useIsSuperAdmin';
import { LineOfBusinessChip, LossTypeChip } from '@/components/common/ReferenceDataSelect';
import ClaimStatusChip from '@/components/common/ClaimStatusChip';

export default function ClaimHeader({ claimId, onEdit }: { claimId: string; onEdit?: () => void }) {
	const router = useRouter();
	const pathname = usePathname();
	const isAdmin = useIsAdmin();
	const isSuperAdmin = useIsSuperAdmin();
	const { data: claimDetail, isLoading } = trpc.claim.getClaimDetail.useQuery({ claimId });

	const handleEditClaim = () => {
		if (onEdit) {
			onEdit();
		}
	};

	if (isLoading) {
		return (
			<div style={styles.container}>
				<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
					<Skeleton variant="text" width={200} />
					<Skeleton variant="rect" height={80} />
				</div>
			</div>
		);
	}

	if (!claimDetail) {
		return null;
	}

	return (
		<div style={styles.container}>
			{/* Main Header Content */}
			<div
				style={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'flex-start',
					flexWrap: 'wrap',
				}}
			>
				{/* Left: Claim Number and Insured */}
				<div>
					<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
						<Button variant="icon" onClick={() => router.back()}>
							<IconArrowLeft size={20} />
						</Button>
						<span style={{ color: 'var(--text-accent)' }}>{claimDetail.claim_number}</span>
					</div>
					<span style={{ color: 'var(--text-secondary)' }}>{claimDetail.insured || 'N/A'}</span>
				</div>

				{/* Right: Key Metrics */}
				<div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
					<div style={{ display: 'flex', flexDirection: 'column' as const }}>
						<span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Claim Amount</span>
						<span style={{ fontSize: 18 }}>
							{formatCurrencyExact(Number(claimDetail.claim_amount) || 0)}
						</span>
					</div>
					<div style={{ display: 'flex', flexDirection: 'column' as const }}>
						<span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total Incurred</span>
						<span style={{ fontSize: 18 }}>
							{formatCurrencyExact(Number(claimDetail.total_incurred) || 0)}
						</span>
					</div>
					<div style={{ display: 'flex', flexDirection: 'column' as const }}>
						<span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Expected Recovery</span>
						<span style={{ fontSize: 18 }}>
							{formatCurrencyExact(Number(claimDetail.expected_recovery) || 0)}
						</span>
					</div>
					<div style={{ display: 'flex', flexDirection: 'column' as const }}>
						<span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Actual Recovery</span>
						<span style={{ fontSize: 18 }}>
							{formatCurrencyExact(Number(claimDetail.actual_recovery) || 0)}
						</span>
					</div>
				</div>
			</div>

			{/* Action Toolbar */}
			<div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 16 }}>
				<div
					style={{
						display: 'flex',
						flexWrap: 'wrap',
						gap: 8,
						justifyContent: 'flex-start',
						alignItems: 'center',
					}}
				>
					{claimDetail.line_of_business && (
						<LineOfBusinessChip value={claimDetail.line_of_business} />
					)}
					{claimDetail.aggregated_loss_type &&
						claimDetail.aggregated_loss_type.length > 0 &&
						claimDetail.aggregated_loss_type.map((lt: string) => (
							<LossTypeChip key={lt} value={lt} />
						))}
					<ClaimStatusChip
						recoveryStatus={claimDetail.recovery_status}
						substatus={claimDetail.substatus}
					/>
					{claimDetail.feed_name && (
						<Chip size="sm" variant="outlined">{`Feed: ${claimDetail.feed_name}`}</Chip>
					)}
				</div>
				<div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
					<Button variant="icon" size="sm" title="Edit Claim" onClick={handleEditClaim}>
						<IconEdit size={20} />
					</Button>
					{(isAdmin || isSuperAdmin) && (
						<>
							<Button variant="icon" size="sm" title="Assign Claim" disabled>
								<IconClipboard size={20} />
							</Button>
							<Button variant="icon" size="sm" title="Archive Claim" disabled>
								<IconArchive size={20} />
							</Button>
						</>
					)}
					<Button variant="icon" size="sm" title="Print" disabled>
						<IconPrinter size={20} />
					</Button>
				</div>
			</div>
		</div>
	);
}

const styles = {
	container: {
		padding: '20px 30px',
		border: 'none',
	},
};
