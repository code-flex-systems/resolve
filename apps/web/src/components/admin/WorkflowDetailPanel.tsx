'use client';

import { useState, useEffect, useMemo } from 'react';
import {
	Box,
	Collapse,
	FormControl,
	IconButton,
	MenuItem,
	Select,
	Stack,
	Paper,
	Typography,
	TextField,
	Table,
	TableHead,
	TableBody,
	TableRow,
	TableCell,
	Chip,
	Skeleton,
} from '@mui/material';
import Edit from '@mui/icons-material/Edit';
import Add from '@mui/icons-material/Add';
import Archive from '@mui/icons-material/Archive';
import Public from '@mui/icons-material/Public';
import LocationOn from '@mui/icons-material/LocationOn';
import KeyboardArrowDown from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUp from '@mui/icons-material/KeyboardArrowUp';
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
import { BASE_COLOR_LIGHT, containerStyles } from '@/styles/theme';
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
			<Box maxWidth={1000} mx="auto">
				<Stack spacing={3}>
					<Skeleton variant="rectangular" height={200} />
					<Skeleton variant="rectangular" height={150} />
					<Skeleton variant="rectangular" height={300} />
				</Stack>
			</Box>
		);
	}

	if (!workflow) {
		return (
			<Box maxWidth={1000} mx="auto">
				<Typography color="text.secondary">Workflow not found</Typography>
			</Box>
		);
	}

	return (
		<Box maxWidth={1000} mx="auto">
			<Stack spacing={3}>
				{/* Section 1: Workflow Definition (Gradient Container) */}
				<Paper elevation={0} sx={containerStyles.gradientCard}>
					<Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
						<Typography fontSize={13} color={BASE_COLOR_LIGHT}>
							WORKFLOW DEFINITION
						</Typography>
						{!isEditing && (
							<BasicButtonStyled
								icon={<Edit />}
								tooltipProps={{ title: 'Edit Workflow' }}
								compact
								buttonProps={{ onClick: () => setIsEditing(true) }}
							/>
						)}
					</Box>

					{isEditing ? (
						<Stack spacing={2}>
							<TextField
								label="Workflow Name"
								value={formData.name}
								onChange={(e) => setFormData({ ...formData, name: e.target.value })}
								fullWidth
								required
								placeholder="e.g., Standard Subrogation Workflow"
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

							<Box display="flex" gap={1}>
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
							</Box>
						</Stack>
					) : (
						<Box>
							<Typography fontSize={18} fontWeight={600} mb={1}>
								{workflow.name}
							</Typography>

							{workflow.description && (
								<Typography fontSize={14} color="text.secondary" mb={2}>
									{workflow.description}
								</Typography>
							)}

							<Box display="flex" gap={1} mb={1.5} flexWrap="wrap">
								<Chip
									icon={location ? <LocationOn /> : <Public />}
									label={location ? `Desk Location: ${location.name}` : 'Global'}
									size="small"
									color={location ? 'primary' : 'default'}
									variant="outlined"
									sx={{ '& .MuiChip-icon': { color: location ? 'primary.main' : undefined } }}
								/>
								<Chip
									label={workflow.is_active ? 'Active' : 'Inactive'}
									size="small"
									color={workflow.is_active ? 'success' : 'default'}
								/>
							</Box>

							<Box display="flex" gap={2} mt={2}>
								{(workflow as any).creator_first_name && (
									<Typography fontSize={12} color="text.secondary">
										{(workflow as any).creator_first_name} {(workflow as any).creator_last_name}
									</Typography>
								)}
								<Typography fontSize={12} color="text.secondary">
									Created:{' '}
									{workflow.created_at
										? formatMDY(new Date(workflow.created_at).toISOString())
										: 'N/A'}
								</Typography>
								<Typography fontSize={12} color="text.secondary">
									Updated:{' '}
									{workflow.updated_at
										? formatMDY(new Date(workflow.updated_at).toISOString())
										: 'N/A'}
								</Typography>
							</Box>
						</Box>
					)}
				</Paper>

				{/* Section 2: Thresholds (Beveled Container with Table) */}
				<Paper elevation={0} sx={containerStyles.beveledCard}>
					<Box p={2}>
						<Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
							<Typography fontSize={13} fontWeight={600}>
								SLA & Capacity Thresholds ({thresholds.length})
							</Typography>
							<BasicButtonStyled
								buttonProps={{
									variant: 'outlined',
									size: 'small',
									onClick: () => setShowThresholdDialog(true),
									startIcon: <Add />,
									color: 'inherit',
								}}
							>
								Threshold
							</BasicButtonStyled>
						</Box>

						{thresholds.length === 0 ? (
							<Typography fontSize={14} color="text.secondary">
								No thresholds configured
							</Typography>
						) : (
							<Table>
								<TableHead>
									<TableRow>
										<TableCell>Type</TableCell>
										<TableCell>Value</TableCell>
										<TableCell>Status</TableCell>
										<TableCell width={100}>Actions</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{thresholds.map((threshold) => (
										<TableRow key={threshold.id}>
											<TableCell>
												{formatThresholdType(threshold.threshold_type as any)}
											</TableCell>
											<TableCell>
												{threshold.threshold_value}{' '}
												{getThresholdUnit(threshold.threshold_type as any)}
											</TableCell>
											<TableCell>
												<Chip
													label={threshold.is_active ? 'Active' : 'Inactive'}
													size="small"
													color={threshold.is_active ? 'success' : 'default'}
												/>
											</TableCell>
											<TableCell>
												<Box display="flex" gap={0.5}>
													<BasicButtonStyled
														icon={<Edit />}
														compact
														buttonProps={{ onClick: () => handleEditThreshold(threshold) }}
														tooltipProps={{ title: 'Edit Threshold' }}
													/>
													<BasicButtonStyled
														icon={<Archive />}
														compact
														buttonProps={{
															onClick: () => handleArchiveThreshold(threshold),
														}}
														tooltipProps={{ title: 'Archive Threshold' }}
													/>
												</Box>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						)}
					</Box>
				</Paper>

				{/* Section 3: Rules (Beveled Container with Containerized Items) */}
				<Paper elevation={0} sx={containerStyles.beveledCard}>
					<Box p={2}>
						<Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
							<Typography fontSize={13} fontWeight={600}>
								Automation Rules ({rules.length})
							</Typography>
							<BasicButtonStyled
								buttonProps={{
									variant: 'outlined',
									size: 'small',
									onClick: () => setShowRuleDialog(true),
									startIcon: <Add />,
									color: 'inherit',
								}}
							>
								Rule
							</BasicButtonStyled>
						</Box>

						{rules.length === 0 ? (
							<Typography fontSize={14} color="text.secondary">
								No rules configured
							</Typography>
						) : (
							<Stack spacing={2}>
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
							</Stack>
						)}
					</Box>
				</Paper>

				{/* Section 4: Execution History (Collapsible) */}
				<Paper elevation={0} sx={containerStyles.beveledCard}>
					<Box p={2}>
						<Box display="flex" justifyContent="space-between" alignItems="center">
							<Box display="flex" alignItems="center" gap={1}>
								<Typography fontSize={13} fontWeight={600}>
									Execution History
								</Typography>
								<IconButton
									size="small"
									onClick={() => setHistoryExpanded((prev) => !prev)}
								>
									{historyExpanded ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
								</IconButton>
							</Box>
							{historyExpanded && (
								<FormControl size="small" sx={{ minWidth: 160 }}>
									<Select
										value={historyRuleFilter ?? ''}
										displayEmpty
										onChange={(e) => {
											const val = e.target.value;
											setHistoryRuleFilter(val === '' ? undefined : (val as number));
										}}
									>
										<MenuItem value="">All Rules</MenuItem>
										{rules.map((rule) => (
											<MenuItem key={rule.id} value={rule.id}>
												{rule.name}
											</MenuItem>
										))}
									</Select>
								</FormControl>
							)}
						</Box>
						<Collapse in={historyExpanded}>
							<Box mt={2}>
								{historyExpanded && (
									<ExecutionHistoryTable ruleId={historyRuleFilter} compact />
								)}
							</Box>
						</Collapse>
					</Box>
				</Paper>
			</Stack>

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
					<Typography>
						Are you sure you want to archive the threshold "
						{formatThresholdType(archivingThreshold.threshold_type as any)}"? This action cannot be undone.
					</Typography>
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
					<Typography>
						Are you sure you want to archive the rule "{archivingRule.name}"? This action cannot be undone.
					</Typography>
				</BasicDialog>
			)}

			<RuleExecutionSummaryDialog
				open={!!executionSummary}
				onClose={() => setExecutionSummary(null)}
				summary={executionSummary}
				ruleName={summaryRuleName}
			/>
		</Box>
	);
}
