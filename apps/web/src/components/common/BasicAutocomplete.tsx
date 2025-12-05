'use client';

import React, { useState } from 'react';
import Autocomplete, { autocompleteClasses } from '@mui/material/Autocomplete';
import TextField, { TextFieldProps } from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
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
	variant?: TextFieldProps['variant'];
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

	return (
		<Autocomplete
			multiple
			freeSolo={freeSolo}
			options={results}
			getOptionLabel={renderOptionLabel}
			loading={searching}
			filterOptions={(x) => x}
			value={currentSelected}
			onInputChange={(_, value) => {
				if (value) {
					setSearching(true);
					debouncedSearch(value);
				}
			}}
			onChange={(_, newValue) => onSelect(newValue)}
			renderTags={(tagValue, getTagProps) =>
				tagValue.map((option, index) => (
					<Chip label={renderSelection(option)} {...getTagProps({ index })} key={index} sx={{ height: 25 }} />
				))
			}
			renderInput={(params) => (
				<TextField
					{...params}
					variant={variant}
					label={label}
					placeholder={currentSelected?.length ? undefined : placeholder}
					sx={styles.textFieldOverrides}
				/>
			)}
			renderOption={(props, option) => (
				<li {...props} key={renderOption(option)}>
					{renderOption(option)}
				</li>
			)}
			sx={styles.autocompleteOverrides(width, fontSize)}
		/>
	);
}

const styles = {
	autocompleteOverrides: (width: string | number, fontSize: number) => ({
		width,
		'& .MuiOutlinedInput-root': {
			fontSize,
			padding: 0,
		},
	}),
	textFieldOverrides: {
		'& .MuiInputBase-root': {
			padding: '3px 5px',
		},
		'& .MuiOutlinedInput-input': {
			padding: '3px 5px',
		},
	},
};
