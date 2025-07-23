import React, { useCallback, useState } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
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
	width = 300,
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
	width?: number;
}) {
	const [searching, setSearching] = useState(false);
	const [results, setResults] = useState<T[]>([]);

	const debouncedSearch = useCallback(
		useDebounce(async (query: string) => {
			onSearch({ searchTerm: query })
				.then((results) => {
					if (Array.isArray(results)) setResults(results);
				})
				.catch((e) => console.error(e))
				.finally(() => setSearching(false));
		}, 500),
		[]
	);

	return (
		<Autocomplete
			multiple
			freeSolo
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
					placeholder={placeholder}
					sx={styles.textFieldOverrides}
				/>
			)}
			renderOption={(props, option) => (
				<li {...props} key={renderOption(option)}>
					{renderOption(option)}
				</li>
			)}
			sx={{ width }}
		/>
	);
}

const styles = {
	textFieldOverrides: {
		'& .MuiInputBase-root': {
			padding: '3px 5px',
		},
		'& .MuiOutlinedInput-input': {
			padding: '3px 5px',
		},
	},
};
