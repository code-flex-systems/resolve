import { useChecklistStore } from '@/stores/useChecklistStore';
import BasicDialog from '../common/BasicDialog';
import { Box, Paper, Typography } from '@mui/material';
import { Warning } from '@mui/icons-material';
import { BASE_COLOR } from '@/styles/theme';

export default function UpdateSubmittedDialog() {
	const updateSubmittedDialogAction = useChecklistStore((state) => state.updateSubmittedDialogAction);
	const toggleUpdateSubmittedDialog = useChecklistStore((state) => state.toggleUpdateSubmittedDialog);
	if (!updateSubmittedDialogAction) return <></>;
	return (
		<BasicDialog
			title="Save this page?"
			primaryAction={{
				label: 'Yes, I want to continue',
				onClick: () => {
					toggleUpdateSubmittedDialog();
					updateSubmittedDialogAction();
				},
			}}
			secondaryActions={[
				{
					label: 'Never mind',
					onClick: () => toggleUpdateSubmittedDialog(),
				},
			]}
			onClose={() => toggleUpdateSubmittedDialog()}
			showCloseButton={false}
			width={500}
		>
			<Paper elevation={0} sx={styles.paper}>
				<Box display="flex" justifyContent="flex-start" alignItems="center">
					<Warning sx={{ color: BASE_COLOR }} />
					<Typography fontSize={15} marginLeft="15px">
						Making changes to the checklist will cancel your submission and return the claim to in-progress.
					</Typography>
				</Box>
			</Paper>
		</BasicDialog>
	);
}

const styles = {
	paper: {
		borderRadius: 4,
		bgcolor: '#F7F8FA',
		padding: '20px',
		height: 80,
		minHeight: 80,
		maxHeight: 80,
	},
};
