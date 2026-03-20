'use client';

import React, { useState } from 'react';
import Combobox, { type ComboboxOption } from '@/components/ui/Combobox';
import useDebounce from '@/lib/utils/useDebounce';

export default function BasicAutocomplete<T>({
	currentSelected,
	entity,
	label,
	onSearch,
	onSelect,
	placeholder,
	renderOption,
	renderOptionLabel,
	renderSelection,
	variant = 'standard',
	freeSolo = true,
	width = 300,
	fontSize = 15,
}: {
	currentSelected: T[];
	entity?: string;
	label?: string;
	onSearch: (input: { searchTerm?: string }) => Promise<T[]>;
	onSelect: (newSelection: (string | T)[]) => void;
	placeholder?: string;
	renderOption: (option: string | T) => string;
	renderOptionLabel: (option: string | T) => string;
	renderSelection: (selection: string | T) => string;
	variant?: string;
	freeSolo?: boolean;
	width?: number;
	fontSize?: number;
}) {
	const [searching, setSearching] = useState(false);
	const [results, setResults] = useState<T[]>([]);

	const debouncedSearch = useDebounce(async (query: string) => {
		onSearch({ searchTerm: query })
			.then((results) => {
				if (Array.isArray(results)) setResults(results);
			})
			.catch((e) => console.error(e))
			.finally(() => setSearching(false));
	}, 500);

	// Map results to ComboboxOption
	const options: ComboboxOption[] = results.map((r, i) => ({
		value: renderOptionLabel(r),
		label: renderOption(r),
	}));

	// Map currentSelected to ComboboxOption[]
	const selectedOptions: ComboboxOption[] = currentSelected.map((s) => ({
		value: renderOptionLabel(s),
		label: renderSelection(s),
	}));

	return (
		<div style={{ width }}>
			<Combobox
				multiple
				freeSolo={freeSolo}
				options={options}
				values={selectedOptions}
				onChangeMultiple={(opts) => {
					// Map back to original objects or strings
					const newSelection = opts.map((opt) => {
						// Try to find the original object in results
						const original = results.find((r) => renderOptionLabel(r) === opt.value);
						if (original) return original;
						// Try to find in currentSelected
						const existing = currentSelected.find((s) => renderOptionLabel(s) === opt.value);
						if (existing) return existing;
						// FreeSolo typed value
						return String(opt.value);
					});
					onSelect(newSelection as (string | T)[]);
				}}
				onInputChange={(value) => {
					if (value) {
						setSearching(true);
						debouncedSearch(value);
					}
				}}
				loading={searching}
				filterDisabled
				label={label}
				placeholder={currentSelected?.length ? undefined : placeholder}
				fullWidth
			/>
		</div>
	);
}
