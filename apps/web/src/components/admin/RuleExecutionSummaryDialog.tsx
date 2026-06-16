'use client';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';

interface RuleExecutionSummaryDialogProps {
	open: boolean;
	onClose: () => void;
	summary: {
		rulesEvaluated: number;
		claimsMatched: number;
		actionsExecuted: number;
		actionsSuggested: number;
		errors: Array<{
			ruleId: string;
			ruleName: string;
			claimId?: string;
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
		{ label: 'Actions Executed', value: summary.actionsExecuted, color: 'var(--status-success)' },
		{ label: 'Actions Suggested', value: summary.actionsSuggested, color: 'var(--status-info)' },
	];

	return (
		<Dialog
			open={open}
			onClose={onClose}
			title="Rule Execution Results"
			description={ruleName}
			size="sm"
			footer={
				<div style={{ display: 'flex', justifyContent: 'flex-end' }}>
					<Button onClick={onClose} style={{ textTransform: 'none' }}>
						Close
					</Button>
				</div>
			}
		>
			{/* Stats Row */}
			<div style={{ flexDirection: 'column', display: 'flex', gap: 16, marginBottom: 24 }}>
				{stats.map((stat) => (
					<div
						key={stat.label}
						style={{
							flex: 1,
							border: '1px solid var(--border)',
							borderRadius: 8,
							padding: 16,
							textAlign: 'center',
						}}
					>
						<span style={{ fontSize: 24, fontWeight: 700, color: stat.color }}>{stat.value}</span>
						<span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 4 }}>
							{stat.label}
						</span>
					</div>
				))}
			</div>

			{/* Errors Section */}
			{summary.errors.length > 0 && (
				<div style={{ marginBottom: 24 }}>
					<span
						style={{
							fontSize: 15,
							fontWeight: 600,
							color: 'var(--text-primary)',
							marginBottom: 12,
						}}
					>
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
								backgroundColor: 'var(--status-error-bg)',
								border: '1px solid color-mix(in srgb, var(--status-error) 35%, transparent)',
							}}
						>
							<span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
								{err.ruleName}
								{err.claimId != null && (
									<span style={{ fontSize: 13, color: 'var(--text-secondary)', marginLeft: 8 }}>
										(Claim #{err.claimId})
									</span>
								)}
							</span>
							<span style={{ fontSize: 'var(--text-xs)', color: 'var(--status-error)', marginTop: 4 }}>
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
						backgroundColor: 'var(--bg-secondary)',
						border: '1px solid var(--border)',
						textAlign: 'center',
					}}
				>
					<span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
						No claims matched the rule&apos;s conditions
					</span>
				</div>
			)}
		</Dialog>
	);
}
