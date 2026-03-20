'use client';

import {
	useState,
	useRef,
	useEffect,
	useCallback,
	useMemo,
	type ReactNode,
	type KeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { IconX, IconLoader2, IconSearch } from '@tabler/icons-react';
import { getPortalTarget } from './usePortalTarget';
import styles from './Combobox.module.css';

/* =========================================================================
   TYPES
   ========================================================================= */

export interface ComboboxOption {
	value: string | number;
	label: string;
	icon?: ReactNode;
	description?: string;
	disabled?: boolean;
}

export interface ComboboxProps<T extends ComboboxOption = ComboboxOption> {
	options: T[];

	// --- Single select ---
	value?: T | null;
	onChange?: (option: T | null) => void;

	// --- Multi select ---
	values?: T[];
	onChangeMultiple?: (options: T[]) => void;
	multiple?: boolean;

	// --- Search ---
	onInputChange?: (value: string) => void;
	loading?: boolean;
	/** Disable client-side filtering (for server-side search) */
	filterDisabled?: boolean;
	freeSolo?: boolean;

	// --- Labels ---
	label?: string;
	placeholder?: string;
	helperText?: string;
	error?: boolean;
	errorText?: string;
	noOptionsText?: string;

	// --- Rendering ---
	renderOption?: (option: T) => ReactNode;
	isOptionEqual?: (option: T, value: T) => boolean;

	// --- Layout ---
	fullWidth?: boolean;
	disabled?: boolean;
	required?: boolean;
	className?: string;
}

/* =========================================================================
   COMBOBOX
   ========================================================================= */

export default function Combobox<T extends ComboboxOption = ComboboxOption>({
	options,
	value,
	values,
	onChange,
	onChangeMultiple,
	multiple = false,
	onInputChange,
	loading = false,
	filterDisabled = false,
	freeSolo = false,
	label,
	placeholder = 'Search...',
	helperText,
	error,
	errorText,
	noOptionsText = 'No options',
	renderOption,
	isOptionEqual,
	fullWidth,
	disabled,
	required,
	className,
}: ComboboxProps<T>) {
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState('');
	const [highlightedIndex, setHighlightedIndex] = useState(-1);
	const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number } | null>(null);

	const wrapperRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const menuRef = useRef<HTMLDivElement>(null);

	const eq = useCallback(
		(a: T, b: T) => (isOptionEqual ? isOptionEqual(a, b) : a.value === b.value),
		[isOptionEqual]
	);

	// What the input displays: search text when open, selected label when closed
	const displayValue = useMemo(() => {
		if (open) return search;
		if (!multiple && value) return value.label;
		return '';
	}, [open, search, multiple, value]);

	// Filtered options
	const filtered = useMemo(() => {
		if (filterDisabled || !search) return options;
		const lower = search.toLowerCase();
		return options.filter(
			(o) => o.label.toLowerCase().includes(lower) || (o.description?.toLowerCase().includes(lower))
		);
	}, [options, search, filterDisabled]);

	const isSelected = useCallback(
		(opt: T) => {
			if (multiple && values) return values.some((v) => eq(v, opt));
			return value ? eq(opt, value) : false;
		},
		[multiple, values, value, eq]
	);

	const updatePos = useCallback(() => {
		if (!wrapperRef.current) return;
		const r = wrapperRef.current.getBoundingClientRect();
		setMenuPos({ top: r.bottom + 4, left: r.left, width: r.width });
	}, []);

	const openMenu = useCallback(() => {
		if (disabled) return;
		setSearch('');
		updatePos();
		setOpen(true);
		setHighlightedIndex(-1);
	}, [disabled, updatePos]);

	const closeMenu = useCallback(() => {
		setOpen(false);
		setSearch('');
		setHighlightedIndex(-1);
	}, []);

	const selectOption = useCallback(
		(opt: T) => {
			if (opt.disabled) return;
			if (multiple) {
				const cur = values ?? [];
				const exists = cur.some((v) => eq(v, opt));
				onChangeMultiple?.(exists ? cur.filter((v) => !eq(v, opt)) : [...cur, opt]);
				setSearch('');
				onInputChange?.('');
				inputRef.current?.focus();
			} else {
				onChange?.(opt);
				onInputChange?.('');
				closeMenu();
			}
		},
		[multiple, values, onChange, onChangeMultiple, eq, closeMenu, onInputChange]
	);

	const removeTag = useCallback(
		(opt: T) => {
			if (disabled) return;
			onChangeMultiple?.((values ?? []).filter((v) => !eq(v, opt)));
		},
		[disabled, values, onChangeMultiple, eq]
	);

	const clearValue = useCallback(() => {
		onChange?.(null);
		setSearch('');
		onInputChange?.('');
		inputRef.current?.focus();
	}, [onChange, onInputChange]);

	const handleInputChange = useCallback(
		(val: string) => {
			setSearch(val);
			onInputChange?.(val);
			if (!open) openMenu();
			setHighlightedIndex(-1);
		},
		[onInputChange, open, openMenu]
	);

	// Click outside
	useEffect(() => {
		if (!open) return;
		const handler = (e: MouseEvent) => {
			if (wrapperRef.current?.contains(e.target as Node) || menuRef.current?.contains(e.target as Node)) return;
			closeMenu();
		};
		document.addEventListener('mousedown', handler);
		return () => document.removeEventListener('mousedown', handler);
	}, [open, closeMenu]);

	// Reposition
	useEffect(() => {
		if (!open) return;
		const handler = () => updatePos();
		window.addEventListener('scroll', handler, true);
		window.addEventListener('resize', handler);
		return () => {
			window.removeEventListener('scroll', handler, true);
			window.removeEventListener('resize', handler);
		};
	}, [open, updatePos]);

	// Keyboard
	const handleKeyDown = useCallback(
		(e: KeyboardEvent<HTMLInputElement>) => {
			if (!open) {
				if (e.key === 'ArrowDown' || e.key === 'Enter') { e.preventDefault(); openMenu(); }
				return;
			}
			switch (e.key) {
				case 'ArrowDown':
					e.preventDefault();
					setHighlightedIndex((p) => {
						let n = p + 1;
						while (n < filtered.length && filtered[n].disabled) n++;
						return n < filtered.length ? n : p;
					});
					break;
				case 'ArrowUp':
					e.preventDefault();
					setHighlightedIndex((p) => {
						let n = p - 1;
						while (n >= 0 && filtered[n].disabled) n--;
						return n >= 0 ? n : p;
					});
					break;
				case 'Enter':
					e.preventDefault();
					if (highlightedIndex >= 0 && highlightedIndex < filtered.length) {
						selectOption(filtered[highlightedIndex]);
					} else if (freeSolo && search) {
						selectOption({ value: search, label: search } as T);
					}
					break;
				case 'Escape':
					e.preventDefault();
					closeMenu();
					break;
				case 'Backspace':
					if (multiple && !search && values && values.length > 0) removeTag(values[values.length - 1]);
					break;
			}
		},
		[open, openMenu, closeMenu, selectOption, highlightedIndex, filtered, freeSolo, search, multiple, values, removeTag]
	);

	const hasValue = multiple ? (values && values.length > 0) : !!value;

	const wrapperCls = [styles.wrapper, fullWidth && styles.fullWidth, className].filter(Boolean).join(' ');
	const inputCls = [styles.inputWrapper, open && styles.open, error && styles.error, disabled && styles.disabled].filter(Boolean).join(' ');

	return (
		<div className={wrapperCls} ref={wrapperRef}>
			{label && (
				<label className={styles.label}>
					{label}
					{required && <span className={styles.required}> *</span>}
				</label>
			)}

			<div className={inputCls} onClick={() => inputRef.current?.focus()}>
				<IconSearch size={15} stroke={1.5} className={styles.searchIcon} />

				{multiple && values && values.length > 0 && (
					<div className={styles.tags}>
						{values.map((v) => (
							<span key={String(v.value)} className={styles.tag}>
								<span className={styles.tagLabel}>{v.label}</span>
								<button type="button" className={styles.tagRemove} onClick={(e) => { e.stopPropagation(); removeTag(v); }} tabIndex={-1}>
									<IconX size={12} stroke={2} />
								</button>
							</span>
						))}
					</div>
				)}

				<input
					ref={inputRef}
					className={styles.input}
					value={displayValue}
					onChange={(e) => handleInputChange(e.target.value)}
					onFocus={openMenu}
					onKeyDown={handleKeyDown}
					placeholder={hasValue && !multiple ? '' : placeholder}
					disabled={disabled}
					autoComplete="off"
				/>

				<div className={styles.controls}>
					{loading && <IconLoader2 size={16} stroke={1.5} className={styles.spinner} />}
					{!loading && hasValue && !disabled && !multiple && (
						<button type="button" className={styles.clearButton} onClick={clearValue} tabIndex={-1}>
							<IconX size={14} stroke={1.5} />
						</button>
					)}
				</div>
			</div>

			{error && errorText ? (
				<span className={styles.errorText}>{errorText}</span>
			) : helperText ? (
				<span className={styles.helperText}>{helperText}</span>
			) : null}

			{open && menuPos && createPortal(
				<div ref={menuRef} className={styles.menu} style={{ top: menuPos.top, left: menuPos.left, width: menuPos.width }} role="listbox">
					{filtered.length === 0 && !loading && <div className={styles.emptyState}>{noOptionsText}</div>}
					{loading && filtered.length === 0 && <div className={styles.emptyState}>Loading...</div>}
					{filtered.map((opt, i) => {
						const sel = isSelected(opt);
						const cls = [styles.option, sel && styles.selected, opt.disabled && styles.optionDisabled, i === highlightedIndex && styles.highlighted].filter(Boolean).join(' ');
						return (
							<div key={String(opt.value)} className={cls} role="option" aria-selected={sel} onClick={() => selectOption(opt)} onMouseEnter={() => !opt.disabled && setHighlightedIndex(i)}>
								{renderOption ? renderOption(opt) : (
									<>
										{opt.icon && <span className={styles.optionIcon}>{opt.icon}</span>}
										<span className={styles.optionContent}>
											<span className={styles.optionLabel}>{opt.label}</span>
											{opt.description && <span className={styles.optionDescription}>{opt.description}</span>}
										</span>
									</>
								)}
								{multiple && sel && <span className={styles.checkmark}>✓</span>}
							</div>
						);
					})}
				</div>,
				getPortalTarget(wrapperRef)
			)}
		</div>
	);
}
