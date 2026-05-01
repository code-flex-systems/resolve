'use client';

import { IconAlertTriangle, IconArrowRight, IconUsers } from '@tabler/icons-react';
import Button from '@/components/ui/Button';
import Chip from '@/components/ui/Chip';
import Divider from '@/components/ui/Divider';
import Dialog from '@/components/ui/Dialog';
import { getSeverityLabel, getSeverityColor } from '@/lib/workflow/suggestions';
import { SuggestionStatus } from '@/config/enums';

interface BreachResolution {
	suggestionId?: string;
	status?: SuggestionStatus;
	breach: {
		deskLocationId: string;
		deskLocationName: string;
		deskLocationTypeName: string;
		excessUnits: number;
		capacityThreshold: number;
		severity: number;
	};
	usersNeeded: number;
	assignments: Array<{
		userId: string;
		userName: string;
		deskLocationId: string;
		deskLocationName: string;
		newPriority: number;
		previousPriority: number | null;
	}>;
	cascadedChanges: Array<{
		userId: string;
		userName: string;
		deskLocationId: string;
		deskLocationName: string;
		previousPriority: number;
		newPriority: number | null;
	}>;
	shortfall: number;
	skippedUsers: Array<{
		userId: string;
		userName: string;
		reason: string;
	}>;
}

interface SuggestionDetailDialogProps {
	open: boolean;
	onClose: () => void;
	resolution: BreachResolution | null;
	onExecute?: () => void;
	onHide?: () => void;
	onIgnore?: () => void;
	onRestore?: () => void;
	isBusy?: boolean;
}

