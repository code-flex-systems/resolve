'use client';
import Divider from '@/components/ui/Divider';
import Button from '@/components/ui/Button';
import { Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';


interface RuleExecutionSummaryDialogProps {
	open: boolean;
	onClose: () => void;
	summary: {
		rulesEvaluated: number;
		claimsMatched: number;
		actionsExecuted: number;
		actionsSuggested: number;
		errors: Array<{
			ruleId: number;
			ruleName: string;
			claimId?: number;
			error: string;
		}>;
	} | null;
	ruleName: string;
}

export default function RuleExecutionSummaryDialog({
	open,
	onClose,
	summary,
	ruleName,
}: RuleExecutionSummaryDialogProps) {
	if (!summary) return null;

	const stats = [
		{ label: 'Rules Evaluated', value: summary.rulesEvaluated, color: 'var(--text-primary)' },
		{ label: 'Claims Matched', value: summary.claimsMatched, color: 'var(--text-primary)' },
		{ label: 'Actions Executed', value: summary.actionsExecuted, color: '#15803d' },
		{ label: 'Actions Suggested', value: summary.actionsSuggested, color: '#1d4ed8' },
	];

	return (
		<Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
			<DialogTitle>
				<div>
					<span style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>
						Rule Execution Results
					</span>
					<span style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
						{ruleName}
					</span>
				</div>
			</DialogTitle>

			<Divider />

			<DialogContent style={{ paddingTop: 24 }}>
				{/* Stats Row */}
				<div style={{ flexDirection: 'column', display: 'flex', gap: 16, marginBottom: 24 }}>
					{stats.map((stat) => (
						<div
							key={stat.label}
							style={{
								flex: 1,
								border: '1px solid #e2e8f0',
								borderRadius: 8,
								padding: 16,
								textAlign: 'center',
							}}
						>
							<span style={{ fontSize: 24, fontWeight: 700, color: stat.color }}>
								{stat.value}
							</span>
							<span style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
								{stat.label}
							</span>
						</div>
					))}
				</div>

				{/* Errors Section */}
				{summary.errors.length > 0 && (
					<div style={{ marginBottom: 24 }}>
						<span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
							Errors ({summary.errors.length})
						</span>
						{summary.errors.map((err, index) => (
							<div
								key={`${err.ruleId}-${err.claimId ?? 'no-claim'}-${index}`}
								style={{
									paddingInline: 16,
									paddingBlock: 12,
									marginBottom: 8,
									borderRadius: 4,
									backgroundColor: '#fee2e2',
									border: '1px solid #fecaca',
								}}
							>
								<span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
									{err.ruleName}
									{err.claimId != null && (
										<span
											style={{ fontSize: 13, color: 'var(--text-secondary)', marginLeft: 8 }}
										>
											(Claim #{err.claimId})
										</span>
									)}
								</span>
								<span style={{ fontSize: 12, color: '#991b1b', marginTop: 4 }}>
									{err.error}
								</span>
							</div>
						))}
					</div>
				)}

				{/* No Claims Matched Note */}
				{summary.claimsMatched === 0 && (
					<div
						style={{
							padding: 16,
							borderRadius: 8,
							backgroundColor: '#f8fafc',
							border: '1px solid #e2e8f0',
							textAlign: 'center',
						}}
					>
						<span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
							No claims matched the rule&apos;s conditions
						</span>
					</div>
				)}
			</DialogContent>

			<Divider />

			<DialogActions style={{ paddingInline: 24, paddingBlock: 16 }}>
				<Button onClick={onClose} style={{ textTransform: 'none' }}>
					Close
				</Button>
			</DialogActions>
		</Dialog>
	);
}
