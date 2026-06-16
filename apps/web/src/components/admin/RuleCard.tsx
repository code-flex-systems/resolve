'use client';

import { IconArchive, IconEdit, IconPlayerPlay } from '@tabler/icons-react';
import { Spinner } from '@/components/ui/Progress';
import Chip from '@/components/ui/Chip';
import { formatTriggerType, formatActionType } from '@/lib/utils/workflowUtils';
import { useDeskLocationStore } from '@/stores/useDeskLocationStore';
import { WorkflowActionType } from '@/config/enums';
import type { WorkflowRule } from '@/hooks/trpc/useWorkflowTrpc';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';

interface RuleCardProps {
	rule: WorkflowRule;
	onEdit: (rule: WorkflowRule) => void;
	onArchive: (rule: WorkflowRule) => void;
	onRun?: (rule: WorkflowRule) => void;
	isRunning?: boolean;
	showDivider?: boolean;
}

const formatCondition = (cond: any) => {
	const valueStr =
		cond.value !== null && cond.value !== undefined ? JSON.stringify(cond.value) : '';
	return `${cond.field} ${cond.operator} ${valueStr}`;
};

export default function RuleCard({
	rule,
	onEdit,
	onArchive,
	onRun,
	isRunning,
	showDivider,
}: RuleCardProps) {
	const deskStore = useDeskLocationStore();

	const targetLocationId =
		rule.action_type === WorkflowActionType.MOVE_CLAIM
			? (rule.action_config as any)?.targetLocationId
			: null;
	const targetLocationName = targetLocationId ? deskStore.getLocationName(targetLocationId) : null;

	return (
		<div
			style={{
				padding: '16px 4px',
				display: 'flex',
				justifyContent: 'space-between',
				alignItems: 'flex-start',
				gap: 16,
				borderBottom: showDivider ? '1px solid var(--border)' : 'none',
			}}
		>
			<div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
				<div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
					<span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
						{rule.name}
					</span>
					{rule.description && (
						<span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
							{rule.description}
						</span>
					)}
				</div>

				<div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
					<Chip size="sm" color={rule.is_active ? 'success' : 'neutral'}>
						{rule.is_active ? 'Active' : 'Inactive'}
					</Chip>
					<Chip size="sm" color="warning">
						{`Trigger: ${formatTriggerType(rule.trigger_type as any)}`}
					</Chip>
					<Chip size="sm" color="primary">
						{`Action: ${formatActionType(rule.action_type as any)}`}
					</Chip>
					{targetLocationName && (
						<Chip size="sm" color="primary">
							{`Target: ${targetLocationName}`}
						</Chip>
					)}
					<Chip size="sm" color="neutral">
						{`Mode: ${rule.execution_mode}`}
					</Chip>
					<Chip size="sm" color="neutral">
						{`Priority: ${rule.priority}`}
					</Chip>
				</div>

				{rule.conditions &&
					typeof rule.conditions === 'object' &&
					(rule.conditions as any).conditions && (
						<div>
							<span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
								Conditions ({(rule.conditions as any).logic}):
							</span>
							<div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 8 }}>
								{((rule.conditions as any).conditions || []).map((cond: any, idx: number) => (
									<span key={idx} style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
										• {formatCondition(cond)}
									</span>
								))}
							</div>
						</div>
					)}
			</div>

			<div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
				{rule.is_active && onRun && (
					<Tooltip content="Run Rule">
						<Button
							variant="icon"
							size="sm"
							color="neutral"
							onClick={() => onRun(rule)}
							disabled={isRunning}
						>
							{isRunning ? <Spinner size="sm" /> : <IconPlayerPlay size={16} />}
						</Button>
					</Tooltip>
				)}
				<Tooltip content="Edit Rule">
					<Button variant="icon" size="sm" color="neutral" onClick={() => onEdit(rule)}>
						<IconEdit size={16} />
					</Button>
				</Tooltip>
				<Tooltip content="Archive Rule">
					<Button variant="icon" size="sm" color="neutral" onClick={() => onArchive(rule)}>
						<IconArchive size={16} />
					</Button>
				</Tooltip>
			</div>
		</div>
	);
}
