'use client';
import Dropdown from '@/components/ui/Dropdown';
import Input from '@/components/ui/Input';
import Switch from '@/components/ui/Switch';
import { useState, useEffect } from 'react';
import BasicDialog from '@/components/common/BasicDialog';
import { useWorkflowTrpc } from '@/hooks/trpc/useWorkflowTrpc';
import { WorkflowThresholdType } from '@/config/enums';
import { getThresholdUnit } from '@/lib/utils/workflowUtils';
import type { WorkflowThreshold } from '@/hooks/trpc/useWorkflowTrpc';

interface WorkflowThresholdDialogProps {
	onClose: () => void;
	workflowId: string;
	editingThreshold?: WorkflowThreshold | null;
}

export default function WorkflowThresholdDialog({
	onClose,
	workflowId,
	editingThreshold,
}: WorkflowThresholdDialogProps) {
	const [formData, setFormData] = useState({
		thresholdType: '' as WorkflowThresholdType | '',
		thresholdValue: '',
		isActive: true,
	});

	const { createThreshold, updateThreshold } = useWorkflowTrpc();

	// Initialize form when editing or when dialog opens
	useEffect(() => {
		if (editingThreshold) {
			setFormData({
				thresholdType: editingThreshold.threshold_type as any,
				thresholdValue: String(editingThreshold.threshold_value),
				isActive: editingThreshold.is_active,
			});
		} else {
			setFormData({
				thresholdType: '',
				thresholdValue: '',
				isActive: true,
			});
		}
	}, [editingThreshold]);

	const handleSubmit = async () => {
		try {
			const value = parseInt(formData.thresholdValue, 10);

			if (editingThreshold) {
				await updateThreshold.mutateAsync({
					id: editingThreshold.id,
					params: {
						thresholdValue: value,
						isActive: formData.isActive,
					},
				});
			} else {
				await createThreshold.mutateAsync({
					workflowDefinitionId: workflowId,
					thresholdType: formData.thresholdType as WorkflowThresholdType,
					thresholdValue: value,
				});
			}
			onClose();
		} catch (error) {
			console.error('Failed to save threshold:', error);
		}
	};

	const isFormValid = formData.thresholdType && formData.thresholdValue && parseInt(formData.thresholdValue, 10) > 0;

	return (
		<BasicDialog
			onClose={onClose}
			title={editingThreshold ? 'Edit Threshold' : 'Add Threshold'}
			primaryAction={{
				label: editingThreshold ? 'Update' : 'Create',
				onClick: handleSubmit,
				disabled: !isFormValid || createThreshold.isPending || updateThreshold.isPending,
			}}
			secondaryActions={[{ label: 'Cancel', onClick: onClose }]}
			width={500}
		>
			<div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
				<Dropdown
					label="Threshold Type"
					options={[
						{ value: WorkflowThresholdType.USER_CAPACITY, label: 'User Capacity' },
						{ value: WorkflowThresholdType.LOCATION_AGE, label: 'Location Age (Hours)' },
						{ value: WorkflowThresholdType.TASK_DUE, label: 'Task Due Warning (Days)' },
					]}
					value={formData.thresholdType}
					onChange={(v) => setFormData({ ...formData, thresholdType: v as WorkflowThresholdType })}
					required
					disabled={!!editingThreshold}
					fullWidth
				/>

				<Input
					label="Threshold Value"
					type="number"
					value={formData.thresholdValue}
					onChange={(e) => setFormData({ ...formData, thresholdValue: e.target.value })}
					fullWidth
					required
					placeholder="Enter threshold value"
					min={1}
					endAdornment={
						formData.thresholdType ? (
							<span>{getThresholdUnit(formData.thresholdType as WorkflowThresholdType)}</span>
						) : undefined
					}
				/>

				{editingThreshold && (
					<Switch
						checked={formData.isActive}
						onChange={(checked) => setFormData({ ...formData, isActive: checked })}
						label="Active"
					/>
				)}
			</div>
		</BasicDialog>
	);
}
