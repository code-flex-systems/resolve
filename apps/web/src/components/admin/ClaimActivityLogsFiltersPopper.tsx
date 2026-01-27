'use client';

import { Box, MenuItem, PopperProps, TextField, Typography } from '@mui/material';
import { Dayjs } from 'dayjs';
import ClaimFilter from '@/components/common/ClaimFilter';
import { TEXT_MUTED } from '@/styles/theme';
import type { EntityName } from '@/api/utils/activityLogger';
import type { GetUserOutput } from '@/hooks/trpc/useUserTrpc';
import type { Claim } from '@/hooks/trpc/useClaimTrpc';
import LogsFiltersPopperBase from '@/components/admin/LogsFiltersPopperBase';

const ACTOR_TYPE_OPTIONS = [
	{ value: '', label: 'All actors' },
	{ value: 'admin', label: 'Admin' },
	{ value: 'user', label: 'User' },
];

export default function ClaimActivityLogsFiltersPopper({
	anchorEl,
	onClose,
	draftRange,
	setDraftRange,
	draftEntity,
	setDraftEntity,
	draftUsers,
	setDraftUsers,
	draftClaim,
	setDraftClaim,
	draftActorType,
	setDraftActorType,
	onApply,
}: {
	anchorEl: PopperProps['anchorEl'];
	onClose: () => void;
	draftRange: [Dayjs | null, Dayjs | null];
	setDraftRange: (range: [Dayjs | null, Dayjs | null]) => void;
	draftEntity: EntityName | null;
	setDraftEntity: (entity: EntityName | null) => void;
	draftUsers: GetUserOutput[];
	setDraftUsers: (users: GetUserOutput[]) => void;
	draftClaim: Claim | null;
	setDraftClaim: (claim: Claim | null) => void;
	draftActorType: 'admin' | 'user' | null;
	setDraftActorType: (actorType: 'admin' | 'user' | null) => void;
	onApply: () => void;
}) {
	return (
		<LogsFiltersPopperBase
			anchorEl={anchorEl}
			onClose={onClose}
			title="Filter Claim Activity"
			minWidth={340}
			draftRange={draftRange}
			setDraftRange={setDraftRange}
			draftEntity={draftEntity}
			setDraftEntity={setDraftEntity}
			draftUsers={draftUsers}
			setDraftUsers={setDraftUsers}
			onApply={onApply}
		>
			<Box>
				<Typography fontSize={12} color={TEXT_MUTED} marginBottom={0.5}>
					Claim
				</Typography>
				<ClaimFilter claim={draftClaim} setClaim={setDraftClaim} height={32} zIndex={1500} />
			</Box>
			<Box>
				<Typography fontSize={12} color={TEXT_MUTED} marginBottom={0.5}>
					Actor Type
				</Typography>
				<TextField
					select
					fullWidth
					size="small"
					value={draftActorType ?? ''}
					onChange={(event) => {
						const value = event.target.value as 'admin' | 'user' | '';
						setDraftActorType(value ? value : null);
					}}
				>
					{ACTOR_TYPE_OPTIONS.map((option) => (
						<MenuItem key={option.value} value={option.value}>
							<Typography fontSize={13}>{option.label}</Typography>
						</MenuItem>
					))}
				</TextField>
			</Box>
		</LogsFiltersPopperBase>
	);
}
