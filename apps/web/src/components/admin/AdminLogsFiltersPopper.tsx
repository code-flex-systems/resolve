'use client';

import { PopperProps } from '@mui/material';
import { Dayjs } from 'dayjs';
import type { EntityName } from '@/api/utils/adminActionLogger';
import type { GetUserOutput } from '@/hooks/trpc/useUserTrpc';
import LogsFiltersPopperBase from '@/components/admin/LogsFiltersPopperBase';

export default function AdminLogsFiltersPopper({
	anchorEl,
	onClose,
	draftRange,
	setDraftRange,
	draftEntity,
	setDraftEntity,
	draftUsers,
	setDraftUsers,
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
	onApply: () => void;
}) {
	return (
		<LogsFiltersPopperBase
			anchorEl={anchorEl}
			onClose={onClose}
			title="Filter Logs"
			draftRange={draftRange}
			setDraftRange={setDraftRange}
			draftEntity={draftEntity}
			setDraftEntity={setDraftEntity}
			draftUsers={draftUsers}
			setDraftUsers={setDraftUsers}
			onApply={onApply}
		/>
	);
}
