'use client';

import { IconMapPin, IconPlus, IconSearch, IconWorld } from '@tabler/icons-react';
import Dropdown from '@/components/ui/Dropdown';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';
import Divider from '@/components/ui/Divider';
import Chip from '@/components/ui/Chip';
import { useState, useMemo } from 'react';
import WorkflowDetailPanel from '@/components/admin/WorkflowDetailPanel';
import WorkflowDefinitionFormDialog from '@/components/admin/WorkflowDefinitionFormDialog';
import { useWorkflowTrpc } from '@/hooks/trpc/useWorkflowTrpc';
import { useDeskLocationStore } from '@/stores/useDeskLocationStore';
import Button from '@/components/ui/Button';

export default function WorkflowsView() {
	const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
	const [showCreateDialog, setShowCreateDialog] = useState(false);
	const [searchTerm, setSearchTerm] = useState('');
	const [isActive, setIsActive] = useState(true);

	const { listDefinitions } = useWorkflowTrpc();
	const deskStore = useDeskLocationStore();

	const { data: definitionsData, isLoading } = listDefinitions({ isActive });
	const allDefinitions = definitionsData?.rows || [];

	// Client-side search filter
	const definitions = useMemo(() => {
		if (!searchTerm) return allDefinitions;
		const term = searchTerm.toLowerCase();
		return allDefinitions.filter((def) => def.name.toLowerCase().includes(term));
	}, [allDefinitions, searchTerm]);

	const handleCreateSuccess = (workflowId: string) => {
		setSelectedWorkflowId(workflowId);
	};

	return (
		<div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
			{/* Left Panel - Workflow List */}
			<Card
				variant="beveled"
				padding="none"
				style={{
					width: 320,
					marginRight: 16,
				}}
			>
				{/* Title */}
				<div style={{ padding: 16, paddingBottom: 8 }}>
					<span>
						Workflows ({definitions.length.toLocaleString()})
					</span>
					<p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '8px 0 0', lineHeight: 1.5 }}>
						Workflows define the stages claims move through. Each workflow can have thresholds for SLA monitoring and rules for automated routing.
					</p>
				</div>

				{/* Search */}
				<div style={{ paddingInline: 16, paddingBottom: 8 }}>
					<Input
						fullWidth
						placeholder="Search workflows..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						startAdornment={<IconSearch size={20} />}
					/>
				</div>

				{/* Active/Inactive Filter and Add New Button */}
				<div style={{ paddingInline: 16, paddingBottom: 8, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
					<div style={{ minWidth: 100 }}>
						<Dropdown
							options={[
								{ value: 'active', label: 'Active' },
								{ value: 'inactive', label: 'Inactive' },
							]}
							value={isActive ? 'active' : 'inactive'}
							onChange={(v) => setIsActive(v === 'active')}
							size="sm"
						/>
					</div>

					<Button variant="contained" onClick={() => setShowCreateDialog(true)} startIcon={<IconPlus size={16} />} size="sm">
						Workflow
					</Button>
				</div>

				<div style={{ padding: '0px 10px 10px' }}>
					<Divider />
				</div>

				{/* Workflow List */}
				<div style={{ height: 'calc(100% - 180px)', overflowY: 'auto', paddingInline: 16, paddingBottom: 16 }}>
					{isLoading ? (
						<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
							<Skeleton variant="rect" height={80} />
							<Skeleton variant="rect" height={80} />
							<Skeleton variant="rect" height={80} />
						</div>
					) : definitions.length === 0 ? (
						<span style={{ fontSize: 13,  color: 'var(--text-secondary)', textAlign: 'center', marginTop: 16  }}>
							{searchTerm ? 'No workflows found' : 'No workflows yet'}
						</span>
					) : (
						<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
							{definitions.map((definition) => {
								const isSelected = selectedWorkflowId === definition.id;
								const location = definition.desk_location_id
									? deskStore.locationsById.get(definition.desk_location_id)
									: null;

								return (
									<div
										key={definition.id}
										style={{
											padding: 12,
											border: isSelected ? '2px solid' : '1px solid',
											borderColor: isSelected ? 'primary.main' : 'var(--border)',
											backgroundColor: isSelected ? 'rgba(33, 181, 255, 0.04)' : 'background.paper',
											cursor: 'pointer',
											transition: 'all 0.2s',
											}}
										onClick={() => setSelectedWorkflowId(definition.id)}
									>
										<span style={{ fontSize: 14, fontWeight: isSelected ? 600 : 500 }}>
											{definition.name}
										</span>

										{definition.description && (
											<span style={{  fontSize: 12,  color: 'var(--text-secondary)'  , 
													overflow: 'hidden',
													textOverflow: 'ellipsis',
													display: '-webkit-box',
													WebkitLineClamp: 2,
													WebkitBoxOrient: 'vertical',
												 }}
											>
												{definition.description}
											</span>
										)}

										<div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
											<Chip
												size="sm"
												color={location ? 'info' : 'neutral'}
												variant="outlined"
											>{location ? `Desk Location: ${location.name}` : 'Global'}</Chip>
											{!definition.is_active && (
												<Chip 
													size="sm"
													color="neutral"
													style={{ fontSize: 11, height: 20 }}>Inactive</Chip>
											)}
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>
			</Card>

			{/* Right Panel - Workflow Detail */}
			<div style={{ flex: 1, overflowY: 'auto',
					backgroundColor: 'var(--bg-primary)', }}>
				{selectedWorkflowId ? (
					<WorkflowDetailPanel workflowId={selectedWorkflowId} />
				) : (
					<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 24 }}>
						<span style={{ fontSize: 14,  color: 'var(--text-secondary)'  }}>
							Select a workflow to view details
						</span>
					</div>
				)}
			</div>

			{/* Create Dialog */}
			{showCreateDialog && (
				<WorkflowDefinitionFormDialog
					onClose={() => setShowCreateDialog(false)}
					onSuccess={handleCreateSuccess}
				/>
			)}
		</div>
	);
}
