'use client';
import React, { useState, useRef, useEffect } from 'react';
import useDebounce from '@/lib/utils/useDebounce';
import { Claim } from '@/types/types';
import { ClaimSearch } from '@/config/enums';
import ClaimMenuItem from './ClaimMenuItem';
import { useChecklistsStore } from '@/stores/useChecklistsStore';
import { Orbit } from 'ldrs/react';
import 'ldrs/react/Orbit.css';
import { trpc } from '@/lib/trpc';
import { IconSearch, IconUserSearch, IconX } from '@tabler/icons-react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';

interface ClaimsSearchProps {
	showIcon?: boolean;
	heroMode?: boolean;
	onClaimSelect?: (claimId: string) => void;
}

export default function ClaimsSearch({ showIcon = true, heroMode = false, onClaimSelect }: ClaimsSearchProps) {
	const trpcUtils = trpc.useUtils();
	const selectedClaim = useChecklistsStore((state) => state.selectedClaim);
	const [query, setQuery] = useState<string>('');
	const [type, setType] = useState<ClaimSearch>(ClaimSearch.CLAIM_NUMBER);
	const [searching, setSearching] = useState(false);
	const [results, setResults] = useState<Claim[]>([]);
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
		trpcUtils.claim.getClaims
			.fetch({ searchTerm: { type, value: query }, limit: 50 })
			.then((results) => {
				if (Array.isArray(results.rows)) setResults(results.rows);
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
			setResults([]);
		}
	};

	const handleClearInput = () => {
		setQuery('');
		setResults([]);
	};

	const handleSwitchSearch = () => {
		setType(type === ClaimSearch.CLAIM_NUMBER ? ClaimSearch.INSURED : ClaimSearch.CLAIM_NUMBER);
		handleClearInput();
		setResults([]);
	};

	return (
		<div style={{ width: '100%' }} className="flex-col-center">
			<span ref={containerRef} style={{ width: '100%', position: 'relative' }}>
				<Input
					placeholder={`Start typing a ${type === 'claim_number' ? 'claim number' : 'name'}...`}
					fullWidth
					value={query}
					onChange={handleInputChange}
					onFocus={onFocus}
					inputSize={heroMode ? 'lg' : 'md'}
					autoComplete="off"
					startAdornment={showIcon ? <IconSearch size={20} /> : undefined}
					endAdornment={
						searching ? (
							<Orbit size="30" speed="1.5" color={'var(--text-accent)'} />
						) : query ? (
							<Button variant="icon" size="sm" color="neutral" onClick={handleClearInput}>
								<IconX size={15} />
							</Button>
						) : (
							<Tooltip content="type === ClaimSearch.CLAIM_NUMBER
											? 'Search by insured'
											: 'Search by claim number'">
							<Button variant="icon" size="sm" color="neutral">
							type === ClaimSearch.CLAIM_NUMBER ? (
										<IconUserSearch size={16} />
									) : (
										<IconSearch size={16} />
									)
						</Button>
						</Tooltip>
						)
					}
				/>

				{showResults && (
					<div
						style={{
							position: 'absolute',
							top: '100%',
							left: 0,
							right: 0,
							zIndex: 100,
							maxHeight: 400,
							overflowY: 'auto',
							marginTop: 4,
							backgroundColor: 'var(--bg-white)',
							border: '1px solid var(--border)',
							borderRadius: 8,
							boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
						}}
					>
						{searching && (
							<div style={{ minHeight: 80, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
								<span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>
									Searching...
								</span>
							</div>
						)}
						{!searching && results.length === 0 && !selectedClaim && (
							<div style={{ minHeight: 80, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
								<span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>
									No claims found
								</span>
							</div>
						)}
						{!searching && results.length === 0 && !!selectedClaim && (
							<ClaimMenuItem
								claim={selectedClaim}
								onClose={() => {
									onClose();
									setQuery('');
									setResults([]);
								}}
								onSelect={onClaimSelect}
								selected={true}
							/>
						)}
						{!searching &&
							results.length > 0 &&
							results.map((c, i) => (
								<ClaimMenuItem
									key={i}
									claim={c}
									onClose={() => {
										onClose();
										setQuery('');
										setResults([]);
									}}
									onSelect={onClaimSelect}
									selected={selectedClaim?.id === c.id}
								/>
							))}
					</div>
				)}
			</span>
		</div>
	);
}
