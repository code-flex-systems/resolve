'use client';

import { IconClipboard } from '@tabler/icons-react';
import { Dialog, FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import BasicDialog from '../common/BasicDialog';
import { useState } from 'react';
import { useDeskTrpc } from '@/hooks/trpc/useDeskTrpc';
import { useAlertStore } from '@/stores/useAlertStore';
import DeskLocationTypeSelect from '../common/DeskLocationTypeSelect';
import DeskLocationSelect from '../common/DeskLocationSelect';

interface BulkDeskAssignmentDialogProps {
	selectedUserIds: string[];
	onClose: () => void;
}

export default function BulkDeskAssignmentDialog({ selectedUserIds, onClose }: BulkDeskAssignmentDialogProps) {
	const [deskLocationTypeId, setDeskLocationTypeId] = useState<number | null>(null);
	const [deskLocationId, setDeskLocationId] = useState<number | null>(null);
	const [priority, setPriority] = useState<number>(1);

	const showAlert = useAlertStore((state) => state.showAlert);
	const { mutateAsync: bulkAssignUsers, isPending } = useDeskTrpc().bulkAssignUsers;

	const handleAssign = async () => {
		if (!deskLocationId) {
			showAlert('Please select a desk location', 'error');
			return;
		}

		try {
			// Bulk assign all users in a single transaction (all-or-nothing)
			await bulkAssignUsers({
				userIds: selectedUserIds,
				deskLocationId,
				priority,
			});

			showAlert(
				`Successfully assigned ${selectedUserIds.length} user(s) to desk location`,
				'success'
			);
			onClose();
		} catch (error: any) {
			const message = error?.message || 'Failed to assign users to desk location';
			showAlert(message, 'error');
		}
	};

	return (
		<BasicDialog
			title="Bulk Assign Users to Desk"
			primaryAction={{
				label: 'Assign',
				onClick: handleAssign,
				icon: <IconClipboard size={20} />,
				disabled: isPending || !deskLocationId,
			}}
			secondaryActions={[
				{
					label: 'Cancel',
					onClick: onClose,
				},
			]}
			onClose={onClose}
			width={500}
		>
			<div style={{ width: '100%', display: 'flex', alignItems: 'center', flexDirection: 'column', gap: 16 }}>
				<span style={{  color: 'var(--text-secondary)' ,  width: 400, marginBottom: 1  }}>
					Assigning {selectedUserIds.length} user(s) to a desk location
				</span>

				<DeskLocationTypeSelect
					value={deskLocationTypeId}
					onChange={(newValue) => {
						setDeskLocationTypeId(newValue);
						setDeskLocationId(null); // Reset location when type changes
					}}
					required
				/>

				<DeskLocationSelect
					value={deskLocationId}
					onChange={setDeskLocationId}
					deskLocationTypeId={deskLocationTypeId}
					disabled={!deskLocationTypeId}
					required
				/>

				<FormControl style={{ width: 400, margin: '5px 0px' }}>
					<InputLabel>Priority</InputLabel>
					<Select
						value={priority}
						onChange={(e) => setPriority(e.target.value as number)}
						disabled={isPending}
					>
						<MenuItem value={1}>Priority 1 (Highest)</MenuItem>
						<MenuItem value={2}>Priority 2</MenuItem>
						<MenuItem value={3}>Priority 3</MenuItem>
						<MenuItem value={4}>Priority 4</MenuItem>
						<MenuItem value={5}>Priority 5 (Lowest)</MenuItem>
					</Select>
				</FormControl>
			</div>
		</BasicDialog>
	);
}
