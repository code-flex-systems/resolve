'use client';

import { IconTrash } from '@tabler/icons-react';
import Dropdown from '@/components/ui/Dropdown';
import Input, { Textarea } from '@/components/ui/Input';
import Switch from '@/components/ui/Switch';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import StepperFlow from '@/components/ui/StepperFlow';
import { useState, useEffect } from 'react';
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
import Chip from '@/components/ui/Chip';

interface WorkflowRuleDialogProps {
	onClose: () => void;
	workflowId: string;
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

/* =========================================================================
   SUB-COMPONENTS
   ========================================================================= */

function renderValueInput(
	fieldDef: any,
	condition: RuleConditionInput,
	onChange: (condition: RuleConditionInput) => void
) {
	if (fieldDef.source === 'enum' && fieldDef.enumOptions) {
		return (
			<Dropdown
				options={fieldDef.enumOptions.map((opt: any) => ({ value: opt.value, label: opt.label }))}
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
	return (
		<Input
			fullWidth
			value={String(condition.value ?? '')}
			onChange={(e) => onChange({ ...condition, value: e.target.value })}
		/>
	);
}

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
			<div style={{ minWidth: 200 }}>
				<Dropdown
					label="Field"
					options={WORKFLOW_CONDITION_FIELDS.map((f) => ({ value: f.field, label: f.label }))}
					value={condition.field}
					onChange={(v) =>
						onChange({ ...condition, field: String(v), operator: 'eq' as any, value: null })
					}
					size="sm"
				/>
			</div>
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
			{selectedFieldDef &&
				condition.operator &&
				!VALUE_LESS_OPERATORS.includes(condition.operator as any) && (
					<div style={{ flex: 1 }}>{renderValueInput(selectedFieldDef, condition, onChange)}</div>
				)}
			<Button variant="icon" size="sm" onClick={onRemove} color="error">
				<IconTrash size={16} stroke={1.5} />
			</Button>
		</div>
	);
}

function RuleConditionsBuilder({
	conditions,
	onChange,
}: {
	conditions: RuleConditionsInput | null;
	onChange: (conditions: RuleConditionsInput | null) => void;
}) {
	if (!conditions) {
		return (
			<div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
				<p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: 0 }}>
					Conditions determine which claims this rule applies to. Without conditions, the rule
					applies to all claims.
				</p>
				<Button
					variant="outlined"
					size="sm"
					onClick={() => onChange({ logic: 'AND', conditions: [] })}
				>
					Add Conditions
				</Button>
			</div>
		);
	}
	return (
		<div style={{ display: 'flex', flexDirection: 'column' as const, gap: 12 }}>
			<p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: 0 }}>
				Define the conditions that determine which claims this rule applies to.
			</p>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
				<Dropdown
					options={[
						{ value: 'AND', label: 'Match ALL conditions' },
						{ value: 'OR', label: 'Match ANY condition' },
					]}
					value={conditions.logic}
					onChange={(v) => onChange({ ...conditions, logic: v as 'AND' | 'OR' })}
					size="sm"
				/>
				<Button size="sm" variant="text" color="error" onClick={() => onChange(null)}>
					Remove All
				</Button>
			</div>
			{(conditions.conditions ?? []).map((cond, idx) => (
				<ConditionRow
					key={idx}
					condition={cond}
					onChange={(newCond) => {
						const updated = [...conditions.conditions];
						updated[idx] = newCond;
						onChange({ ...conditions, conditions: updated });
					}}
					onRemove={() =>
						onChange({
							...conditions,
							conditions: conditions.conditions.filter((_, i) => i !== idx),
						})
					}
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
	);
}

/* =========================================================================
   MAIN COMPONENT
   ========================================================================= */

export default function WorkflowRuleDialog({
	onClose,
	workflowId,
	editingRule,
}: WorkflowRuleDialogProps) {
	const [activeStep, setActiveStep] = useState(0);
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

	const step1Valid = !!formData.name.trim() && !!formData.triggerType && !!formData.actionType;

	return (
		<Dialog open={true} onClose={onClose} size="lg">
			<StepperFlow
				steps={[
					{
						key: 'info',
						label: 'Basic Info',
						description: 'Name, trigger & action',
						isValid: step1Valid,
						content: (
							<div style={{ display: 'flex', flexDirection: 'column' as const, gap: 16 }}>
								<p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: 0 }}>
									Define the basic properties of this rule — what triggers it and what action it
									performs.
								</p>
								<Input
									label="Rule Name"
									value={formData.name}
									onChange={(e) => setFormData({ ...formData, name: e.target.value })}
									fullWidth
									required
									placeholder="e.g., Move aged claims to review"
								/>
								<Textarea
									label="Description"
									value={formData.description}
									onChange={(e) => setFormData({ ...formData, description: e.target.value })}
									fullWidth
									rows={2}
									placeholder="Optional description..."
								/>
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
									placeholder="Select when this rule fires..."
									required
									fullWidth
								/>
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
								{formData.actionType === WorkflowActionType.MOVE_CLAIM && (
									<div style={{ display: 'flex', gap: 16 }}>
										<DeskLocationTypeSelect
											value={(formData.actionConfig.targetLocationTypeId as string) || null}
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
											placeholder="Select desk location type..."
											fullWidth
										/>
										<DeskLocationSelect
											value={(formData.actionConfig.targetLocationId as string) || null}
											onChange={(id) =>
												setFormData({
													...formData,
													actionConfig: { ...formData.actionConfig, targetLocationId: id },
												})
											}
											deskLocationTypeId={
												(formData.actionConfig.targetLocationTypeId as string) || null
											}
											label="Target Desk Location"
											fullWidth
										/>
									</div>
								)}
							</div>
						),
					},
					{
						key: 'conditions',
						label: 'Conditions',
						description: 'When to apply',
						isOptional: true,
						isValid: true,
						content: (
							<RuleConditionsBuilder
								conditions={formData.conditions}
								onChange={(conditions) => setFormData({ ...formData, conditions })}
							/>
						),
					},
					{
						key: 'execution',
						label: 'Execution',
						description: 'Mode & priority',
						isValid: true,
						content: (
							<div style={{ display: 'flex', flexDirection: 'column' as const, gap: 16 }}>
								<p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: 0 }}>
									Choose how this rule executes. Suggest mode requires admin approval before actions
									are taken. Auto mode executes immediately.
								</p>
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
									fullWidth
								/>
								<Input
									label="Priority"
									type="number"
									value={formData.priority}
									onChange={(e) =>
										setFormData({ ...formData, priority: parseInt(e.target.value, 10) })
									}
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
						),
					},
					{
						key: 'review',
						label: 'Review',
						description: 'Confirm & save',
						isValid: true,
						content: (
							<div style={{ display: 'flex', flexDirection: 'column' as const, gap: 16 }}>
								<p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: 0 }}>
									Review your rule configuration before saving.
								</p>
								<div style={{ display: 'flex', flexDirection: 'column' as const, gap: 12 }}>
									<div>
										<span
											style={{
												fontSize: 12,
												color: 'var(--text-muted)',
												textTransform: 'uppercase' as const,
												letterSpacing: '0.04em',
											}}
										>
											Name
										</span>
										<div style={{ fontSize: 14, fontWeight: 500, marginTop: 2 }}>
											{formData.name || '—'}
										</div>
									</div>
									{formData.description && (
										<div>
											<span
												style={{
													fontSize: 12,
													color: 'var(--text-muted)',
													textTransform: 'uppercase' as const,
													letterSpacing: '0.04em',
												}}
											>
												Description
											</span>
											<div style={{ fontSize: 14, marginTop: 2 }}>{formData.description}</div>
										</div>
									)}
									<div style={{ display: 'flex', gap: 24 }}>
										<div>
											<span
												style={{
													fontSize: 12,
													color: 'var(--text-muted)',
													textTransform: 'uppercase' as const,
													letterSpacing: '0.04em',
												}}
											>
												Trigger
											</span>
											<div style={{ marginTop: 4 }}>
												<Chip color="info" size="sm">
													{TRIGGER_CONFIG[formData.triggerType as WorkflowTriggerType]?.label ??
														'—'}
												</Chip>
											</div>
										</div>
										<div>
											<span
												style={{
													fontSize: 12,
													color: 'var(--text-muted)',
													textTransform: 'uppercase' as const,
													letterSpacing: '0.04em',
												}}
											>
												Action
											</span>
											<div style={{ marginTop: 4 }}>
												<Chip color="neutral" size="sm">
													{ACTION_CONFIG[formData.actionType as WorkflowActionType]?.label ?? '—'}
												</Chip>
											</div>
										</div>
										<div>
											<span
												style={{
													fontSize: 12,
													color: 'var(--text-muted)',
													textTransform: 'uppercase' as const,
													letterSpacing: '0.04em',
												}}
											>
												Mode
											</span>
											<div style={{ marginTop: 4 }}>
												<Chip color="neutral" size="sm">
													{MODE_CONFIG[formData.executionMode]?.label ?? '—'}
												</Chip>
											</div>
										</div>
									</div>
									<div>
										<span
											style={{
												fontSize: 12,
												color: 'var(--text-muted)',
												textTransform: 'uppercase' as const,
												letterSpacing: '0.04em',
											}}
										>
											Conditions
										</span>
										<div style={{ fontSize: 14, marginTop: 2 }}>
											{formData.conditions?.conditions?.length
												? `${formData.conditions.conditions.length} condition(s) — ${formData.conditions.logic}`
												: 'No conditions (applies to all claims)'}
										</div>
									</div>
									<div>
										<span
											style={{
												fontSize: 12,
												color: 'var(--text-muted)',
												textTransform: 'uppercase' as const,
												letterSpacing: '0.04em',
											}}
										>
											Priority
										</span>
										<div style={{ fontSize: 14, marginTop: 2 }}>{formData.priority}</div>
									</div>
								</div>
							</div>
						),
					},
				]}
				activeStep={activeStep}
				onStepChange={setActiveStep}
				onComplete={handleSubmit}
				onCancel={onClose}
				completeLabel={editingRule ? 'Update Rule' : 'Create Rule'}
				loading={createRule.isPending || updateRule.isPending}
			/>
		</Dialog>
	);
}
