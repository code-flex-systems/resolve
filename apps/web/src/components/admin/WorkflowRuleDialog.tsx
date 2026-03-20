'use client';

import { IconTrash } from '@tabler/icons-react';
import Dropdown from '@/components/ui/Dropdown';
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
			<Dropdown
				options={fieldDef.enumOptions.map((opt: any) => ({
					value: opt.value,
					label: opt.label,
				}))}
				value={(condition.value as string | number) || ''}
				onChange={(v) => onChange({ ...condition, value: v })}
				fullWidth
				size="sm"
			/>
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
			<div style={{ minWidth: 200 }}>
				<Dropdown
					label="Field"
					options={WORKFLOW_CONDITION_FIELDS.map((fieldDef) => ({
						value: fieldDef.field,
						label: fieldDef.label,
					}))}
					value={condition.field}
					onChange={(v) =>
						onChange({ ...condition, field: String(v), operator: 'eq' as any, value: null })
					}
					size="sm"
				/>
			</div>

			{/* Operator selector (filtered by field type) */}
			{selectedFieldDef && (
				<div style={{ minWidth: 120 }}>
					<Dropdown
						label="Operator"
						options={selectedFieldDef.allowedOperators.map((op) => ({
							value: op,
							label: OPERATOR_LABELS[op],
						}))}
						value={condition.operator}
						onChange={(v) => onChange({ ...condition, operator: v as any })}
						size="sm"
					/>
				</div>
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
				<div style={{ minWidth: 100 }}>
					<Dropdown
						options={[
							{ value: 'AND', label: 'Match ALL' },
							{ value: 'OR', label: 'Match ANY' },
						]}
						value={conditions.logic}
						onChange={(v) => onChange({ ...conditions, logic: v as 'AND' | 'OR' })}
						size="sm"
					/>
				</div>

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
						<div>
							<Dropdown
								label="Trigger Type"
								options={Object.entries(TRIGGER_CONFIG).map(([key, config]) => ({
									value: key,
									label: config.label,
									description: config.description,
								}))}
								value={formData.triggerType}
								onChange={(v) =>
									setFormData({ ...formData, triggerType: v as WorkflowTriggerType })
								}
								placeholder="Select when this rule should fire..."
								required
								fullWidth
							/>
							{formData.triggerType && (
								<span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{TRIGGER_EXPLANATIONS[formData.triggerType]}</span>
							)}
						</div>

						<div>
							<Dropdown
								label="Action Type"
								options={Object.entries(ACTION_CONFIG).map(([key, config]) => ({
									value: key,
									label: config.label,
									description: config.description,
								}))}
								value={formData.actionType}
								onChange={(v) =>
									setFormData({ ...formData, actionType: v as WorkflowActionType })
								}
								placeholder="Select what action to perform..."
								required
								fullWidth
							/>
							{formData.actionType && (
								<span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{ACTION_EXPLANATIONS[formData.actionType]}</span>
							)}
						</div>

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
						<div>
							<Dropdown
								label="Execution Mode"
								options={Object.entries(MODE_CONFIG).map(([key, config]) => ({
									value: key,
									label: config.label,
									description: config.description,
								}))}
								value={formData.executionMode}
								onChange={(v) =>
									setFormData({ ...formData, executionMode: v as WorkflowExecutionMode })
								}
								placeholder="Select how this rule should execute..."
								fullWidth
							/>
							{formData.executionMode && (
								<span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{MODE_EXPLANATIONS[formData.executionMode]}</span>
							)}
						</div>

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
							<Switch
								checked={formData.isActive}
								onChange={(checked) => setFormData({ ...formData, isActive: checked })}
								label="Active"
							/>
						)}
					</div>
				</div>
			</div>
		</BasicDialog>
	);
}
