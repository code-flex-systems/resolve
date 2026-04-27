'use client';
import Dropdown from '@/components/ui/Dropdown';
import { Dayjs } from 'dayjs';
import ClaimFilter from '@/components/common/ClaimFilter';
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
	anchorEl: HTMLElement | null;
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
			<div>
				<span  style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
					Claim
				</span>
				<ClaimFilter claim={draftClaim} setClaim={setDraftClaim} height={32} zIndex={1500} />
			</div>
			<div>
				<span  style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
					Actor Type
				</span>
				<Dropdown inlineLabel
					fullWidth
					value={draftActorType ?? ''}
					onChange={(val) => {
						const value = String(val) as 'admin' | 'user' | '';
						setDraftActorType(value ? value : null);
					}}
					options={ACTOR_TYPE_OPTIONS}
				/>
			</div>
		</LogsFiltersPopperBase>
	);
}
