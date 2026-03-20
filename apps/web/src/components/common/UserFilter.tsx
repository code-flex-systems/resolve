'use client';

import { trpc } from '@/lib/trpc';
import { GetUserOutput } from '@/hooks/trpc/useUserTrpc';
import { useCallback, useState } from 'react';
import Combobox, { type ComboboxOption } from '@/components/ui/Combobox';
import CustomChip from '@/components/ui/Chip';
import BasicPopper from './BasicPopper';
import { IconUsers } from '@tabler/icons-react';
import useDebounce from '@/lib/utils/useDebounce';

export default function UserFilter({
	users,
	setUsers,
	width = 500,
	padding,
	height = 30,
	text = 'Filter by users',
	multi = true,
}: {
	users: GetUserOutput[];
	setUsers: (newRecipients: GetUserOutput[]) => void;
	width?: number | string;
	padding?: string;
	height?: number;
	text?: string;
	multi?: boolean;
}) {
	const trpcUtils = trpc.useUtils();
	const [results, setResults] = useState<GetUserOutput[]>([]);
	const [searching, setSearching] = useState(false);
	const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

	const debouncedSearch = useCallback(
		useDebounce(async (query: string) => {
			trpcUtils.user.getUsers
				.fetch({ searchTerm: query })
				.then((results) => {
					if (Array.isArray(results)) setResults(results);
				})
				.catch((e) => console.error(e))
				.finally(() => setSearching(false));
		}, 500),
		[]
	);

	// Map users to ComboboxOption
	const options: ComboboxOption[] = results.map((u) => ({
		value: u.id,
		label: `${u.first} ${u.last}`,
		description: u.email,
	}));

	// Map selected users to ComboboxOption
	const selectedOptions: ComboboxOption[] = users.map((u) => ({
		value: u.id,
		label: `${u.first} ${u.last}`,
		description: u.email,
	}));

	return (
		<>
			<div
				style={{
					width,
					display: 'flex',
					justifyContent: 'flex-start',
					alignItems: 'center',
					padding,
					flexWrap: 'wrap',
					overflow: 'auto',
				}}
			>
				<span
					onClick={(e) => {
						setAnchorEl(e.currentTarget);
						e.preventDefault();
						e.stopPropagation();
					}}
					style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer', minWidth: 135, height }}
				>
					<CustomChip color={users.length ? 'info' : 'neutral'} size="sm">
						<IconUsers size={16} style={{ color: users.length ? 'var(--text-accent)' : undefined }} />
						<span style={{ color: users.length ? 'var(--text-accent)' : undefined }}>{users.length ? `Filtering on ${users.length} user${users.length > 1 ? 's' : ''}` : text}</span>
					</CustomChip>
					{!!users.length && (
						<button onClick={(e) => { e.stopPropagation(); setUsers([]); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 14 }}>x</button>
					)}
				</span>
				{users.map((u) => (
					<span key={u.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, margin: '5px 0px', marginLeft: '5px' }}>
						<CustomChip color="info" size="sm">{`${u.first} ${u.last}`}</CustomChip>
						<button onClick={() => { const newUsers = users.filter((s) => s.email !== u.email); setUsers(newUsers); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 14 }}>x</button>
					</span>
				))}
			</div>

			{!!anchorEl && (
				<BasicPopper anchorEl={anchorEl} setAnchorEl={setAnchorEl} placement="bottom-start">
					<div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', padding: 8, marginTop: 5 }}>
						<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 5, width: 300 }}>
							<Combobox
								multiple
								options={options}
								values={selectedOptions}
								onChangeMultiple={(opts) => {
									const newUsers = opts.map((opt) => {
										const found = results.find((u) => u.id === opt.value);
										if (found) return found;
										return users.find((u) => u.id === opt.value)!;
									}).filter(Boolean);
									if (multi) {
										setUsers(newUsers);
									} else {
										setUsers(newUsers.length ? [newUsers[newUsers.length - 1]] : []);
									}
								}}
								onInputChange={(value) => {
									if (value) {
										setSearching(true);
										debouncedSearch(value);
									}
								}}
								loading={searching}
								filterDisabled
								placeholder="Search by name"
								fullWidth
							/>
						</div>
					</div>
				</BasicPopper>
			)}
		</>
	);
}
