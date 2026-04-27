'use client;';

import BasicDialog from '../common/BasicDialog';
import UserSearch from './UserSearch';
import { useChecklistStore } from '@/stores/useChecklistStore';
import Chip from '@/components/ui/Chip';
import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import { useChecklistParams } from '@/hooks/useChecklistParams';
import { useCrudAlerts } from '@/hooks/useCrudAlerts';
import { IconAlertTriangle, IconHandStop } from '@tabler/icons-react';
import Collapse from '@/components/ui/Collapse';

export default function ChecklistHandoffDialog() {
	const { checklistId = '', claimId = '' } = useChecklistParams();
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
							`Checklist handed off to ${formattedAssignee || (selectedAssignee?.email ?? 'new assignee')}`
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
			showOverflow>
			<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
				<div style={styles.paper}>
					{/* <div style={styles.warning}> */}
					<div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
						<IconAlertTriangle size={20} style={{ color: 'var(--text-secondary)', marginLeft: '5px' }} />
						<div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-start', marginLeft: '10px' }}>
							<span style={{ fontSize: 15 }}>
								This action will transfer the claim to the selected assignee.
							</span>
							<span style={{ fontSize: 15 }}>
								You will no longer be able to make edits to the checklist.
							</span>
						</div>
					</div>
					{/* </div> */}

					<div style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
						<div style={{ margin: '10px' }}>
							<UserSearch selectedUser={selectedAssignee} setSelectedUser={(user) => useChecklistStore.getState().updateSelectedAssignee(user)} />
						</div>

						<Collapse open={!!selectedAssignee}>
							<span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
								<Chip color="info">{`${formattedAssignee} <${selectedAssignee?.email}>`}</Chip>
								<button onClick={() => useChecklistStore.getState().updateSelectedAssignee(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 14 }}>x</button>
							</span>
						</Collapse>
					</div>
				</div>
			</div>
		</BasicDialog>
	);
}

const styles = {
	paper: {
		borderRadius: 4,
		padding: '20px 10px',
	},
	warning: {
		padding: '5px',
		borderRadius: 4,
		marginBottom: '10px',
	},
};
