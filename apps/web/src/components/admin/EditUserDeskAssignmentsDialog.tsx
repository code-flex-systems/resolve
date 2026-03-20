'use client';

import { IconDeviceFloppy, IconTrash } from '@tabler/icons-react';
import Button from '@/components/ui/Button';
import Divider from '@/components/ui/Divider';
import BasicDialog from '../common/BasicDialog';
import { useState, useEffect } from 'react';
import { useDeskTrpc } from '@/hooks/trpc/useDeskTrpc';
import { useAlertStore } from '@/stores/useAlertStore';
import DeskLocationTypeSelect from '../common/DeskLocationTypeSelect';
import DeskLocationSelect from '../common/DeskLocationSelect';

interface EditUserDeskAssignmentsDialogProps {
	userId: string;
	onClose: () => void;
}

interface DeskAssignment {
	id: number | null; // null for new assignments
	deskLocationTypeId: number | null;
	deskLocationId: number | null;
	originalDeskLocationId: number | null; // Track the original location for change detection
	originalPriority: number | null; // Track the original priority for change detection
	priority: number;
}

export default function EditUserDeskAssignmentsDialog({ userId, onClose }: EditUserDeskAssignmentsDialogProps) {
	const [assignments, setAssignments] = useState<DeskAssignment[]>([
		{
			id: null,
			deskLocationTypeId: null,
			deskLocationId: null,
			originalDeskLocationId: null,
			originalPriority: null,
			priority: 1,
		},
		{
			id: null,
			deskLocationTypeId: null,
			deskLocationId: null,
			originalDeskLocationId: null,
			originalPriority: null,
			priority: 2,
		},
		{
			id: null,
			deskLocationTypeId: null,
			deskLocationId: null,
			originalDeskLocationId: null,
			originalPriority: null,
			priority: 3,
		},
		{
			id: null,
			deskLocationTypeId: null,
			deskLocationId: null,
			originalDeskLocationId: null,
			originalPriority: null,
			priority: 4,
		},
		{
			id: null,
			deskLocationTypeId: null,
			deskLocationId: null,
			originalDeskLocationId: null,
			originalPriority: null,
			priority: 5,
		},
	]);

	const showAlert = useAlertStore((state) => state.showAlert);
	const { data: existingAssignments, isLoading } = useDeskTrpc().getUserAssignments({ userId });
	const { mutateAsync: updateUsersDeskAssignments } = useDeskTrpc().updateUsersDeskAssignments;
	const [isSaving, setIsSaving] = useState(false);

	// Load existing assignments when data arrives
	useEffect(() => {
		if (existingAssignments) {
			const newAssignments = [1, 2, 3, 4, 5].map((priority) => {
				const existing = existingAssignments.find((a) => a.priority === priority);
				if (existing) {
					return {
						id: existing.id,
						deskLocationTypeId: existing.desk_location_type_id,
						deskLocationId: existing.desk_location_id,
						originalDeskLocationId: existing.desk_location_id,
						originalPriority: priority,
						priority,
					};
				}
				return {
					id: null,
					deskLocationTypeId: null,
					deskLocationId: null,
					originalDeskLocationId: null,
					originalPriority: null,
					priority,
				};
			});
			setAssignments(newAssignments);
		}
	}, [existingAssignments]);

	const updateAssignment = (priority: number, field: string, value: any) => {
		setAssignments((prev) =>
			prev.map((a) => {
				if (a.priority === priority) {
					// If changing type, reset location
					if (field === 'deskLocationTypeId') {
						return { ...a, deskLocationTypeId: value, deskLocationId: null };
					}
					return { ...a, [field]: value };
				}
				return a;
			})
		);
	};

	const removeAssignmentSlot = (priority: number) => {
		setAssignments((prev) => {
			// Get all assignments that still have locations (excluding the one being removed)
			const remainingAssignments = prev
				.filter((a) => a.priority !== priority && a.deskLocationId !== null)
				.sort((a, b) => a.priority - b.priority);

			// Renumber remaining assignments starting from priority 1
			const renumberedAssignments = remainingAssignments.map((a, index) => ({
				...a,
				priority: index + 1,
			}));

			// Fill in empty slots to maintain 5 total slots
			const totalSlots = 5;
			for (let i = renumberedAssignments.length; i < totalSlots; i++) {
				renumberedAssignments.push({
					id: null,
					deskLocationTypeId: null,
					deskLocationId: null,
					originalDeskLocationId: null,
					originalPriority: null,
					priority: i + 1,
				});
			}

			return renumberedAssignments;
		});
	};

	const handleSave = async () => {
		setIsSaving(true);
		try {
			// Collect all assignments that have a desk location selected
			const desiredAssignments = assignments
				.filter((a) => a.deskLocationId !== null)
				.map((a) => ({
					deskLocationId: a.deskLocationId!,
					priority: a.priority,
				}));

			// Send complete desired state to unified endpoint
			await updateUsersDeskAssignments({
				updates: [
					{
						userId,
						assignments: desiredAssignments,
					},
				],
			});

			showAlert('Desk assignments updated successfully', 'success');
			onClose();
		} catch (error: any) {
			const message = error?.message || 'Failed to update desk assignments';
			showAlert(message, 'error');
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<BasicDialog
			title="Edit Desk Assignments"
			primaryAction={{
				label: 'Save',
				onClick: handleSave,
				icon: <IconDeviceFloppy size={20} />,
				disabled: isSaving || isLoading,
			}}
			secondaryActions={[
				{
					label: 'Cancel',
					onClick: onClose,
				},
			]}
			onClose={onClose}
			width={600}
		>
			<div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
				<span style={{ color: 'var(--text-secondary)' }}>
					Assign up to 5 desk locations with priority ordering (1 = highest priority)
				</span>

				{assignments.map((assignment, index) => {
					// Get list of desk locations already selected at other priorities
					const excludedLocationIds = assignments
						.filter((a) => a.priority !== assignment.priority && a.deskLocationId !== null)
						.map((a) => a.deskLocationId!);

					return (
						<div key={assignment.priority}>
							<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
								<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
									<span style={{ color: 'var(--text-accent)' }}>
										Priority {assignment.priority}
									</span>
									{assignment.deskLocationId && (
										<Button variant="icon" size="sm"
											onClick={() => removeAssignmentSlot(assignment.priority)}
											disabled={isSaving}
										>
											<IconTrash size={18} />
										</Button>
									)}
								</div>

								<DeskLocationTypeSelect
									value={assignment.deskLocationTypeId}
									onChange={(value) =>
										updateAssignment(assignment.priority, 'deskLocationTypeId', value)
									}
									disabled={isSaving}
								/>

								<DeskLocationSelect
									value={assignment.deskLocationId}
									onChange={(value) => updateAssignment(assignment.priority, 'deskLocationId', value)}
									deskLocationTypeId={assignment.deskLocationTypeId}
									disabled={!assignment.deskLocationTypeId || isSaving}
									excludedLocationIds={excludedLocationIds}
								/>
							</div>
							{index < assignments.length - 1 && <Divider />}
						</div>
					);
				})}
			</div>
		</BasicDialog>
	);
}
