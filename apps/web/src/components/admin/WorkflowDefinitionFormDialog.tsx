'use client';

import { useState, useEffect } from 'react';
import { Box, TextField } from '@mui/material';
import BasicDialog from '@/components/common/BasicDialog';
import DeskLocationTypeSelect from '@/components/common/DeskLocationTypeSelect';
import DeskLocationSelect from '@/components/common/DeskLocationSelect';
import { useWorkflowTrpc } from '@/hooks/trpc/useWorkflowTrpc';

interface WorkflowDefinitionFormDialogProps {
	onClose: () => void;
	onSuccess: (workflowId: number) => void;
}

export default function WorkflowDefinitionFormDialog({
	onClose,
	onSuccess,
}: WorkflowDefinitionFormDialogProps) {
	const [formData, setFormData] = useState({
		name: '',
		description: '',
		deskLocationTypeId: null as number | null,
		deskLocationId: null as number | null,
	});

	const { createDefinition } = useWorkflowTrpc();

	// Reset form when dialog closes
	useEffect(() => {
		return () => {
			setFormData({
				name: '',
				description: '',
				deskLocationTypeId: null,
				deskLocationId: null,
			});
		};
	}, []);

	const handleSubmit = async () => {
		try {
			const result = await createDefinition.mutateAsync({
				name: formData.name,
				description: formData.description || undefined,
				deskLocationId: formData.deskLocationId || undefined,
			});
			onSuccess(result.id);
			onClose();
		} catch (error) {
			console.error('Failed to create workflow:', error);
		}
	};

	const isFormValid = formData.name.trim().length > 0;

	return (
		<BasicDialog
			onClose={onClose}
			title="Create Workflow Definition"
			primaryAction={{
				label: 'Create',
				onClick: handleSubmit,
				disabled: !isFormValid || createDefinition.isPending,
			}}
			secondaryActions={[{ label: 'Cancel', onClick: onClose }]}
			width={600}
		>
			<Box display="flex" flexDirection="column" gap={2} pt={1}>
				<TextField
					label="Workflow Name"
					value={formData.name}
					onChange={(e) => setFormData({ ...formData, name: e.target.value })}
					fullWidth
					required
					placeholder="e.g., Standard Subrogation Workflow"
					autoFocus
				/>

				<TextField
					label="Description"
					value={formData.description}
					onChange={(e) => setFormData({ ...formData, description: e.target.value })}
					fullWidth
					multiline
					rows={3}
					placeholder="Optional description of this workflow..."
				/>

				<DeskLocationTypeSelect
					value={formData.deskLocationTypeId}
					onChange={(id) =>
						setFormData({ ...formData, deskLocationTypeId: id, deskLocationId: null })
					}
					placeholder="Select desk location type first..."
					fullWidth
				/>

				<DeskLocationSelect
					value={formData.deskLocationId}
					onChange={(id) => setFormData({ ...formData, deskLocationId: id })}
					deskLocationTypeId={formData.deskLocationTypeId}
					label="Desk Location"
					fullWidth
				/>
			</Box>
		</BasicDialog>
	);
}
