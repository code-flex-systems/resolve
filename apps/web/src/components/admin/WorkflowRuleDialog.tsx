'use client';

import { IconTrash } from '@tabler/icons-react';
import { FormControl, FormControlLabel, FormHelperText, InputLabel, MenuItem, Select } from '@mui/material';
import Input, { Textarea } from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import Divider from '@/components/ui/Divider';
import Switch from '@/components/ui/Switch';
import Button from '@/components/ui/Button';
import { useState, useEffect } from 'react';
import BasicDialog from '@/components/common/BasicDialog';
import DeskLocationSelect from '@/components/common/DeskLocationSelect';
import DeskLocationTypeSelect from '@/components/common/DeskLocationTypeSelect';
import { useWorkflowTrpc } from '@/hooks/trpc/useWorkflowTrpc';
import { WorkflowTriggerType, WorkflowActionType, WorkflowExecutionMode } from '@/config/enums';
import { WORKFLOW_CONDITION_FIELDS, VALUE_LESS_OPERATORS } from '@/lib/workflow/ruleConditions';
import {
	TRIGGER_EXPLANATIONS,
	ACTION_EXPLANATIONS,
	MODE_EXPLANATIONS,
	TRIGGER_CONFIG,
	ACTION_CONFIG,
	MODE_CONFIG,
} from '@/config/workflowExplanations';
import type { WorkflowRule } from '@/hooks/trpc/useWorkflowTrpc';
import type { RuleConditionsInput, RuleConditionInput } from '@/schemas/workflowSchemas';

interface WorkflowRuleDialogProps {
	onClose: () => void;
	workflowId: number;
	editingRule?: WorkflowRule | null;
}

const OPERATOR_LABELS: Record<string, string> = {
	eq: 'equals',
	neq: 'does not equal',
	gt: 'greater than',
	gte: 'greater than or equal to',
	lt: 'less than',
	lte: 'less than or equal to',
	in: 'is one of',
	not_in: 'is not one of',
	is_null: 'is empty',
	is_not_null: 'has value',
};

// Sub-component for rendering value input based on field type
function renderValueInput(
	fieldDef: any,
	condition: RuleConditionInput,
	onChange: (condition: RuleConditionInput) => void
) {
	if (fieldDef.source === 'enum' && fieldDef.enumOptions) {
		return (
			<FormControl size="small" fullWidth>
				<Select
					value={condition.value || ''}
					onChange={(e) => onChange({ ...condition, value: e.target.value })}
				>
					{fieldDef.enumOptions.map((opt: any) => (
						<MenuItem key={opt.value} value={opt.value}>
							{opt.label}
						</MenuItem>
					))}
				</Select>
			</FormControl>
		);
	}

	if (fieldDef.type === 'numeric' || fieldDef.type === 'integer') {
		return (
			<Input
				type="number"
				fullWidth
				value={String(condition.value ?? '')}
				onChange={(e) => onChange({ ...condition, value: parseFloat(e.target.value) })}
			/>
		);
	}

	// Default: text input
	return (
		<Input
			fullWidth
			value={String(condition.value ?? '')}
			onChange={(e) => onChange({ ...condition, value: e.target.value })}
		/>
	);
}

