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
	Chip,
	List,
	ListItem,
	ListItemText,
} from '@mui/material';
import { TEXT_PRIMARY, TEXT_SECONDARY } from '@/styles/theme';
import PeopleIcon from '@mui/icons-material/People';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { getSeverityLabel, getSeverityColor } from '@/lib/workflow/suggestions';
import { SuggestionStatus } from '@/config/enums';

interface BreachResolution {
	suggestionId?: string;
	status?: SuggestionStatus;
	breach: {
		deskLocationId: number;
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
		deskLocationId: number;
		deskLocationName: string;
		newPriority: number;
		previousPriority: number | null;
	}>;
	cascadedChanges: Array<{
		userId: string;
		userName: string;
		deskLocationId: number;
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

	const { breach, assignments, cascadedChanges, shortfall, skippedUsers, usersNeeded, status } = resolution;
	const isFullyResolved = shortfall === 0;
	const isIgnored = status === SuggestionStatus.IGNORED;

	// Calculate benefit text for header
	const reductionPercent = usersNeeded > 0 ? Math.round((assignments.length / usersNeeded) * 100) : 0;
	const benefitText = isFullyResolved
		? 'Resolves bottleneck'
		: `Reduces bottleneck by ${reductionPercent}% (${assignments.length}/${usersNeeded} assigned)`;

	return (
		<Dialog open={open} onClose={isBusy ? undefined : onClose} maxWidth="sm" fullWidth>
			<DialogTitle>
				<Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
					<PeopleIcon sx={{ color: '#21B5FF', fontSize: 28 }} />
					<Box>
						<Typography sx={{ fontSize: 18, fontWeight: 600, color: TEXT_PRIMARY }}>
							Reassign {assignments.length} user{assignments.length !== 1 ? 's' : ''} to{' '}
							{breach.deskLocationTypeName} - {breach.deskLocationName}
						</Typography>
						<Typography sx={{ fontSize: 13, color: TEXT_SECONDARY, mt: 0.5 }}>
							{breach.excessUnits} excess work units • {usersNeeded} user{usersNeeded !== 1 ? 's' : ''}{' '}
							needed
						</Typography>
						<Typography sx={{ fontSize: 13, color: 'success.main', fontWeight: 500, mt: 0.5 }}>
							{benefitText}
						</Typography>
					</Box>
				</Box>
			</DialogTitle>

			<Divider />

			<DialogContent sx={{ pt: 3 }}>
				{/* Breach Details */}
				<Box sx={{ mb: 3 }}>
					<Typography sx={{ fontSize: 15, fontWeight: 600, color: TEXT_PRIMARY, mb: 1.5 }}>
						Breach Details
					</Typography>
					<Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
						<Chip
							label={`Desk Location Capacity: ${breach.capacityThreshold} units`}
							size="small"
							sx={{ backgroundColor: '#f1f5f9' }}
						/>
						<Chip
							label={`Severity: ${getSeverityLabel(breach.severity)}`}
							size="small"
							sx={{
								backgroundColor: getSeverityColor(breach.severity).bg,
								color: getSeverityColor(breach.severity).color,
							}}
						/>
						<Chip
							label={isFullyResolved ? 'Fully Resolvable' : 'Partially Resolvable'}
							size="small"
							sx={{
								backgroundColor: isFullyResolved ? '#dcfce7' : '#fef3c7',
								color: isFullyResolved ? '#15803d' : '#92400e',
							}}
						/>
					</Box>
				</Box>

				{/* User Assignments */}
				{assignments.length > 0 && (
					<Box sx={{ mb: 3 }}>
						<Typography sx={{ fontSize: 15, fontWeight: 600, color: TEXT_PRIMARY, mb: 1.5 }}>
							Recommended Assignments ({assignments.length})
						</Typography>
						<List sx={{ py: 0 }}>
							{assignments.map((assignment, index) => (
								<ListItem
									key={`${assignment.userId}-${index}`}
									sx={{
										px: 2,
										py: 1.5,
										mb: 1,
										borderRadius: 1,
										backgroundColor: '#f8fafc',
										border: '1px solid #e2e8f0',
									}}
								>
									<ListItemText
										primary={
											<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
												<Typography sx={{ fontSize: 14, fontWeight: 500, color: TEXT_PRIMARY }}>
													{assignment.userName}
												</Typography>
												<ArrowForwardIcon sx={{ fontSize: 16, color: TEXT_SECONDARY }} />
												<Chip
													label={`Priority ${assignment.newPriority}`}
													size="small"
													sx={(theme) => ({
														height: 20,
														fontSize: 11,
														fontWeight: 600,
														backgroundColor: theme.palette.primary.light,
														color: 'white',
													})}
												/>
											</Box>
										}
										secondary={
											<Typography sx={{ fontSize: 12, color: TEXT_SECONDARY, mt: 0.5 }}>
												{assignment.previousPriority !== null
													? `Currently P${assignment.previousPriority} → Moving to P${assignment.newPriority}`
													: `Currently unassigned → Assigning to P${assignment.newPriority}`}
											</Typography>
										}
									/>
								</ListItem>
							))}
						</List>
					</Box>
				)}

				{/* Cascaded Changes */}
				{cascadedChanges.length > 0 && (
					<Box sx={{ mb: 3 }}>
						<Typography sx={{ fontSize: 15, fontWeight: 600, color: TEXT_PRIMARY, mb: 1.5 }}>
							Cascaded Priority Changes ({cascadedChanges.length})
						</Typography>
						<List sx={{ py: 0 }}>
							{cascadedChanges.map((change, index) => (
								<ListItem
									key={`${change.userId}-${change.deskLocationId}-${index}`}
									sx={{
										px: 2,
										py: 1.5,
										mb: 1,
										borderRadius: 1,
										backgroundColor: '#fef3c7',
										border: '1px solid #fde68a',
									}}
								>
									<ListItemText
										primary={
											<Typography sx={{ fontSize: 14, fontWeight: 500, color: TEXT_PRIMARY }}>
												{change.userName} - {change.deskLocationName}
											</Typography>
										}
										secondary={
											<Typography sx={{ fontSize: 12, color: '#92400e', mt: 0.5 }}>
												{change.newPriority !== null
													? `P${change.previousPriority} → P${change.newPriority} (shifted down)`
													: `P${change.previousPriority} → Removed (pushed past P5)`}
											</Typography>
										}
									/>
								</ListItem>
							))}
						</List>
					</Box>
				)}

				{/* Skipped Users */}
				{skippedUsers.length > 0 && (
					<Box sx={{ mb: 3 }}>
						<Typography sx={{ fontSize: 15, fontWeight: 600, color: TEXT_PRIMARY, mb: 1.5 }}>
							Skipped Users ({skippedUsers.length})
						</Typography>
						<List sx={{ py: 0 }}>
							{skippedUsers.map((user, index) => (
								<ListItem
									key={`${user.userId}-${index}`}
									sx={{
										px: 2,
										py: 1.5,
										mb: 1,
										borderRadius: 1,
										backgroundColor: '#fee2e2',
										border: '1px solid #fecaca',
									}}
								>
									<ListItemText
										primary={
											<Typography sx={{ fontSize: 14, fontWeight: 500, color: TEXT_PRIMARY }}>
												{user.userName}
											</Typography>
										}
										secondary={
											<Typography sx={{ fontSize: 12, color: '#991b1b', mt: 0.5 }}>
												{user.reason === 'PRIORITY_EXHAUSTION'
													? 'All priority slots (P1-P5) occupied by other locations'
													: user.reason}
											</Typography>
										}
									/>
								</ListItem>
							))}
						</List>
					</Box>
				)}

				{/* Additional Info */}
				{!isFullyResolved && (
					<Box
						sx={{
							p: 2,
							borderRadius: 2,
							backgroundColor: '#fef3c7',
							border: '1px solid #fde68a',
							display: 'flex',
							alignItems: 'center',
							gap: 1.5,
						}}
					>
						<WarningAmberIcon sx={{ color: '#92400e', fontSize: 20 }} />
						<Typography sx={{ fontSize: 13, color: '#92400e' }}>
							{shortfall} additional user{shortfall !== 1 ? 's' : ''} needed for full resolution
						</Typography>
					</Box>
				)}
			</DialogContent>

			<Divider />

			<DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
				<Box sx={{ display: 'flex', gap: 1 }}>
					{isIgnored ? (
						// For ignored suggestions, show restore button
						<Button onClick={onRestore} variant="outlined" color="primary" disabled={isBusy} sx={{ textTransform: 'none' }}>
							Restore
						</Button>
					) : (
						// For pending suggestions, show ignore button
						<>
							{/* Hide feature disabled for now
							<Button onClick={onHide} variant="outlined" disabled={isBusy} sx={{ textTransform: 'none' }}>
								Hide
							</Button>
							*/}
							<Button
								onClick={onIgnore}
								variant="outlined"
								color="warning"
								disabled={isBusy}
								sx={{ textTransform: 'none' }}
							>
								Ignore & Recalculate
							</Button>
						</>
					)}
				</Box>
				<Box sx={{ display: 'flex', gap: 1 }}>
					<Button onClick={onClose} disabled={isBusy} sx={{ textTransform: 'none' }}>
						Cancel
					</Button>
					{!isIgnored && (
						<Button
							onClick={onExecute}
							variant="contained"
							color="success"
							disabled={isBusy}
						>
							Execute
						</Button>
					)}
				</Box>
			</DialogActions>
		</Dialog>
	);
}
