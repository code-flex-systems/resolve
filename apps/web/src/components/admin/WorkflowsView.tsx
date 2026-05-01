'use client';

import { IconInfoCircle, IconPlus, IconRoute2, IconSearch } from '@tabler/icons-react';
import Dropdown from '@/components/ui/Dropdown';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';
import { useState, useMemo } from 'react';
import WorkflowDetailPanel from '@/components/admin/WorkflowDetailPanel';
import WorkflowDefinitionFormDialog from '@/components/admin/WorkflowDefinitionFormDialog';
import { useWorkflowTrpc } from '@/hooks/trpc/useWorkflowTrpc';
import Button from '@/components/ui/Button';
import styles from './WorkflowsView.module.css';

export default function WorkflowsView() {
	const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
	const [showCreateDialog, setShowCreateDialog] = useState(false);
	const [searchTerm, setSearchTerm] = useState('');
	const [isActive, setIsActive] = useState(true);

	const { listDefinitions } = useWorkflowTrpc();

	const { data: definitionsData, isLoading } = listDefinitions({ isActive });
	const allDefinitions = definitionsData?.rows || [];

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
				style={{ width: 320, marginRight: 16, display: 'flex', flexDirection: 'column' }}
			>
				<div style={{ padding: 16, paddingBottom: 8 }}>
					<span style={{ fontSize: 14, fontWeight: 600 }}>
						Workflows ({definitions.length.toLocaleString()})
					</span>
				</div>

				<div style={{ paddingInline: 16, paddingBottom: 8 }}>
					<Input
						fullWidth
						placeholder="Search workflows..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						startAdornment={<IconSearch size={20} />}
					/>
				</div>

				<div
					style={{
						paddingInline: 16,
						paddingBottom: 12,
						display: 'flex',
						justifyContent: 'space-between',
						gap: 8,
					}}
				>
					<div style={{ minWidth: 100 }}>
						<Dropdown
							inlineLabel
							options={[
								{ value: 'active', label: 'Active' },
								{ value: 'inactive', label: 'Inactive' },
							]}
							value={isActive ? 'active' : 'inactive'}
							onChange={(v) => setIsActive(v === 'active')}
							size="sm"
						/>
					</div>
					<Button
						variant="contained"
						onClick={() => setShowCreateDialog(true)}
						startIcon={<IconPlus size={16} />}
						size="sm"
					>
						New
					</Button>
				</div>

				{/* Workflow List */}
				<div style={{ flex: 1, overflowY: 'auto', paddingInline: 16, paddingBottom: 16 }}>
					{isLoading ? (
						<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
							<Skeleton variant="rect" height={64} />
							<Skeleton variant="rect" height={64} />
							<Skeleton variant="rect" height={64} />
						</div>
					) : definitions.length === 0 ? (
						<span
							style={{
								fontSize: 13,
								color: 'var(--text-secondary)',
								textAlign: 'center',
								marginTop: 16,
								display: 'block',
							}}
						>
							{searchTerm ? 'No workflows found' : 'No workflows yet'}
						</span>
					) : (
						<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
							{definitions.map((definition) => {
								const isSelected = selectedWorkflowId === definition.id;
								return (
									<div
										key={definition.id}
										className={`${styles.navItem} ${isSelected ? styles.navItemSelected : ''}`}
										onClick={() => setSelectedWorkflowId(definition.id)}
									>
										<span className={styles.navItemTitle}>{definition.name}</span>
										{definition.description && (
											<span className={styles.navItemDescription}>{definition.description}</span>
										)}
									</div>
								);
							})}
						</div>
					)}
				</div>
			</Card>

			{/* Right Panel - Workflow Detail */}
			<div style={{ flex: 1, overflowY: 'auto', backgroundColor: 'var(--bg-primary)' }}>
				{selectedWorkflowId ? (
					<WorkflowDetailPanel workflowId={selectedWorkflowId} />
				) : (
					<div className={styles.emptyState}>
						<IconRoute2 size={48} style={{ color: 'var(--text-muted)' }} />
						<span className={styles.emptyTitle}>Select a workflow to view details</span>
						<div className={styles.emptyDescription}>
							<IconInfoCircle
								size={16}
								style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: 2 }}
							/>
							<span>
								Workflows define the stages claims move through. Each workflow can have thresholds
								for SLA monitoring and rules for automated routing.
							</span>
						</div>
					</div>
				)}
			</div>

			{showCreateDialog && (
				<WorkflowDefinitionFormDialog
					onClose={() => setShowCreateDialog(false)}
					onSuccess={handleCreateSuccess}
				/>
			)}
		</div>
	);
}
