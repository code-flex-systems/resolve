'use client';

import { IconArchive, IconChevronDown, IconChevronUp, IconEdit, IconMapPin, IconPlus, IconWorld } from '@tabler/icons-react';
import Dropdown from '@/components/ui/Dropdown';
import Input, { Textarea } from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Collapse from '@/components/ui/Collapse';
import Skeleton from '@/components/ui/Skeleton';
import Chip from '@/components/ui/Chip';
import { useState, useEffect, useMemo } from 'react';
import BasicButtonStyled from '@/components/common/BasicButtonStyled';
import BasicDialog from '@/components/common/BasicDialog';
import DeskLocationTypeSelect from '@/components/common/DeskLocationTypeSelect';
import DeskLocationSelect from '@/components/common/DeskLocationSelect';
import ExecutionHistoryTable from '@/components/admin/ExecutionHistoryTable';
import RuleCard from '@/components/admin/RuleCard';
import WorkflowThresholdDialog from '@/components/admin/WorkflowThresholdDialog';
import WorkflowRuleDialog from '@/components/admin/WorkflowRuleDialog';
import RuleExecutionSummaryDialog from '@/components/admin/RuleExecutionSummaryDialog';
import { useWorkflowTrpc } from '@/hooks/trpc/useWorkflowTrpc';
import { useAlertStore } from '@/stores/useAlertStore';
import { useDeskTrpc } from '@/hooks/trpc/useDeskTrpc';
import { formatThresholdType, getThresholdUnit } from '@/lib/utils/workflowUtils';
import { formatMDY } from '@/lib/utils/utils';
import type { WorkflowThreshold, WorkflowRule, RuleExecutionSummary } from '@/hooks/trpc/useWorkflowTrpc';

interface WorkflowDetailPanelProps {
	workflowId: number;
}

