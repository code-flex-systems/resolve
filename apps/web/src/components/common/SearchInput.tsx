'use client';

import Input from '@/components/ui/Input';
import { IconSearch, IconX } from '@tabler/icons-react';
import css from './SearchInput.module.css';

export interface SearchInputProps {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	width?: number | string;
	size?: 'small' | 'medium';
	autoFocus?: boolean;
}

export default function SearchInput({
	value,
	onChange,
	placeholder = 'Search...',
	width = 240,
	size = 'small',
	autoFocus = false,
}: SearchInputProps) {
	return (
		<div style={{ width }}>
			<Input
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
				autoFocus={autoFocus}
				style={{
					padding: size === 'small' ? '8px 12px' : '12px 14px',
					fontSize: 13,
				}}
				startAdornment={<IconSearch size={18} className={css.searchIcon} />}
				endAdornment={
					value ? (
						<button
							type="button"
							className={css.clearButton}
							onClick={() => onChange('')}
						>
							<IconX size={16} />
						</button>
					) : undefined
				}
				fullWidth
			/>
		</div>
	);
}
