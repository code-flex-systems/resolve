'use client';

import {
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Button,
	Box,
	Typography,
	Divider,
	Stack,
} from '@mui/material';
import { TEXT_PRIMARY, TEXT_SECONDARY } from '@/styles/theme';

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
		{ label: 'Rules Evaluated', value: summary.rulesEvaluated, color: TEXT_PRIMARY },
		{ label: 'Claims Matched', value: summary.claimsMatched, color: TEXT_PRIMARY },
		{ label: 'Actions Executed', value: summary.actionsExecuted, color: '#15803d' },
		{ label: 'Actions Suggested', value: summary.actionsSuggested, color: '#1d4ed8' },
	];

	return (
		<Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
			<DialogTitle>
				<Box>
					<Typography sx={{ fontSize: 18, fontWeight: 600, color: TEXT_PRIMARY }}>
						Rule Execution Results
					</Typography>
					<Typography sx={{ fontSize: 13, color: TEXT_SECONDARY, mt: 0.5 }}>
						{ruleName}
					</Typography>
				</Box>
			</DialogTitle>

			<Divider />

			<DialogContent sx={{ pt: 3 }}>
				{/* Stats Row */}
				<Stack direction="row" spacing={2} sx={{ mb: 3 }}>
					{stats.map((stat) => (
						<Box
							key={stat.label}
							sx={{
								flex: 1,
								border: '1px solid #e2e8f0',
								borderRadius: 2,
								p: 2,
								textAlign: 'center',
							}}
						>
							<Typography sx={{ fontSize: 24, fontWeight: 700, color: stat.color }}>
								{stat.value}
							</Typography>
							<Typography sx={{ fontSize: 12, color: TEXT_SECONDARY, mt: 0.5 }}>
								{stat.label}
							</Typography>
						</Box>
					))}
				</Stack>

				{/* Errors Section */}
				{summary.errors.length > 0 && (
					<Box sx={{ mb: 3 }}>
						<Typography sx={{ fontSize: 15, fontWeight: 600, color: TEXT_PRIMARY, mb: 1.5 }}>
							Errors ({summary.errors.length})
						</Typography>
						{summary.errors.map((err, index) => (
							<Box
								key={`${err.ruleId}-${err.claimId ?? 'no-claim'}-${index}`}
								sx={{
									px: 2,
									py: 1.5,
									mb: 1,
									borderRadius: 1,
									backgroundColor: '#fee2e2',
									border: '1px solid #fecaca',
								}}
							>
								<Typography sx={{ fontSize: 14, fontWeight: 500, color: TEXT_PRIMARY }}>
									{err.ruleName}
									{err.claimId != null && (
										<Typography
											component="span"
											sx={{ fontSize: 13, color: TEXT_SECONDARY, ml: 1 }}
										>
											(Claim #{err.claimId})
										</Typography>
									)}
								</Typography>
								<Typography sx={{ fontSize: 12, color: '#991b1b', mt: 0.5 }}>
									{err.error}
								</Typography>
							</Box>
						))}
					</Box>
				)}

				{/* No Claims Matched Note */}
				{summary.claimsMatched === 0 && (
					<Box
						sx={{
							p: 2,
							borderRadius: 2,
							backgroundColor: '#f8fafc',
							border: '1px solid #e2e8f0',
							textAlign: 'center',
						}}
					>
						<Typography sx={{ fontSize: 13, color: TEXT_SECONDARY }}>
							No claims matched the rule&apos;s conditions
						</Typography>
					</Box>
				)}
			</DialogContent>

			<Divider />

			<DialogActions sx={{ px: 3, py: 2 }}>
				<Button onClick={onClose} sx={{ textTransform: 'none' }}>
					Close
				</Button>
			</DialogActions>
		</Dialog>
	);
}