export default function WorkflowDetailPanel({ workflowId }: WorkflowDetailPanelProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [showThresholdDialog, setShowThresholdDialog] = useState(false);
	const [showRuleDialog, setShowRuleDialog] = useState(false);
	const [editingThreshold, setEditingThreshold] = useState<WorkflowThreshold | null>(null);
	const [editingRule, setEditingRule] = useState<WorkflowRule | null>(null);
	const [archivingThreshold, setArchivingThreshold] = useState<WorkflowThreshold | null>(null);
	const [archivingRule, setArchivingRule] = useState<WorkflowRule | null>(null);
	const [runningRuleId, setRunningRuleId] = useState<number | null>(null);
	const [executionSummary, setExecutionSummary] = useState<RuleExecutionSummary | null>(null);
	const [summaryRuleName, setSummaryRuleName] = useState('');
	const [historyExpanded, setHistoryExpanded] = useState(false);
	const [historyRuleFilter, setHistoryRuleFilter] = useState<number | undefined>(undefined);

	const [formData, setFormData] = useState({
		name: '',
		description: '',
		deskLocationTypeId: null as number | null,
		deskLocationId: null as number | null,
		isActive: true,
	});

	const { getDefinition, updateDefinition, archiveThreshold, archiveRule, executeRule } = useWorkflowTrpc();
	const { listLocations } = useDeskTrpc();
	const showAlert = useAlertStore((state) => state.showAlert);

	const { data: workflow, isLoading } = getDefinition({ id: workflowId });
	const { data: locationsData } = listLocations({});
	const locations = locationsData?.rows || [];

	// Update form data when workflow loads or changes
	useEffect(() => {
		if (workflow && !isEditing) {
			const loc = locations.find((l) => l.id === workflow.desk_location_id);
			setFormData({
				name: workflow.name,
				description: workflow.description || '',
				deskLocationTypeId: loc?.desk_location_type_id || null,
				deskLocationId: workflow.desk_location_id,
				isActive: workflow.is_active,
			});
		}
	}, [workflow, isEditing, locations]);

	const handleSave = async () => {
		try {
			await updateDefinition.mutateAsync({
				id: workflowId,
				params: {
					name: formData.name,
					description: formData.description || undefined,
					deskLocationId: formData.deskLocationId || undefined,
					isActive: formData.isActive,
				},
			});
			setIsEditing(false);
		} catch (error) {
			console.error('Failed to update workflow:', error);
		}
	};

	const handleEditThreshold = (threshold: WorkflowThreshold) => {
		setEditingThreshold(threshold);
		setShowThresholdDialog(true);
	};

	const handleArchiveThreshold = (threshold: WorkflowThreshold) => {
		setArchivingThreshold(threshold);
	};

	const confirmArchiveThreshold = async () => {
		if (!archivingThreshold) return;
		try {
			await archiveThreshold.mutateAsync({ id: archivingThreshold.id });
			setArchivingThreshold(null);
		} catch (error) {
			console.error('Failed to archive threshold:', error);
		}
	};

	const handleEditRule = (rule: WorkflowRule) => {
		setEditingRule(rule);
		setShowRuleDialog(true);
	};

	const handleArchiveRule = (rule: WorkflowRule) => {
		setArchivingRule(rule);
	};

	const confirmArchiveRule = async () => {
		if (!archivingRule) return;
		try {
			await archiveRule.mutateAsync({ id: archivingRule.id });
			setArchivingRule(null);
		} catch (error) {
			console.error('Failed to archive rule:', error);
		}
	};

	const handleCloseThresholdDialog = () => {
		setShowThresholdDialog(false);
		setEditingThreshold(null);
	};

	const handleCloseRuleDialog = () => {
		setShowRuleDialog(false);
		setEditingRule(null);
	};

	const handleRunRule = (rule: WorkflowRule) => {
		setRunningRuleId(rule.id);
		setSummaryRuleName(rule.name);
		executeRule.mutate(
			{ ruleId: rule.id },
			{
				onSuccess: (summary) => {
					setExecutionSummary(summary);
					setRunningRuleId(null);
				},
				onError: (err) => {
					showAlert(err.message || 'Failed to execute rule', 'error');
					setRunningRuleId(null);
				},
			}
		);
	};

	// Memoize derived values to prevent unnecessary rerenders
	const thresholds = useMemo(() => workflow?.thresholds || [], [workflow?.thresholds]);
	const rules = useMemo(() => workflow?.rules || [], [workflow?.rules]);
	const location = useMemo(
		() => locations.find((loc) => loc.id === workflow?.desk_location_id),
		[locations, workflow?.desk_location_id]
	);

	if (isLoading) {
		return (
			<div style={{ maxWidth: 1000, marginInline: 'auto' }}>
				<div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
					<Skeleton variant="rect" height={200} />
					<Skeleton variant="rect" height={150} />
					<Skeleton variant="rect" height={300} />
				</div>
			</div>
		);
	}

	if (!workflow) {
		return (
			<div style={{ maxWidth: 1000, marginInline: 'auto' }}>
				<span style={{ color: 'var(--text-secondary)' }}>Workflow not found</span>
			</div>
		);
	}

	return (
		<div style={{ maxWidth: 1000, marginInline: 'auto' }}>
			<div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
				{/* Section 1: Workflow Definition (Gradient Container) */}
				<Card variant="float" padding="md">
					<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
						<span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
							WORKFLOW DEFINITION
						</span>
						{!isEditing && (
							<BasicButtonStyled
								icon={<IconEdit size={20} />}
								tooltipProps={{ title: 'Edit Workflow' }}
								compact
								buttonProps={{ onClick: () => setIsEditing(true) }}
							/>
						)}
					</div>

					{isEditing ? (
						<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
							<Input
								label="Workflow Name"
								value={formData.name}
								onChange={(e) => setFormData({ ...formData, name: e.target.value })}
								fullWidth
								required
								placeholder="e.g., Standard Subrogation Workflow"
							/>

							<Textarea
								label="Description"
								value={formData.description}
								onChange={(e) => setFormData({ ...formData, description: e.target.value })}
								fullWidth
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

							<div style={{ display: 'flex', gap: 8 }}>
								<BasicButtonStyled
									buttonProps={{
										variant: 'contained',
										size: 'small',
										onClick: handleSave,
										disabled: !formData.name.trim() || updateDefinition.isPending,
									}}
								>
									Save
								</BasicButtonStyled>
								<BasicButtonStyled
									buttonProps={{
										variant: 'outlined',
										size: 'small',
										onClick: () => {
											setIsEditing(false);
											const loc = locations.find((l) => l.id === workflow.desk_location_id);
											setFormData({
												name: workflow.name,
												description: workflow.description || '',
												deskLocationTypeId: loc?.desk_location_type_id || null,
												deskLocationId: workflow.desk_location_id,
												isActive: workflow.is_active,
											});
										},
									}}
								>
									Cancel
								</BasicButtonStyled>
							</div>
						</div>
					) : (
						<div>
							<span style={{ fontSize: 18, fontWeight: 600 }}>
								{workflow.name}
							</span>

							{workflow.description && (
								<span style={{ fontSize: 14,  color: 'var(--text-secondary)'  }}>
									{workflow.description}
								</span>
							)}

							<div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
								<Chip
									size="sm"
									color={location ? 'info' : 'neutral'}
									variant="outlined"
								>{location ? `Desk Location: ${location.name}` : 'Global'}</Chip>
								<Chip
									size="sm"
									color={workflow.is_active ? 'success' : 'neutral'}>{workflow.is_active ? 'Active' : 'Inactive'}</Chip>
							</div>

							<div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
								{(workflow as any).creator_first_name && (
									<span style={{ fontSize: 12,  color: 'var(--text-secondary)'  }}>
										{(workflow as any).creator_first_name} {(workflow as any).creator_last_name}
									</span>
								)}
								<span style={{ fontSize: 12,  color: 'var(--text-secondary)'  }}>
									Created:{' '}
									{workflow.created_at
										? formatMDY(new Date(workflow.created_at).toISOString())
										: 'N/A'}
								</span>
								<span style={{ fontSize: 12,  color: 'var(--text-secondary)'  }}>
									Updated:{' '}
									{workflow.updated_at
										? formatMDY(new Date(workflow.updated_at).toISOString())
										: 'N/A'}
								</span>
							</div>
						</div>
					)}
				</Card>

				{/* Section 2: Thresholds (Beveled Container with Table) */}
				<Card variant="beveled" padding="none">
					<div style={{ padding: 16 }}>
						<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
							<span style={{ fontSize: 13, fontWeight: 600 }}>
								SLA & Capacity Thresholds ({thresholds.length})
							</span>
							<BasicButtonStyled
								buttonProps={{
									variant: 'outlined',
									size: 'small',
									onClick: () => setShowThresholdDialog(true),
									startIcon: <IconPlus size={20} />,
									color: 'inherit',
								}}
							>
								Threshold
							</BasicButtonStyled>
						</div>

						{thresholds.length === 0 ? (
							<span style={{ fontSize: 14,  color: 'var(--text-secondary)'  }}>
								No thresholds configured
							</span>
						) : (
							<div style={{ overflowX: 'auto' }}>
								<table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
									<thead>
										<tr>
											<th style={{ textAlign: 'left', fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>Type</th>
											<th style={{ textAlign: 'left', fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>Value</th>
											<th style={{ textAlign: 'left', fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>Status</th>
											<th style={{ textAlign: 'left', fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', padding: '8px 12px', borderBottom: '1px solid var(--border)', width: 100 }}>Actions</th>
										</tr>
									</thead>
									<tbody>
										{thresholds.map((threshold) => (
											<tr key={threshold.id}>
												<td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
													{formatThresholdType(threshold.threshold_type as any)}
												</td>
												<td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
													{threshold.threshold_value}{' '}
													{getThresholdUnit(threshold.threshold_type as any)}
												</td>
												<td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
													<Chip
														size="sm"
														color={threshold.is_active ? 'success' : 'neutral'}>{threshold.is_active ? 'Active' : 'Inactive'}</Chip>
												</td>
												<td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
													<div style={{ display: 'flex', gap: 4 }}>
														<BasicButtonStyled
															icon={<IconEdit size={20} />}
															compact
															buttonProps={{ onClick: () => handleEditThreshold(threshold) }}
															tooltipProps={{ title: 'Edit Threshold' }}
														/>
														<BasicButtonStyled
															icon={<IconArchive size={20} />}
															compact
															buttonProps={{
																onClick: () => handleArchiveThreshold(threshold),
															}}
															tooltipProps={{ title: 'Archive Threshold' }}
														/>
													</div>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</div>
				</Card>

				{/* Section 3: Rules (Beveled Container with Containerized Items) */}
				<Card variant="beveled" padding="none">
					<div style={{ padding: 16 }}>
						<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
							<span style={{ fontSize: 13, fontWeight: 600 }}>
								Automation Rules ({rules.length})
							</span>
							<BasicButtonStyled
								buttonProps={{
									variant: 'outlined',
									size: 'small',
									onClick: () => setShowRuleDialog(true),
									startIcon: <IconPlus size={20} />,
									color: 'inherit',
								}}
							>
								Rule
							</BasicButtonStyled>
						</div>

						{rules.length === 0 ? (
							<span style={{ fontSize: 14,  color: 'var(--text-secondary)'  }}>
								No rules configured
							</span>
						) : (
							<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
								{rules.map((rule) => (
									<RuleCard
										key={rule.id}
										rule={rule}
										onEdit={handleEditRule}
										onArchive={handleArchiveRule}
										onRun={handleRunRule}
										isRunning={runningRuleId === rule.id}
									/>
								))}
							</div>
						)}
					</div>
				</Card>

				{/* Section 4: Execution History (Collapsible) */}
				<Card variant="beveled" padding="none">
					<div style={{ padding: 16 }}>
						<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
							<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
								<span style={{ fontSize: 13, fontWeight: 600 }}>
									Execution History
								</span>
								<Button variant="icon" size="sm"
									onClick={() => setHistoryExpanded((prev) => !prev)}
								>
									{historyExpanded ? <IconChevronUp size={20} /> : <IconChevronDown size={20} />}
								</Button>
							</div>
							{historyExpanded && (
								<div style={{ minWidth: 160 }}>
									<Dropdown
										options={[
											{ value: '', label: 'All Rules' },
											...rules.map((rule) => ({
												value: rule.id,
												label: rule.name,
											})),
										]}
										value={historyRuleFilter ?? ''}
										onChange={(v) => {
											setHistoryRuleFilter(v === '' ? undefined : (v as number));
										}}
										size="sm"
									/>
								</div>
							)}
						</div>
						<Collapse open={historyExpanded}>
							<div style={{ marginTop: 16 }}>
								{historyExpanded && (
									<ExecutionHistoryTable ruleId={historyRuleFilter} compact />
								)}
							</div>
						</Collapse>
					</div>
				</Card>
			</div>

			{/* Dialogs */}
			{showThresholdDialog && (
				<WorkflowThresholdDialog
					onClose={handleCloseThresholdDialog}
					workflowId={workflowId}
					editingThreshold={editingThreshold}
				/>
			)}

			{showRuleDialog && (
				<WorkflowRuleDialog onClose={handleCloseRuleDialog} workflowId={workflowId} editingRule={editingRule} />
			)}

			{/* Archive Confirmation Dialogs */}
			{archivingThreshold && (
				<BasicDialog
					onClose={() => setArchivingThreshold(null)}
					title="Archive Threshold"
					primaryAction={{
						label: 'Archive',
						onClick: confirmArchiveThreshold,
						disabled: archiveThreshold.isPending,
						color: 'error',
					}}
					secondaryActions={[{ label: 'Cancel', onClick: () => setArchivingThreshold(null) }]}
					width={500}
				>
					<span>
						Are you sure you want to archive the threshold "
						{formatThresholdType(archivingThreshold.threshold_type as any)}"? This action cannot be undone.
					</span>
				</BasicDialog>
			)}

			{archivingRule && (
				<BasicDialog
					onClose={() => setArchivingRule(null)}
					title="Archive Rule"
					primaryAction={{
						label: 'Archive',
						onClick: confirmArchiveRule,
						disabled: archiveRule.isPending,
						color: 'error',
					}}
					secondaryActions={[{ label: 'Cancel', onClick: () => setArchivingRule(null) }]}
					width={500}
				>
					<span>
						Are you sure you want to archive the rule "{archivingRule.name}"? This action cannot be undone.
					</span>
				</BasicDialog>
			)}

			<RuleExecutionSummaryDialog
				open={!!executionSummary}
				onClose={() => setExecutionSummary(null)}
				summary={executionSummary}
				ruleName={summaryRuleName}
			/>
		</div>
	);
}
