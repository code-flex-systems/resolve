'use client';

import { ReactNode } from 'react';
import { Box, Paper, PopperProps, Typography } from '@mui/material';
import { Dayjs } from 'dayjs';
import BasicPopper from '@/components/common/BasicPopper';
import BasicButtonStyled from '@/components/common/BasicButtonStyled';
import BasicDateRangePicker from '@/components/common/BasicDateRangePicker';
import UserFilter from '@/components/common/UserFilter';
import { TEXT_MUTED } from '@/styles/theme';
import type { EntityName } from '@/api/utils/activityLogger';
import type { GetUserOutput } from '@/hooks/trpc/useUserTrpc';
import AdminLogsEntityFilter from '@/components/admin/AdminLogsEntityFilter';

export default function LogsFiltersPopperBase({
	anchorEl,
	onClose,
	title,
	draftRange,
	setDraftRange,
	draftEntity,
	setDraftEntity,
	draftUsers,
	setDraftUsers,
	onApply,
	children,
	minWidth = 320,
}: {
	anchorEl: PopperProps['anchorEl'];
	onClose: () => void;
	title: string;
	draftRange: [Dayjs | null, Dayjs | null];
	setDraftRange: (range: [Dayjs | null, Dayjs | null]) => void;
	draftEntity: EntityName | null;
	setDraftEntity: (entity: EntityName | null) => void;
	draftUsers: GetUserOutput[];
	setDraftUsers: (users: GetUserOutput[]) => void;
	onApply: () => void;
	children?: ReactNode;
	minWidth?: number;
}) {
	if (!anchorEl) return null;

	return (
		<BasicPopper anchorEl={anchorEl} setAnchorEl={onClose} placement="bottom-start">
			<Paper sx={[styles.filtersPaper, { minWidth }]}>
				<Typography fontSize={14} fontWeight={600} marginBottom={2}>
					{title}
				</Typography>
				<Box display="flex" flexDirection="column" gap={1}>
					<Box>
						<Typography fontSize={12} color={TEXT_MUTED} marginBottom={0.5}>
							Date Range
						</Typography>
						<BasicDateRangePicker
							key={`${draftRange[0]?.toISOString() ?? 'start'}-${draftRange[1]?.toISOString() ?? 'end'}`}
							defaultLabel="Select a range"
							defaultValue={draftRange}
							onConfirm={(range) => setDraftRange(range)}
							clearable={true}
							height={32}
						/>
					</Box>
					<Box>
						<Typography fontSize={12} color={TEXT_MUTED} marginBottom={0.5}>
							Entity
						</Typography>
						<AdminLogsEntityFilter value={draftEntity} onChange={setDraftEntity} height={32} />
					</Box>
					<Box>
						<Typography fontSize={12} color={TEXT_MUTED} marginBottom={0.5}>
							User
						</Typography>
						<UserFilter
							users={draftUsers}
							setUsers={setDraftUsers}
							text="Filter by user"
							multi={false}
							width="100%"
							height={32}
						/>
					</Box>
					{children}
					<Box display="flex" justifyContent="flex-end">
						<BasicButtonStyled
							buttonProps={{
								onClick: onApply,
								size: 'small',
							}}
						>
							Apply filters
						</BasicButtonStyled>
					</Box>
				</Box>
			</Paper>
		</BasicPopper>
	);
}

const styles = {
	filtersPaper: {
		padding: 2,
	},
};
