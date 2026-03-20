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
import { IconChevronDown, IconX, IconLoader2 } from '@tabler/icons-react';
import styles from './Combobox.module.css';

/* =========================================================================
   TYPES
   ========================================================================= */

export interface ComboboxOption {
	/** Unique value for this option */
	value: string | number;
	/** Display label (used for filtering and display) */
	label: string;
	/** Optional icon */
	icon?: ReactNode;
	/** Optional secondary text */
	description?: string;
	/** Disable this option */
	disabled?: boolean;
}

export interface ComboboxProps<T extends ComboboxOption = ComboboxOption> {
	// --- Value ---
	options: T[];
	/** Single value (when multiple=false) */
	value?: T | null;
	/** Multiple values (when multiple=true) */
	values?: T[];
	/** Change handler for single select */
	onChange?: (option: T | null) => void;
	/** Change handler for multi select */
	onChangeMultiple?: (options: T[]) => void;
	/** Enable multi-select mode */
	multiple?: boolean;

	// --- Search ---
	/** Controlled input value for async search */
	inputValue?: string;
	/** Called when the user types in the search field */
	onInputChange?: (value: string) => void;
	/** Show loading spinner */
	loading?: boolean;
	/** Disable client-side filtering (for server-side search) */
	filterDisabled?: boolean;
	/** Allow typing values not in the options list */
	freeSolo?: boolean;

	// --- Labels ---
	label?: string;
	placeholder?: string;
	helperText?: string;
	error?: boolean;
	errorText?: string;
	noOptionsText?: string;

	// --- Rendering ---
	/** Custom option renderer */
	renderOption?: (option: T) => ReactNode;
	/** Custom equality check (default: compares .value) */
	isOptionEqual?: (option: T, value: T) => boolean;

	// --- Layout ---
	fullWidth?: boolean;
	disabled?: boolean;
	required?: boolean;
	size?: 'sm' | 'md';
	className?: string;
}

/* =========================================================================
   COMBOBOX COMPONENT
   ========================================================================= */

