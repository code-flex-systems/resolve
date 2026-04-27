'use client';

import { IconArchive, IconBolt, IconCircleCheck, IconCircleX, IconCurrentLocation, IconEdit, IconFlag, IconHandClick, IconPlayerPlay, IconRobot } from '@tabler/icons-react';
import { Spinner } from '@/components/ui/Progress';
import Card from '@/components/ui/Card';
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
}

const formatCondition = (cond: any) => {
	// e.g., "claim.recovery_status = 'in_progress'"
	const valueStr = cond.value !== null && cond.value !== undefined ? JSON.stringify(cond.value) : '';
	return `${cond.field} ${cond.operator} ${valueStr}`;
};

export default function RuleCard({ rule, onEdit, onArchive, onRun, isRunning }: RuleCardProps) {
	const deskStore = useDeskLocationStore();

	// Get target location name if this is a MOVE_CLAIM action
	const targetLocationId =
		rule.action_type === WorkflowActionType.MOVE_CLAIM ? (rule.action_config as any)?.targetLocationId : null;
	const targetLocationName = targetLocationId ? deskStore.getLocationName(targetLocationId) : null;

	return (
		<div
			style={{
				padding: 16,
				backgroundColor: 'var(--bg-primary)',
				boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.8), 0 1px 3px 0 rgba(0, 0, 0, 0.04)',
			}}
		>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
				<div style={{ flex: 1 }}>
					{/* Rule name and description */}
					<span style={{ fontSize: 14, fontWeight: 600 }}>
						{rule.name}
					</span>

					{rule.description && (
						<span style={{ fontSize: 13,  color: 'var(--text-secondary)'  }}>
							{rule.description}
						</span>
					)}

					{/* Metadata chips */}
					<div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
						<Chip
							size="sm"
							color={rule.is_active ? 'success' : 'neutral'}
						>{rule.is_active ? 'Active' : 'Inactive'}</Chip>
						<Chip
							size="sm"
							color="warning"
							variant="outlined"
						>{`Trigger: ${formatTriggerType(rule.trigger_type as any)}`}</Chip>
						<Chip
							size="sm"
							color="info"
							variant="outlined"
						>{`Action: ${formatActionType(rule.action_type as any)}`}</Chip>
						{targetLocationName && (
							<Chip
								size="sm"
								color="info"
								variant="outlined"
							>{`Target desk location: ${targetLocationName}`}</Chip>
						)}
						<Chip
							size="sm"
							color={rule.execution_mode === 'auto' ? 'warning' : 'neutral'}
						>{`Mode: ${rule.execution_mode}`}</Chip>
						<Chip
							size="sm"
						>{`Priority: ${rule.priority}`}</Chip>
					</div>

					{/* Conditions summary (if exists) */}
					{rule.conditions && typeof rule.conditions === 'object' && (rule.conditions as any).conditions && (
						<div>
							<span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
								Conditions ({(rule.conditions as any).logic}):
							</span>
							<div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 8 }}>
								{((rule.conditions as any).conditions || []).map((cond: any, idx: number) => (
									<span key={idx} style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
										• {formatCondition(cond)}
									</span>
								))}
							</div>
						</div>
					)}
				</div>

				{/* Action buttons */}
				<div style={{ display: 'flex', gap: 4 }}>
					{rule.is_active && onRun && (
						<Tooltip content="Run Rule">
							<Button variant="icon" size="sm" color="neutral" onClick={() => onRun(rule)} disabled={isRunning}>
							isRunning ? <Spinner size="sm" /> : <IconPlayerPlay size={16} />
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
		</div>
	);
}