export default function SuggestionDetailDialog({
	open,
	onClose,
	resolution,
	onExecute,
	onHide,
	onIgnore,
	onRestore,
	isBusy = false,
}: SuggestionDetailDialogProps) {
	if (!resolution) return null;

	const { breach, assignments, cascadedChanges, shortfall, skippedUsers, usersNeeded, status } =
		resolution;
	const isFullyResolved = shortfall === 0;
	const isIgnored = status === SuggestionStatus.IGNORED;

	const reductionPercent =
		usersNeeded > 0 ? Math.round((assignments.length / usersNeeded) * 100) : 0;
	const benefitText = isFullyResolved
		? 'Resolves bottleneck'
		: `Reduces bottleneck by ${reductionPercent}% (${assignments.length}/${usersNeeded} assigned)`;

	const footer = (
		<div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
			<div style={{ display: 'flex', gap: 8 }}>
				{isIgnored ? (
					<Button onClick={onRestore} variant="outlined" color="primary" disabled={isBusy}>
						Restore
					</Button>
				) : (
					<Button onClick={onIgnore} variant="outlined" color="warning" disabled={isBusy}>
						Ignore &amp; Recalculate
					</Button>
				)}
			</div>
			<div style={{ display: 'flex', gap: 8 }}>
				<Button onClick={onClose} variant="text" disabled={isBusy}>
					Cancel
				</Button>
				{!isIgnored && (
					<Button onClick={onExecute} variant="contained" color="success" disabled={isBusy}>
						Execute
					</Button>
				)}
			</div>
		</div>
	);

	return (
		<Dialog open={open} onClose={isBusy ? () => {} : onClose} size="md" footer={footer}>
			{/* Header */}
			<div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
				<IconUsers size={28} style={{ color: 'var(--text-accent)' }} />
				<div>
					<span
						style={{
							fontSize: 18,
							fontWeight: 600,
							color: 'var(--text-primary)',
							display: 'block',
						}}
					>
						Reassign {assignments.length} user{assignments.length !== 1 ? 's' : ''} to{' '}
						{breach.deskLocationTypeName} - {breach.deskLocationName}
					</span>
					<span
						style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginTop: 4 }}
					>
						{breach.excessUnits} excess work units &bull; {usersNeeded} user
						{usersNeeded !== 1 ? 's' : ''} needed
					</span>
					<span
						style={{
							fontSize: 13,
							color: 'var(--status-success)',
							fontWeight: 500,
							display: 'block',
							marginTop: 4,
						}}
					>
						{benefitText}
					</span>
				</div>
			</div>

			<Divider spacing="md" />

			{/* Breach Details */}
			<div style={{ marginBottom: 24 }}>
				<span
					style={{
						fontSize: 15,
						fontWeight: 600,
						color: 'var(--text-primary)',
						display: 'block',
						marginBottom: 12,
					}}
				>
					Breach Details
				</span>
				<div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
					<Chip size="sm">Desk Location Capacity: {breach.capacityThreshold} units</Chip>
					<Chip
						size="sm"
						style={{
							backgroundColor: getSeverityColor(breach.severity).bg,
							color: getSeverityColor(breach.severity).color,
						}}
					>
						Severity: {getSeverityLabel(breach.severity)}
					</Chip>
					<Chip
						size="sm"
						style={{
							backgroundColor: isFullyResolved ? '#dcfce7' : '#fef3c7',
							color: isFullyResolved ? '#15803d' : '#92400e',
						}}
					>
						{isFullyResolved ? 'Fully Resolvable' : 'Partially Resolvable'}
					</Chip>
				</div>
			</div>

			{/* User Assignments */}
			{assignments.length > 0 && (
				<div style={{ marginBottom: 24 }}>
					<span
						style={{
							fontSize: 15,
							fontWeight: 600,
							color: 'var(--text-primary)',
							display: 'block',
							marginBottom: 12,
						}}
					>
						Recommended Assignments ({assignments.length})
					</span>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
						{assignments.map((assignment, index) => (
							<div
								key={`${assignment.userId}-${index}`}
								style={{
									padding: '12px 16px',
									borderRadius: 4,
									backgroundColor: 'var(--bg-secondary)',
									border: '1px solid var(--border)',
								}}
							>
								<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
									<span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
										{assignment.userName}
									</span>
									<IconArrowRight size={16} style={{ color: 'var(--text-secondary)' }} />
									<span
										style={{
											fontSize: 11,
											fontWeight: 600,
											padding: '2px 8px',
											borderRadius: 10,
											backgroundColor: 'var(--text-accent)',
											color: 'white',
										}}
									>
										Priority {assignment.newPriority}
									</span>
								</div>
								<span
									style={{
										fontSize: 12,
										color: 'var(--text-secondary)',
										marginTop: 4,
										display: 'block',
									}}
								>
									{assignment.previousPriority !== null
										? `Currently P${assignment.previousPriority} → Moving to P${assignment.newPriority}`
										: `Currently unassigned → Assigning to P${assignment.newPriority}`}
								</span>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Cascaded Changes */}
			{cascadedChanges.length > 0 && (
				<div style={{ marginBottom: 24 }}>
					<span
						style={{
							fontSize: 15,
							fontWeight: 600,
							color: 'var(--text-primary)',
							display: 'block',
							marginBottom: 12,
						}}
					>
						Cascaded Priority Changes ({cascadedChanges.length})
					</span>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
						{cascadedChanges.map((change, index) => (
							<div
								key={`${change.userId}-${change.deskLocationId}-${index}`}
								style={{
									padding: '12px 16px',
									borderRadius: 4,
									backgroundColor: '#fef3c7',
									border: '1px solid #fde68a',
								}}
							>
								<span
									style={{
										fontSize: 14,
										fontWeight: 500,
										color: 'var(--text-primary)',
										display: 'block',
									}}
								>
									{change.userName} - {change.deskLocationName}
								</span>
								<span style={{ fontSize: 12, color: '#92400e', marginTop: 4, display: 'block' }}>
									{change.newPriority !== null
										? `P${change.previousPriority} → P${change.newPriority} (shifted down)`
										: `P${change.previousPriority} → Removed (pushed past P5)`}
								</span>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Skipped Users */}
			{skippedUsers.length > 0 && (
				<div style={{ marginBottom: 24 }}>
					<span
						style={{
							fontSize: 15,
							fontWeight: 600,
							color: 'var(--text-primary)',
							display: 'block',
							marginBottom: 12,
						}}
					>
						Skipped Users ({skippedUsers.length})
					</span>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
						{skippedUsers.map((user, index) => (
							<div
								key={`${user.userId}-${index}`}
								style={{
									padding: '12px 16px',
									borderRadius: 4,
									backgroundColor: '#fee2e2',
									border: '1px solid #fecaca',
								}}
							>
								<span
									style={{
										fontSize: 14,
										fontWeight: 500,
										color: 'var(--text-primary)',
										display: 'block',
									}}
								>
									{user.userName}
								</span>
								<span style={{ fontSize: 12, color: '#991b1b', marginTop: 4, display: 'block' }}>
									{user.reason === 'PRIORITY_EXHAUSTION'
										? 'All priority slots (P1-P5) occupied by other locations'
										: user.reason}
								</span>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Additional Info */}
			{!isFullyResolved && (
				<div
					style={{
						padding: 16,
						borderRadius: 8,
						backgroundColor: '#fef3c7',
						border: '1px solid #fde68a',
						display: 'flex',
						alignItems: 'center',
						gap: 12,
					}}
				>
					<IconAlertTriangle size={20} style={{ color: '#92400e' }} />
					<span style={{ fontSize: 13, color: '#92400e' }}>
						{shortfall} additional user{shortfall !== 1 ? 's' : ''} needed for full resolution
					</span>
				</div>
			)}
		</Dialog>
	);
}
