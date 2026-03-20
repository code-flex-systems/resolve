'use client;';

import BasicDialog from '../common/BasicDialog';
import UserSearch from './UserSearch';
import { useChecklistStore } from '@/stores/useChecklistStore';
import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import { useChecklistParams } from '@/hooks/useChecklistParams';
import { BASE_COLOR } from '@/styles/theme';
import { useCrudAlerts } from '@/hooks/useCrudAlerts';
import { IconAlertTriangle, IconHandStop } from '@tabler/icons-react';
import Collapse from '@/components/ui/Collapse';

export default function ChecklistHandoffDialog() {
	const { checklistId = -1, claimId = -1 } = useChecklistParams();
	const selectedAssignee = useChecklistStore((state) => state.selectedAssignee);
	const formattedAssignee = `${selectedAssignee?.first ?? ''} ${selectedAssignee?.last ?? ''}`.trim();
	const { mutateAsync: updateChecklistClaim, isPending } = useChecklistTrpc().updateForClaim;
	const { showSuccess, showError } = useCrudAlerts('checklist');

	const onClose = () => {
		useChecklistStore.getState().toggleChecklistHandoffDialog();
		useChecklistStore.getState().updateSelectedAssignee(null);
	};

	return (
		<BasicDialog
			primaryAction={{
				label: selectedAssignee ? `Hand off to ${formattedAssignee}` : 'Hand off',
				icon: <IconHandStop size={20} />,
				disabled: !selectedAssignee || isPending,
				onClick: async () => {
					try {
						await updateChecklistClaim({ assignee: selectedAssignee?.email, checklistId, claimId });
						showSuccess(
							'assign',
							`Checklist handed off to ${formattedAssignee || selectedAssignee?.email ?? 'new assignee'}`
						);
					} catch (e) {
						showError('assign', e, 'Failed to hand off checklist');
					}
					useChecklistStore.getState().toggleChecklistHandoffDialog();
					useChecklistStore.getState().toggleChecklistProgressDialog(false);
					useChecklistStore.getState().updateSelectedAssignee(null);
				},
			}}
			secondaryActions={[
				{
					label: 'Back',
					onClick: onClose,
				},
			]}
			onClose={onClose}
			closeDisabled={isPending}
			width={550}
			showCloseButton={false}
			showOverflow
		>
			<Stack display="flex" justifyContent="center" alignItems="center">
				<Paper elevation={0} sx={styles.paper}>
					{/* <Paper elevation={0} sx={styles.warning}> */}
					<Box display="flex" justifyContent="flex-start" alignItems="center">
						<IconAlertTriangle size={20} style={{ color: BASE_COLOR, marginLeft: '5px' }} />
						<Stack display="flex" justifyContent="flex-start" alignItems="flex-start" marginLeft="10px">
							<Typography fontSize={15}>
								This action will transfer the claim to the selected assignee.
							</Typography>
							<Typography fontSize={15}>
								You will no longer be able to make edits to the checklist.
							</Typography>
						</Stack>
					</Box>
					{/* </Paper> */}

					<Stack width="100%" display="flex" justifyContent="center" alignItems="center">
						<Box bgcolor="white" margin="10px" borderRadius={4}>
							<UserSearch selectedUser={selectedAssignee} setSelectedUser={(user) => useChecklistStore.getState().updateSelectedAssignee(user)} />
						</Box>

						<Collapse open={!!selectedAssignee}>
							<Chip
								label={`${formattedAssignee} <${selectedAssignee?.email}>`}
								onDelete={() => useChecklistStore.getState().updateSelectedAssignee(null)}
								color="primary"
							/>
						</Collapse>
					</Stack>
				</Paper>
			</Stack>
		</BasicDialog>
	);
}

const styles = {
	paper: {
		borderRadius: 4,
		bgcolor: '#F7F8FA',
		padding: '20px 10px',
	},
	warning: {
		bgcolor: 'var(--status-warning)',
		padding: '5px',
		borderRadius: 4,
		marginBottom: '10px',
	},
};
