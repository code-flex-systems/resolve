'use client';
import React, { useState, useRef, useEffect } from 'react';
import useDebounce from '@/lib/utils/useDebounce';
import { Orbit } from 'ldrs/react';
import 'ldrs/react/Orbit.css';
import { trpc } from '@/lib/trpc';
import { StackedRow } from '../common/StackedRow';
import { GetUserOutput } from '@/hooks/trpc/useUserTrpc';
import { IconSearch, IconX } from '@tabler/icons-react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

export default function UserSearch({
	selectedUser,
	setSelectedUser,
	disabled = false,
	fontSize = 15,
}: {
	selectedUser: GetUserOutput | null;
	setSelectedUser: (newUser: GetUserOutput | null) => void;
	disabled?: boolean;
	fontSize?: number;
}) {
	const trpcUtils = trpc.useUtils();
	const [query, setQuery] = useState<string>('');
	const [searching, setSearching] = useState(false);
	const [results, setResults] = useState<GetUserOutput[]>([]);
	const [showResults, setShowResults] = useState(false);
	const containerRef = useRef<HTMLSpanElement | null>(null);

	const onFocus = () => setShowResults(true);
	const onClose = () => setShowResults(false);

	// Click-away handler
	useEffect(() => {
		if (!showResults) return;
		const handleClickOutside = (e: MouseEvent) => {
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
				onClose();
			}
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, [showResults]);

	const debouncedSearch = useDebounce(async (query: string) => {
		trpcUtils.user.getUsers
			.fetch({ searchTerm: query })
			.then((results) => {
				if (Array.isArray(results)) setResults(results);
			})
			.catch((e) => console.error(e))
			.finally(() => setSearching(false));
	}, 500);

	const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const { value } = event.target;
		setQuery(value);

		if (value) {
			setSearching(true);
			debouncedSearch(value);
		} else {
			onClose();
		}
	};

	const handleClearInput = () => {
		setQuery('');
	};

	return (
		<div style={{ width: 'fit-content' }} className="flex-col-center">
			<span ref={containerRef} style={{ position: 'relative' }}>
				<Input
					placeholder="Start typing a user's name..."
					value={query}
					onChange={handleInputChange}
					onFocus={onFocus}
					style={{ width: 300, fontSize }}
					autoComplete="off"
					disabled={disabled}
					startAdornment={<IconSearch size={fontSize + 2} />}
					endAdornment={
						query ? (
							searching ? (
								<Orbit size="30" speed="1.5" color={'var(--text-accent)'} />
							) : (
								<Button variant="icon" size="sm" color="neutral" onClick={handleClearInput}>
									<IconX size={fontSize + 2} />
								</Button>
							)
						) : undefined
					}
				/>

				{showResults && (
					<div
						style={{
							position: 'absolute',
							top: '100%',
							left: 0,
							zIndex: 100000,
							maxHeight: 300,
							overflowY: 'auto',
							width: 300,
							marginTop: 5,
							border: '1px solid var(--border)',
							borderRadius: 8,
							boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
							backgroundColor: 'var(--bg-white)',
						}}
					>
						{searching && (
							<div style={{ width: 300, padding: '8px 16px', opacity: 0.6 }}>
								<span style={{ fontSize, fontStyle: 'italic' }}>Searching...</span>
							</div>
						)}
						{!searching && results.length === 0 && (
							<div style={{ width: 300, padding: '8px 16px', opacity: 0.6 }}>
								<span style={{ fontSize, fontStyle: 'italic' }}>No users found</span>
							</div>
						)}
						{!searching &&
							results.length > 0 &&
							results.map((u, i) => (
								<div
									key={i}
									onClick={() => {
										setSelectedUser(u);
										onClose();
									}}
									style={{
										padding: '8px 16px',
										cursor: 'pointer',
										backgroundColor:
											selectedUser?.email === u.email ? 'var(--bg-tertiary)' : undefined,
									}}
									onMouseEnter={(e) => {
										(e.currentTarget as HTMLDivElement).style.backgroundColor =
											'var(--bg-secondary)';
									}}
									onMouseLeave={(e) => {
										(e.currentTarget as HTMLDivElement).style.backgroundColor =
											selectedUser?.email === u.email ? 'var(--bg-tertiary)' : '';
									}}
								>
									<StackedRow
										primary={`${u.first} ${u.last}`}
										secondary={u.email}
										fontSize={fontSize}
									/>
								</div>
							))}
					</div>
				)}
			</span>
		</div>
	);
}
