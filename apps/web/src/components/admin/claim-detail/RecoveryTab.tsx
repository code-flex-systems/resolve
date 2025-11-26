'use client';

import {
	Box,
	Button,
	Chip,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Divider,
	Paper,
	Skeleton,
	Stack,
	TextField,
	Typography,
} from '@mui/material';
import AddBox from '@mui/icons-material/AddBox';
import AttachMoney from '@mui/icons-material/AttachMoney';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useRecoveryTrpc } from '@/hooks/trpc/useRecoveryTrpc';
import Highlight from '@/components/common/Highlight';
import { formatCurrencyExact } from '@/lib/utils/recoveryUtils';
import { BASE_COLOR_LIGHT } from '@/styles/theme';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

interface RecoveryTabProps {
	claimId: number;
}

interface RecoveryFormData {
	recovery_date: string;
	recovery_amount: string;
	recovery_source: string;
	notes: string;
}

export default function RecoveryTab({ claimId }: RecoveryTabProps) {
	const [showDialog, setShowDialog] = useState(false);
	const [formData, setFormData] = useState<RecoveryFormData>({
		recovery_date: dayjs().format('YYYY-MM-DD'),
		recovery_amount: '',
		recovery_source: '',
		notes: '',
	});

	const { data: claimDetail } = trpc.claim.getClaimDetail.useQuery({ claimId });
	const { data: recoveryEvents = [], isLoading } = useRecoveryTrpc().listRecoveryEvents(
		{ claimId },
		{ enabled: !!claimId }
	);
	const createRecoveryEvent = useRecoveryTrpc().createRecoveryEvent;

	const handleOpenDialog = () => {
		setFormData({
			recovery_date: dayjs().format('YYYY-MM-DD'),
			recovery_amount: '',
			recovery_source: '',
			notes: '',
		});
		setShowDialog(true);
	};

	const handleCloseDialog = () => {
		setShowDialog(false);
		setFormData({
			recovery_date: dayjs().format('YYYY-MM-DD'),
			recovery_amount: '',
			recovery_source: '',
			notes: '',
		});
	};

	const handleSubmit = async () => {
		try {
			await createRecoveryEvent.mutateAsync({
				claimId,
				params: {
					recovery_date: formData.recovery_date,
					recovery_amount: formData.recovery_amount,
					recovery_source: formData.recovery_source || undefined,
					notes: formData.notes || undefined,
				},
			});
			handleCloseDialog();
		} catch (error) {
			console.error('Failed to create recovery event:', error);
		}
	};

	const totalRecovered = recoveryEvents.reduce(
		(sum, event) => sum + (event.recovery_amount ? parseFloat(event.recovery_amount.toString()) : 0),
		0
	);

	return (
		<Box p={3}>
			<Stack spacing={3} maxWidth={1000} mx="auto">
				{/* Recovery Summary */}
				<Paper elevation={0} sx={styles.paper}>
					<Typography fontSize={13} color={BASE_COLOR_LIGHT} marginBottom={2}>
						Recovery Summary
					</Typography>
					<Box
						display="grid"
						gridTemplateColumns={{
							xs: '1fr',
							sm: 'repeat(2, 1fr)',
							md: 'repeat(3, 1fr)',
						}}
						gap={3}
					>
						{/* Team-tracked fields */}
						<Box>
							<Typography fontSize={12} color={BASE_COLOR_LIGHT} marginBottom={0.5}>
								Expected Recovery
							</Typography>
							<Typography variant="body2" fontSize={11} color="text.secondary" marginBottom={1}>
								Team's forecasted recovery
							</Typography>
							<Typography variant="h6" fontSize={18} color="primary.main">
								{formatCurrencyExact(Number(claimDetail?.expected_recovery) || 0)}
							</Typography>
						</Box>
						<Box>
							<Typography fontSize={12} color={BASE_COLOR_LIGHT} marginBottom={0.5}>
								Actual Recovery
							</Typography>
							<Typography variant="body2" fontSize={11} color="text.secondary" marginBottom={1}>
								Team's meaningful payments (from recovery events)
							</Typography>
							<Typography variant="h6" fontSize={18} color="success.main">
								{formatCurrencyExact(Number(claimDetail?.actual_recovery) || 0)}
							</Typography>
						</Box>
						{/* Recovery Rate */}
						<Box>
							<Typography fontSize={12} color={BASE_COLOR_LIGHT} marginBottom={0.5}>
								Recovery Rate
							</Typography>
							<Typography variant="body2" fontSize={11} color="text.secondary" marginBottom={1}>
								Actual vs Expected (team forecast)
							</Typography>
							<Typography variant="h6" fontSize={18}>
								{claimDetail?.expected_recovery && Number(claimDetail.expected_recovery) > 0
									? `${Math.round((Number(claimDetail.actual_recovery || 0) / Number(claimDetail.expected_recovery)) * 100)}%`
									: 'N/A'}
							</Typography>
						</Box>
					</Box>
				</Paper>

				{/* Recovery Events */}
				<Paper elevation={0} sx={styles.paper}>
					<Box display="flex" justifyContent="space-between" alignItems="center" marginBottom={2}>
						<Typography fontSize={13} color={BASE_COLOR_LIGHT}>
							Recovery Events ({recoveryEvents.length})
						</Typography>
						<Button size="small" startIcon={<AddBox />} variant="contained" onClick={handleOpenDialog}>
							Add Recovery Event
						</Button>
					</Box>

					{isLoading && (
						<Stack spacing={2}>
							<Skeleton variant="rectangular" height={60} />
							<Skeleton variant="rectangular" height={60} />
						</Stack>
					)}

					{!isLoading && recoveryEvents.length === 0 && (
						<Box
							display="flex"
							flexDirection="column"
							alignItems="center"
							justifyContent="center"
							padding={4}
						>
							<AttachMoney sx={{ fontSize: 48, color: BASE_COLOR_LIGHT, marginBottom: 1 }} />
							<Typography fontSize={13} color={BASE_COLOR_LIGHT} fontStyle="italic">
								No recovery events recorded yet
							</Typography>
						</Box>
					)}

					{!isLoading && recoveryEvents.length > 0 && (
						<Stack spacing={2}>
							{recoveryEvents.map((event, index) => {
								// Calculate running total up to this event
								const runningTotal = recoveryEvents
									.slice(0, index + 1)
									.reduce((sum, e) => sum + parseFloat(e.recovery_amount.toString()), 0);

								return (
									<Box key={event.id}>
										<Box display="flex" gap={2}>
											<Box
												sx={{
													width: 8,
													height: 8,
													borderRadius: '50%',
													bgcolor: 'success.main',
													marginTop: '6px',
													flexShrink: 0,
												}}
											/>
											<Box flex={1}>
												<Box
													display="flex"
													justifyContent="space-between"
													alignItems="flex-start"
												>
													<Box flex={1}>
														<Typography fontSize={14} fontWeight={600} marginBottom={0.5}>
															{formatCurrencyExact(
																parseFloat(event.recovery_amount.toString())
															)}
														</Typography>
														{event.recovery_source && (
															<Typography fontSize={13} marginBottom={0.5}>
																Source: <Highlight>{event.recovery_source}</Highlight>
															</Typography>
														)}
														{event.notes && (
															<Typography fontSize={13} color="text.secondary">
																{event.notes}
															</Typography>
														)}
														<Typography
															fontSize={12}
															color={BASE_COLOR_LIGHT}
															marginTop={1}
														>
															{dayjs(event.recovery_date).format('MMM D, YYYY')} (
															{dayjs(event.recovery_date).fromNow()})
														</Typography>
													</Box>
													<Chip
														label={formatCurrencyExact(runningTotal)}
														size="small"
														color="success"
													/>
												</Box>
											</Box>
										</Box>
										<Divider sx={{ marginTop: 2 }} />
									</Box>
								);
							})}
							<Box padding={2} bgcolor="#f5f5f5" borderRadius={1}>
								<Box display="flex" justifyContent="space-between" alignItems="center">
									<Typography fontSize={14} fontWeight={600}>
										Total Recovered
									</Typography>
									<Typography fontSize={16} fontWeight={700} color="success.main">
										{formatCurrencyExact(totalRecovered)}
									</Typography>
								</Box>
							</Box>
						</Stack>
					)}
				</Paper>
			</Stack>

			{/* Add Recovery Event Dialog */}
			<Dialog open={showDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
				<DialogTitle>Add Recovery Event</DialogTitle>
				<DialogContent>
					<Box display="flex" flexDirection="column" gap={2} paddingTop={1}>
						<TextField
							label="Recovery Date"
							type="date"
							value={formData.recovery_date}
							onChange={(e) => setFormData({ ...formData, recovery_date: e.target.value })}
							fullWidth
							InputLabelProps={{ shrink: true }}
						/>
						<TextField
							label="Recovery Amount"
							type="number"
							value={formData.recovery_amount}
							onChange={(e) => setFormData({ ...formData, recovery_amount: e.target.value })}
							fullWidth
							required
							placeholder="0.00"
							inputProps={{ step: '0.01', min: '0' }}
						/>
						<TextField
							label="Recovery Source"
							value={formData.recovery_source}
							onChange={(e) => setFormData({ ...formData, recovery_source: e.target.value })}
							fullWidth
							placeholder="e.g., Settlement, Court Judgment, etc."
						/>
						<TextField
							label="Notes"
							value={formData.notes}
							onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
							fullWidth
							multiline
							rows={3}
							placeholder="Additional details about this recovery..."
						/>
					</Box>
				</DialogContent>
				<DialogActions>
					<Button onClick={handleCloseDialog}>Cancel</Button>
					<Button
						onClick={handleSubmit}
						variant="contained"
						disabled={!formData.recovery_amount || parseFloat(formData.recovery_amount) <= 0}
					>
						Create
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
	);
}

const styles = {
	paper: {
		padding: '20px',
		border: 1,
		borderColor: 'divider',
	},
};
