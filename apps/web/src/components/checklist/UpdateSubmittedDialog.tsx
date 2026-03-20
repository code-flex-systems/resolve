import { useChecklistStore } from '@/stores/useChecklistStore';
import BasicDialog from '../common/BasicDialog';
import { IconAlertTriangle } from '@tabler/icons-react';

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
			<div style={styles.paper}>
				<div    style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
					<IconAlertTriangle size={20} style={{ color: 'var(--text-secondary)' }} />
					<span   style={{ fontSize: 15, marginLeft: '15px' }}>
						Making changes to the checklist will cancel your submission and return the claim to in-progress.
					</span>
				</div>
			</div>
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
