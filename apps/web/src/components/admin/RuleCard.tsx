'use client';

import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import Edit from '@mui/icons-material/Edit';
import Archive from '@mui/icons-material/Archive';
import FlashOn from '@mui/icons-material/FlashOn';
import PlayArrow from '@mui/icons-material/PlayArrow';
import SmartToy from '@mui/icons-material/SmartToy';
import TouchApp from '@mui/icons-material/TouchApp';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Cancel from '@mui/icons-material/Cancel';
import Flag from '@mui/icons-material/Flag';
import GpsFixed from '@mui/icons-material/GpsFixed';
import BasicButtonStyled from '@/components/common/BasicButtonStyled';
import { BASE_COLOR_LIGHT, BG_TERTIARY } from '@/styles/theme';
import { formatTriggerType, formatActionType } from '@/lib/utils/workflowUtils';
import { useDeskLocationStore } from '@/stores/useDeskLocationStore';
import { WorkflowActionType } from '@/config/enums';
import type { WorkflowRule } from '@/hooks/trpc/useWorkflowTrpc';

interface RuleCardProps {
	rule: WorkflowRule;
	onEdit: (rule: WorkflowRule) => void;
	onArchive: (rule: WorkflowRule) => void;
}

const formatCondition = (cond: any) => {
	// e.g., "claim.recovery_status = 'in_progress'"
	const valueStr = cond.value !== null && cond.value !== undefined ? JSON.stringify(cond.value) : '';
	return `${cond.field} ${cond.operator} ${valueStr}`;
};

export default function RuleCard({ rule, onEdit, onArchive }: RuleCardProps) {
	const deskStore = useDeskLocationStore();

	// Get target location name if this is a MOVE_CLAIM action
	const targetLocationId =
		rule.action_type === WorkflowActionType.MOVE_CLAIM ? (rule.action_config as any)?.targetLocationId : null;
	const targetLocationName = targetLocationId ? deskStore.getLocationName(targetLocationId) : null;

	return (
		<Paper
			variant="outlined"
			sx={{
				p: 2,
				bgcolor: 'background.default',
				boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.8), 0 1px 3px 0 rgba(0, 0, 0, 0.04)',
			}}
		>
			<Box display="flex" justifyContent="space-between" alignItems="flex-start">
				<Box flex={1}>
					{/* Rule name and description */}
					<Typography fontSize={14} fontWeight={600} mb={1}>
						{rule.name}
					</Typography>

					{rule.description && (
						<Typography fontSize={13} color="text.secondary" mb={1.5}>
							{rule.description}
						</Typography>
					)}

					{/* Metadata chips */}
					<Box display="flex" gap={1} mb={1.5} flexWrap="wrap">
						<Chip
							icon={
								rule.is_active ? (
									<CheckCircle sx={{ fontSize: 18 }} />
								) : (
									<Cancel sx={{ fontSize: 18 }} />
								)
							}
							label={rule.is_active ? 'Active' : 'Inactive'}
							size="small"
							color={rule.is_active ? 'success' : 'default'}
							sx={{
								'& .MuiChip-icon': {
									color: rule.is_active ? 'success.main' : 'action.active',
								},
							}}
						/>
						<Chip
							icon={<FlashOn sx={{ fontSize: 18 }} />}
							label={`Trigger: ${formatTriggerType(rule.trigger_type as any)}`}
							size="small"
							color="warning"
							variant="outlined"
							sx={{ '& .MuiChip-icon': { color: 'warning.main' } }}
						/>
						<Chip
							icon={<PlayArrow sx={{ fontSize: 18 }} />}
							label={`Action: ${formatActionType(rule.action_type as any)}`}
							size="small"
							color="info"
							variant="outlined"
							sx={{ '& .MuiChip-icon': { color: 'info.main' } }}
						/>
						{targetLocationName && (
							<Chip
								icon={<GpsFixed sx={{ fontSize: 18 }} />}
								label={`Target desk location: ${targetLocationName}`}
								size="small"
								color="primary"
								variant="outlined"
								sx={{ '& .MuiChip-icon': { color: 'primary.main' } }}
							/>
						)}
						<Chip
							icon={
								rule.execution_mode === 'auto' ? (
									<SmartToy sx={{ fontSize: 18 }} />
								) : (
									<TouchApp sx={{ fontSize: 18 }} />
								)
							}
							label={`Mode: ${rule.execution_mode}`}
							size="small"
							color={rule.execution_mode === 'auto' ? 'warning' : 'default'}
							sx={{
								'& .MuiChip-icon': {
									color: rule.execution_mode === 'auto' ? 'warning.main' : 'action.active',
								},
							}}
						/>
						<Chip
							icon={<Flag sx={{ fontSize: 18 }} />}
							label={`Priority: ${rule.priority}`}
							size="small"
							sx={{ '& .MuiChip-icon': { color: 'action.active' } }}
						/>
					</Box>

					{/* Conditions summary (if exists) */}
					{rule.conditions && typeof rule.conditions === 'object' && (rule.conditions as any).conditions && (
						<Box>
							<Typography fontSize={12} color={BASE_COLOR_LIGHT} mb={0.5}>
								Conditions ({(rule.conditions as any).logic}):
							</Typography>
							<Stack spacing={0.5} pl={1}>
								{((rule.conditions as any).conditions || []).map((cond: any, idx: number) => (
									<Typography key={idx} fontSize={12} color="text.secondary">
										• {formatCondition(cond)}
									</Typography>
								))}
							</Stack>
						</Box>
					)}
				</Box>

				{/* Action buttons */}
				<Box display="flex" gap={0.5}>
					<BasicButtonStyled
						buttonProps={{
							onClick: () => onEdit(rule),
							sx: { bgcolor: BG_TERTIARY },
						}}
						icon={<Edit />}
						compact
						tooltipProps={{ title: 'Edit Rule' }}
					/>
					<BasicButtonStyled
						buttonProps={{
							onClick: () => onArchive(rule),
							sx: { bgcolor: BG_TERTIARY },
						}}
						icon={<Archive />}
						compact
						tooltipProps={{ title: 'Archive Rule' }}
					/>
				</Box>
			</Box>
		</Paper>
	);
}