// Sub-component for individual condition row
function ConditionRow({
	condition,
	onChange,
	onRemove,
}: {
	condition: RuleConditionInput;
	onChange: (condition: RuleConditionInput) => void;
	onRemove: () => void;
}) {
	const selectedFieldDef = WORKFLOW_CONDITION_FIELDS.find((f) => f.field === condition.field);

	return (
		<div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
			{/* Field selector */}
			<FormControl size="small" style={{ minWidth: 200 }}>
				<InputLabel>Field</InputLabel>
				<Select
					value={condition.field}
					onChange={(e) =>
						onChange({ ...condition, field: e.target.value, operator: 'eq' as any, value: null })
					}
					label="Field"
				>
					{WORKFLOW_CONDITION_FIELDS.map((fieldDef) => (
						<MenuItem key={fieldDef.field} value={fieldDef.field}>
							{fieldDef.label}
						</MenuItem>
					))}
				</Select>
			</FormControl>

			{/* Operator selector (filtered by field type) */}
			{selectedFieldDef && (
				<FormControl size="small" style={{ minWidth: 120 }}>
					<InputLabel>Operator</InputLabel>
					<Select
						value={condition.operator}
						onChange={(e) => onChange({ ...condition, operator: e.target.value as any })}
						label="Operator"
					>
						{selectedFieldDef.allowedOperators.map((op) => (
							<MenuItem key={op} value={op}>
								{OPERATOR_LABELS[op]}
							</MenuItem>
						))}
					</Select>
				</FormControl>
			)}

			{/* Value input (type depends on field and operator) */}
			{selectedFieldDef && condition.operator && !VALUE_LESS_OPERATORS.includes(condition.operator as any) && (
				<div style={{ flex: 1 }}>{renderValueInput(selectedFieldDef, condition, onChange)}</div>
			)}

			{/* Remove button */}
			<Button variant="icon" size="sm" onClick={onRemove}>
				<IconTrash size={20} />
			</Button>
		</div>
	);
}

// Sub-component for building condition trees
function RuleConditionsBuilder({
	conditions,
	onChange,
}: {
	conditions: RuleConditionsInput | null;
	onChange: (conditions: RuleConditionsInput | null) => void;
}) {
	if (!conditions) {
		return (
			<Button variant="outlined" onClick={() => onChange({ logic: 'AND', conditions: [] })}>
				Add Conditions
			</Button>
		);
	}

	return (
		<div style={{ padding: 16, backgroundColor: 'var(--bg-primary)' }}>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
				<FormControl size="small" style={{ minWidth: 100 }}>
					<Select
						value={conditions.logic}
						onChange={(e) => onChange({ ...conditions, logic: e.target.value as 'AND' | 'OR' })}
					>
						<MenuItem value="AND">Match ALL</MenuItem>
						<MenuItem value="OR">Match ANY</MenuItem>
					</Select>
				</FormControl>

				<Button size="sm" variant="outlined" onClick={() => onChange(null)}>
					Remove All
				</Button>
			</div>

			<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
				{(conditions.conditions ?? []).map((cond, idx) => (
					<ConditionRow
						key={idx}
						condition={cond}
						onChange={(newCond) => {
							const updated = [...conditions.conditions];
							updated[idx] = newCond;
							onChange({ ...conditions, conditions: updated });
						}}
						onRemove={() => {
							const updated = conditions.conditions.filter((_, i) => i !== idx);
							onChange({ ...conditions, conditions: updated });
						}}
					/>
				))}

				<Button
					size="sm"
					variant="text"
					onClick={() =>
						onChange({
							...conditions,
							conditions: [
								...conditions.conditions,
								{ field: 'claim.recovery_status', operator: 'eq', value: null } as any,
							],
						})
					}
				>
					+ Add Condition
				</Button>
			</div>
		</div>
	);
}

