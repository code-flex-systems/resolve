'use client';

import { trpc } from '@/lib/trpc';
import { GetUserOutput } from '@/hooks/trpc/useUserTrpc';
import { useCallback, useState } from 'react';
import Combobox, { type ComboboxOption } from '@/components/ui/Combobox';
import useDebounce from '@/lib/utils/useDebounce';

export default function UserFilter({
	users,
	setUsers,
	width = '100%',
	text = 'Search users...',
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

	const options: ComboboxOption[] = results.map((u) => ({
		value: u.id,
		label: `${u.first} ${u.last}`,
		description: u.email,
	}));

	const selectedOptions: ComboboxOption[] = users.map((u) => ({
		value: u.id,
		label: `${u.first} ${u.last}`,
		description: u.email,
	}));

	if (multi) {
		return (
			<div style={{ width }}>
				<Combobox
					multiple
					options={options}
					values={selectedOptions}
					onChangeMultiple={(opts) => {
						const newUsers = opts
							.map((opt) => results.find((u) => u.id === opt.value) ?? users.find((u) => u.id === opt.value))
							.filter(Boolean) as GetUserOutput[];
						setUsers(newUsers);
					}}
					onInputChange={(value) => {
						if (value) {
							setSearching(true);
							debouncedSearch(value);
						}
					}}
					loading={searching}
					filterDisabled
					placeholder={text}
					fullWidth
				/>
			</div>
		);
	}

	// Single-select mode
	const selectedOption = users.length > 0
		? { value: users[0].id, label: `${users[0].first} ${users[0].last}`, description: users[0].email }
		: null;

	return (
		<div style={{ width }}>
			<Combobox
				options={options}
				value={selectedOption}
				onChange={(opt) => {
					if (!opt) {
						setUsers([]);
					} else {
						const found = results.find((u) => u.id === opt.value) ?? users.find((u) => u.id === opt.value);
						setUsers(found ? [found] : []);
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
				placeholder={text}
				fullWidth
			/>
		</div>
	);
}