export default function Combobox<T extends ComboboxOption = ComboboxOption>({
	options,
	value,
	values,
	onChange,
	onChangeMultiple,
	multiple = false,
	inputValue: controlledInputValue,
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
	size = 'sm',
	className,
}: ComboboxProps<T>) {
	const [open, setOpen] = useState(false);
	const [internalInputValue, setInternalInputValue] = useState('');
	const [highlightedIndex, setHighlightedIndex] = useState(-1);
	const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; width: number } | null>(null);

	const wrapperRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const menuRef = useRef<HTMLDivElement>(null);

	const searchValue = controlledInputValue ?? internalInputValue;

	const optionEquals = useCallback(
		(a: T, b: T) => (isOptionEqual ? isOptionEqual(a, b) : a.value === b.value),
		[isOptionEqual]
	);

	// Filter options (client-side unless disabled)
	const filteredOptions = useMemo(() => {
		if (filterDisabled || !searchValue) return options;
		const lower = searchValue.toLowerCase();
		return options.filter(
			(o) =>
				o.label.toLowerCase().includes(lower) ||
				(o.description && o.description.toLowerCase().includes(lower))
		);
	}, [options, searchValue, filterDisabled]);

	// Check if an option is selected
	const isSelected = useCallback(
		(option: T) => {
			if (multiple && values) {
				return values.some((v) => optionEquals(v, option));
			}
			return value ? optionEquals(option, value) : false;
		},
		[multiple, values, value, optionEquals]
	);

	// Position menu
	const updatePosition = useCallback(() => {
		if (!wrapperRef.current) return;
		const rect = wrapperRef.current.getBoundingClientRect();
		setMenuPosition({
			top: rect.bottom + 4,
			left: rect.left,
			width: rect.width,
		});
	}, []);

	const openMenu = useCallback(() => {
		if (disabled) return;
		updatePosition();
		setOpen(true);
		setHighlightedIndex(-1);
	}, [disabled, updatePosition]);

	const closeMenu = useCallback(() => {
		setOpen(false);
		setHighlightedIndex(-1);
	}, []);

	// Select an option
	const selectOption = useCallback(
		(option: T) => {
			if (option.disabled) return;

			if (multiple) {
				const currentValues = values ?? [];
				const exists = currentValues.some((v) => optionEquals(v, option));
				const newValues = exists
					? currentValues.filter((v) => !optionEquals(v, option))
					: [...currentValues, option];
				onChangeMultiple?.(newValues);
				// Keep menu open for multi-select, clear input
				setInternalInputValue('');
				onInputChange?.('');
				inputRef.current?.focus();
			} else {
				onChange?.(option);
				setInternalInputValue(option.label);
				onInputChange?.(option.label);
				closeMenu();
			}
		},
		[multiple, values, onChange, onChangeMultiple, optionEquals, closeMenu, onInputChange]
	);

	// Remove a tag in multi-select
	const removeTag = useCallback(
		(option: T) => {
			if (disabled) return;
			const currentValues = values ?? [];
			onChangeMultiple?.(currentValues.filter((v) => !optionEquals(v, option)));
		},
		[disabled, values, onChangeMultiple, optionEquals]
	);

	// Clear single value
	const clearValue = useCallback(() => {
		onChange?.(null);
		setInternalInputValue('');
		onInputChange?.('');
		inputRef.current?.focus();
	}, [onChange, onInputChange]);

	// Handle input change
	const handleInputChange = useCallback(
		(val: string) => {
			setInternalInputValue(val);
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
			if (
				wrapperRef.current?.contains(e.target as Node) ||
				menuRef.current?.contains(e.target as Node)
			) {
				return;
			}
			closeMenu();
			// For freeSolo single, keep the typed value
			if (!multiple && !freeSolo && !value) {
				setInternalInputValue('');
				onInputChange?.('');
			}
		};
		document.addEventListener('mousedown', handler);
		return () => document.removeEventListener('mousedown', handler);
	}, [open, closeMenu, multiple, freeSolo, value, onInputChange]);

	// Reposition on scroll/resize
	useEffect(() => {
		if (!open) return;
		const handler = () => updatePosition();
		window.addEventListener('scroll', handler, true);
		window.addEventListener('resize', handler);
		return () => {
			window.removeEventListener('scroll', handler, true);
			window.removeEventListener('resize', handler);
		};
	}, [open, updatePosition]);

	// Keyboard navigation
	const handleKeyDown = useCallback(
		(e: KeyboardEvent<HTMLInputElement>) => {
			if (!open) {
				if (e.key === 'ArrowDown' || e.key === 'Enter') {
					e.preventDefault();
					openMenu();
				}
				return;
			}

			switch (e.key) {
				case 'ArrowDown':
					e.preventDefault();
					setHighlightedIndex((prev) => {
						let next = prev + 1;
						while (next < filteredOptions.length && filteredOptions[next].disabled) next++;
						return next < filteredOptions.length ? next : prev;
					});
					break;
				case 'ArrowUp':
					e.preventDefault();
					setHighlightedIndex((prev) => {
						let next = prev - 1;
						while (next >= 0 && filteredOptions[next].disabled) next--;
						return next >= 0 ? next : prev;
					});
					break;
				case 'Enter':
					e.preventDefault();
					if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
						selectOption(filteredOptions[highlightedIndex]);
					} else if (freeSolo && searchValue) {
						// FreeSolo: create option from typed text
						const freeOption = { value: searchValue, label: searchValue } as T;
						selectOption(freeOption);
					}
					break;
				case 'Escape':
					e.preventDefault();
					closeMenu();
					break;
				case 'Backspace':
					if (multiple && !searchValue && values && values.length > 0) {
						// Remove last tag
						removeTag(values[values.length - 1]);
					}
					break;
			}
		},
		[open, openMenu, closeMenu, selectOption, highlightedIndex, filteredOptions, freeSolo, searchValue, multiple, values, removeTag]
	);

	// Sync input with value for single select
	useEffect(() => {
		if (!multiple && value && !open) {
			setInternalInputValue(value.label);
		}
	}, [multiple, value, open]);

	const wrapperClassNames = [styles.wrapper, fullWidth && styles.fullWidth, className]
		.filter(Boolean)
		.join(' ');

	const inputWrapperClassNames = [
		styles.inputWrapper,
		styles[`size-${size}`],
		open && styles.open,
		error && styles.error,
		disabled && styles.disabled,
	]
		.filter(Boolean)
		.join(' ');

	const hasValue = multiple ? (values && values.length > 0) : !!value;

	return (
		<div className={wrapperClassNames} ref={wrapperRef}>
			{label && (
				<label className={styles.label}>
					{label}
					{required && <span className={styles.required}> *</span>}
				</label>
			)}

			<div className={inputWrapperClassNames} onClick={() => inputRef.current?.focus()}>
				{/* Multi-select tags */}
				{multiple && values && values.length > 0 && (
					<div className={styles.tags}>
						{values.map((v) => (
							<span key={String(v.value)} className={styles.tag}>
								<span className={styles.tagLabel}>{v.label}</span>
								<button
									type="button"
									className={styles.tagRemove}
									onClick={(e) => { e.stopPropagation(); removeTag(v); }}
									tabIndex={-1}
								>
									<IconX size={12} stroke={2} />
								</button>
							</span>
						))}
					</div>
				)}

				<input
					ref={inputRef}
					className={styles.input}
					value={searchValue}
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
					<IconChevronDown
						size={16}
						stroke={1.5}
						className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}
					/>
				</div>
			</div>

			{error && errorText ? (
				<span className={styles.errorText}>{errorText}</span>
			) : helperText ? (
				<span className={styles.helperText}>{helperText}</span>
			) : null}

			{/* Menu portal */}
			{open &&
				menuPosition &&
				createPortal(
					<div
						ref={menuRef}
						className={styles.menu}
						style={{
							top: menuPosition.top,
							left: menuPosition.left,
							width: menuPosition.width,
						}}
						role="listbox"
					>
						{filteredOptions.length === 0 && !loading && (
							<div className={styles.emptyState}>{noOptionsText}</div>
						)}
						{loading && filteredOptions.length === 0 && (
							<div className={styles.emptyState}>Loading...</div>
						)}
						{filteredOptions.map((option, index) => {
							const selected = isSelected(option);
							const optionClassNames = [
								styles.option,
								selected && styles.selected,
								option.disabled && styles.optionDisabled,
								index === highlightedIndex && styles.highlighted,
							]
								.filter(Boolean)
								.join(' ');

							return (
								<div
									key={String(option.value)}
									className={optionClassNames}
									role="option"
									aria-selected={selected}
									aria-disabled={option.disabled}
									onClick={() => selectOption(option)}
									onMouseEnter={() => !option.disabled && setHighlightedIndex(index)}
								>
									{renderOption ? (
										renderOption(option)
									) : (
										<>
											{option.icon && <span className={styles.optionIcon}>{option.icon}</span>}
											<span className={styles.optionContent}>
												<span className={styles.optionLabel}>{option.label}</span>
												{option.description && (
													<span className={styles.optionDescription}>{option.description}</span>
												)}
											</span>
										</>
									)}
									{multiple && selected && (
										<span className={styles.checkmark}>✓</span>
									)}
								</div>
							);
						})}
					</div>,
					document.body
				)}
		</div>
	);
}