export default function WorkflowRuleDialog({ onClose, workflowId, editingRule }: WorkflowRuleDialogProps) {
	const [formData, setFormData] = useState({
		name: '',
		description: '',
		triggerType: '' as WorkflowTriggerType | '',
		actionType: '' as WorkflowActionType | '',
		actionConfig: {} as Record<string, unknown>,
		conditions: null as RuleConditionsInput | null,
		executionMode: WorkflowExecutionMode.SUGGEST,
		priority: 500,
		isActive: true,
	});

	const { createRule, updateRule } = useWorkflowTrpc();

	// Initialize form when editing or when dialog opens
	useEffect(() => {
		if (editingRule) {
			setFormData({
				name: editingRule.name,
				description: editingRule.description || '',
				triggerType: editingRule.trigger_type as any,
				actionType: editingRule.action_type as any,
				actionConfig: (editingRule.action_config as Record<string, unknown>) || {},
				conditions: (editingRule.conditions as RuleConditionsInput) || null,
				executionMode: editingRule.execution_mode as any,
				priority: editingRule.priority,
				isActive: editingRule.is_active,
			});
		} else {
			setFormData({
				name: '',
				description: '',
				triggerType: '',
				actionType: '',
				actionConfig: {},
				conditions: null,
				executionMode: WorkflowExecutionMode.SUGGEST,
				priority: 500,
				isActive: true,
			});
		}
	}, [editingRule]);

	const handleSubmit = async () => {
		try {
			if (editingRule) {
				await updateRule.mutateAsync({
					id: editingRule.id,
					params: {
						name: formData.name,
						description: formData.description || undefined,
						triggerType: formData.triggerType as WorkflowTriggerType,
						actionType: formData.actionType as WorkflowActionType,
						actionConfig: formData.actionConfig,
						conditions: formData.conditions || undefined,
						executionMode: formData.executionMode,
						priority: formData.priority,
						isActive: formData.isActive,
					},
				});
			} else {
				await createRule.mutateAsync({
					workflowDefinitionId: workflowId,
					name: formData.name,
					description: formData.description || undefined,
					triggerType: formData.triggerType as WorkflowTriggerType,
					actionType: formData.actionType as WorkflowActionType,
					actionConfig: formData.actionConfig,
					conditions: formData.conditions || undefined,
					executionMode: formData.executionMode,
					priority: formData.priority,
				});
			}
			onClose();
		} catch (error) {
			console.error('Failed to save rule:', error);
		}
	};

	const isFormValid = formData.name.trim() && formData.triggerType && formData.actionType;

	return (
		<BasicDialog
			onClose={onClose}
			title={editingRule ? 'Edit Rule' : 'Add Rule'}
			primaryAction={{
				label: editingRule ? 'Update' : 'Create',
				onClick: handleSubmit,
				disabled: !isFormValid || createRule.isPending || updateRule.isPending,
			}}
			secondaryActions={[{ label: 'Cancel', onClick: onClose }]}
			width={700}
			maxHeight="80vh"
		>
			<div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingTop: 8 }}>
				{/* Section 1: Basic Info */}
				<div>
					<span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
						BASIC INFORMATION
					</span>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
						<Input
							label="Rule Name"
							value={formData.name}
							onChange={(e) => setFormData({ ...formData, name: e.target.value })}
							fullWidth
							required
							autoFocus
							placeholder="e.g., Move aged claims to review"
						/>
						<Textarea
							label="Description"
							value={formData.description}
							onChange={(e) => setFormData({ ...formData, description: e.target.value })}
							fullWidth
							rows={2}
							placeholder="Optional description of what this rule does..."
						/>
					</div>
				</div>

				<Divider />

				{/* Section 2: Trigger & Action */}
				<div>
					<span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
						TRIGGER & ACTION
					</span>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
						<FormControl fullWidth required>
							<InputLabel>Trigger Type</InputLabel>
							<Select
								value={formData.triggerType}
								onChange={(e) =>
									setFormData({ ...formData, triggerType: e.target.value as WorkflowTriggerType })
								}
								label="Trigger Type"
								displayEmpty
								renderValue={(selected) => {
									if (!selected) {
										return (
											<span style={{ color: 'var(--text-secondary)' }}>
												Select when this rule should fire...
											</span>
										);
									}
									return TRIGGER_CONFIG[selected as WorkflowTriggerType]?.label || selected;
								}}
							>
								{Object.entries(TRIGGER_CONFIG).map(([key, config]) => (
									<MenuItem key={key} value={key}>
										<div>
											<span style={{ fontSize: 14 }}>{config.label}</span>
											<span style={{ fontSize: 12,  color: 'var(--text-secondary)'  }}>
												{config.description}
											</span>
										</div>
									</MenuItem>
								))}
							</Select>
							{formData.triggerType && (
								<FormHelperText>{TRIGGER_EXPLANATIONS[formData.triggerType]}</FormHelperText>
							)}
						</FormControl>

						<FormControl fullWidth required>
							<InputLabel>Action Type</InputLabel>
							<Select
								value={formData.actionType}
								onChange={(e) =>
									setFormData({ ...formData, actionType: e.target.value as WorkflowActionType })
								}
								label="Action Type"
								displayEmpty
								renderValue={(selected) => {
									if (!selected) {
										return (
											<span style={{ color: 'var(--text-secondary)' }}>
												Select what action to perform...
											</span>
										);
									}
									return ACTION_CONFIG[selected as WorkflowActionType]?.label || selected;
								}}
							>
								{Object.entries(ACTION_CONFIG).map(([key, config]) => (
									<MenuItem key={key} value={key}>
										<div>
											<span style={{ fontSize: 14 }}>{config.label}</span>
											<span style={{ fontSize: 12,  color: 'var(--text-secondary)'  }}>
												{config.description}
											</span>
										</div>
									</MenuItem>
								))}
							</Select>
							{formData.actionType && (
								<FormHelperText>{ACTION_EXPLANATIONS[formData.actionType]}</FormHelperText>
							)}
						</FormControl>

						{/* Dynamic action config fields based on actionType */}
						{formData.actionType === WorkflowActionType.MOVE_CLAIM && (
							<div style={{ display: 'flex', gap: 16 }}>
								<DeskLocationTypeSelect
									value={(formData.actionConfig.targetLocationTypeId as number) || null}
									onChange={(id) =>
										setFormData({
											...formData,
											actionConfig: {
												...formData.actionConfig,
												targetLocationTypeId: id,
												targetLocationId: null,
											},
										})
									}
									placeholder="Select desk location type first..."
									fullWidth
								/>
								<DeskLocationSelect
									value={(formData.actionConfig.targetLocationId as number) || null}
									onChange={(id) =>
										setFormData({
											...formData,
											actionConfig: { ...formData.actionConfig, targetLocationId: id },
										})
									}
									deskLocationTypeId={(formData.actionConfig.targetLocationTypeId as number) || null}
									label="Target Desk Location"
									fullWidth
								/>
							</div>
						)}
					</div>
				</div>

				<Divider />

				{/* Section 3: Conditions (Optional) */}
				<div>
					<span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
						CONDITIONS (OPTIONAL)
					</span>
					<RuleConditionsBuilder
						conditions={formData.conditions}
						onChange={(conditions) => setFormData({ ...formData, conditions })}
					/>
				</div>

				<Divider />

				{/* Section 4: Execution Settings */}
				<div>
					<span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
						EXECUTION SETTINGS
					</span>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
						<FormControl fullWidth>
							<InputLabel>Execution Mode</InputLabel>
							<Select
								value={formData.executionMode}
								onChange={(e) =>
									setFormData({ ...formData, executionMode: e.target.value as WorkflowExecutionMode })
								}
								label="Execution Mode"
								renderValue={(selected) => {
									if (!selected) {
										return (
											<span style={{ color: 'var(--text-secondary)' }}>
												Select how this rule should execute...
											</span>
										);
									}
									return MODE_CONFIG[selected as WorkflowExecutionMode]?.label || selected;
								}}
							>
								{Object.entries(MODE_CONFIG).map(([key, config]) => (
									<MenuItem key={key} value={key}>
										<div>
											<span style={{ fontSize: 14 }}>{config.label}</span>
											<span style={{ fontSize: 12,  color: 'var(--text-secondary)'  }}>
												{config.description}
											</span>
										</div>
									</MenuItem>
								))}
							</Select>
							{formData.executionMode && (
								<FormHelperText>{MODE_EXPLANATIONS[formData.executionMode]}</FormHelperText>
							)}
						</FormControl>

						<Input
							label="Priority"
							type="number"
							value={formData.priority}
							onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value, 10) })}
							min={1}
							max={1000}
							helperText="Lower numbers = higher priority (1-1000)"
							placeholder="500"
						/>

						{editingRule && (
							<FormControlLabel
								control={
									<Switch
										checked={formData.isActive}
										onChange={(checked) => setFormData({ ...formData, isActive: checked })}
									/>
								}
								label="Active"
							/>
						)}
					</div>
				</div>
			</div>
		</BasicDialog>
	);
}
