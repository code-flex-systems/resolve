'use client';
import Card from '@/components/ui/Card';
import { ReactNode } from 'react';
import { Dayjs } from 'dayjs';
import BasicPopper from '@/components/common/BasicPopper';
import BasicDateRangePicker from '@/components/common/BasicDateRangePicker';
import UserFilter from '@/components/common/UserFilter';
import type { EntityName } from '@/api/utils/activityLogger';
import type { GetUserOutput } from '@/hooks/trpc/useUserTrpc';
import AdminLogsEntityFilter from '@/components/admin/AdminLogsEntityFilter';
import Button from '@/components/ui/Button';

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
	anchorEl: HTMLElement | null;
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
		<BasicPopper anchorEl={anchorEl} setAnchorEl={() => onClose()} placement="bottom-start">
			<div style={{ ...styles.filtersPaper, minWidth }}>
				<span style={{ fontSize: 14, fontWeight: 600 }}>
					{title}
				</span>
				<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
					<div>
						<span style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
							Date Range
						</span>
						<BasicDateRangePicker
							key={`${draftRange[0]?.toISOString() ?? 'start'}-${draftRange[1]?.toISOString() ?? 'end'}`}
							defaultLabel="Select a range"
							defaultValue={draftRange}
							onConfirm={(range) => setDraftRange(range)}
							clearable={true}
							height={32}
						/>
					</div>
					<div>
						<span style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
							Entity
						</span>
						<AdminLogsEntityFilter value={draftEntity} onChange={setDraftEntity} height={32} />
					</div>
					<div>
						<span style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
							User
						</span>
						<UserFilter
							users={draftUsers}
							setUsers={setDraftUsers}
							text="Filter by user"
							multi={false}
							width="100%"
							height={32}
						/>
					</div>
					{children}
					<div style={{ display: 'flex', justifyContent: 'flex-end' }}>
						<Button variant="outlined" onClick={onApply} size="sm">
							Apply filters
						</Button>
					</div>
				</div>
			</div>
		</BasicPopper>
	);
}

const styles = {
	filtersPaper: {
		padding: 2,
	},
};
