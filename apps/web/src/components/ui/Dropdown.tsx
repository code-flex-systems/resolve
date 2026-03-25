'use client';

import { forwardRef, useState, useRef, useEffect, useCallback, useImperativeHandle, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { IconChevronDown } from '@tabler/icons-react';
import { getPortalTarget } from './usePortalTarget';
import styles from './Dropdown.module.css';

/* =========================================================================
   TYPES
   ========================================================================= */

export interface DropdownOption {
	value: string | number;
	label: string;
	icon?: ReactNode;
	description?: string;
	disabled?: boolean;
}

export interface DropdownProps {
	/** Options to display in the menu */
	options: DropdownOption[];
	/** Current value (controlled) */
	value?: string | number | null;
	/** Change handler — receives the option value */
	onChange?: (value: string | number) => void;
	/** Label above the dropdown (form mode) */
	label?: string;
	/** Show label inline in the trigger display instead of above (filter/standalone mode) */
	inlineLabel?: boolean;
	/** Helper text below */
	helperText?: string;
	/** Error state */
	error?: boolean;
	/** Error message */
	errorText?: string;
	/** Placeholder text when no value selected */
	placeholder?: string;
	/** Custom render for the selected value display */
	renderValue?: (value: string | number, option: DropdownOption | undefined) => ReactNode;
	/** Whether to show placeholder when value is empty */
	displayEmpty?: boolean;
	/** Full width */
	fullWidth?: boolean;
	/** Disabled state */
	disabled?: boolean;
	/** Required field */
	required?: boolean;
	/** Size variant */
	size?: 'sm' | 'md';
	/** Additional class name */
	className?: string;
	/** Name attribute for form submission */
	name?: string;
}

/* =========================================================================
   DROPDOWN COMPONENT
   ========================================================================= */

export interface DropdownRef {
	focus: () => void;
	blur: () => void;
}

const Dropdown = forwardRef<DropdownRef, DropdownProps>(
	(
		{
			options,
			value,
			onChange,
			label,
			inlineLabel = false,
			helperText,
			error,
			errorText,
			placeholder = 'Select...',
			renderValue,
			displayEmpty = true,
			fullWidth,
			disabled,
			required,
			size = 'sm',
			className,
			name,
		},
		ref
	) => {
		const [open, setOpen] = useState(false);
		const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; width: number } | null>(null);
		const triggerRef = useRef<HTMLButtonElement>(null);
		const menuRef = useRef<HTMLDivElement>(null);
		const [highlightedIndex, setHighlightedIndex] = useState(-1);

		useImperativeHandle(ref, () => ({
			focus: () => triggerRef.current?.focus(),
			blur: () => triggerRef.current?.blur(),
		}));

		// Position the menu below the trigger
		const updatePosition = useCallback(() => {
			if (!triggerRef.current) return;
			const rect = triggerRef.current.getBoundingClientRect();
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
			// Highlight current value
			const idx = options.findIndex((o) => o.value === value);
			setHighlightedIndex(idx >= 0 ? idx : 0);
		}, [disabled, updatePosition, options, value]);

		const closeMenu = useCallback(() => {
			setOpen(false);
			setHighlightedIndex(-1);
		}, []);

		const selectOption = useCallback(
			(option: DropdownOption) => {
				if (option.disabled) return;
				onChange?.(option.value);
				closeMenu();
				triggerRef.current?.focus();
			},
			[onChange, closeMenu]
		);

		// Click outside to close
		useEffect(() => {
			if (!open) return;
			const handleClickOutside = (e: MouseEvent) => {
				if (triggerRef.current?.contains(e.target as Node) || menuRef.current?.contains(e.target as Node)) {
					return;
				}
				closeMenu();
			};
			document.addEventListener('mousedown', handleClickOutside);
			return () => document.removeEventListener('mousedown', handleClickOutside);
		}, [open, closeMenu]);

		// Reposition on scroll/resize
		useEffect(() => {
			if (!open) return;
			const handleReposition = () => updatePosition();
			window.addEventListener('scroll', handleReposition, true);
			window.addEventListener('resize', handleReposition);
			return () => {
				window.removeEventListener('scroll', handleReposition, true);
				window.removeEventListener('resize', handleReposition);
			};
		}, [open, updatePosition]);

		// Keyboard navigation
		const handleKeyDown = useCallback(
			(e: React.KeyboardEvent) => {
				if (!open) {
					if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
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
							while (next < options.length && options[next].disabled) next++;
							return next < options.length ? next : prev;
						});
						break;
					case 'ArrowUp':
						e.preventDefault();
						setHighlightedIndex((prev) => {
							let next = prev - 1;
							while (next >= 0 && options[next].disabled) next--;
							return next >= 0 ? next : prev;
						});
						break;
					case 'Enter':
					case ' ':
						e.preventDefault();
						if (highlightedIndex >= 0 && highlightedIndex < options.length) {
							selectOption(options[highlightedIndex]);
						}
						break;
					case 'Escape':
						e.preventDefault();
						closeMenu();
						triggerRef.current?.focus();
						break;
					case 'Tab':
						closeMenu();
						break;
				}
			},
			[open, openMenu, closeMenu, selectOption, highlightedIndex, options]
		);

		// Resolve display content
		const selectedOption = options.find((o) => o.value === value);
		const hasValue = value !== undefined && value !== null && value !== '';

		let displayContent: ReactNode;
		if (renderValue && hasValue) {
			displayContent = renderValue(value!, selectedOption);
		} else if (selectedOption) {
			displayContent = (
				<span className={styles.selectedContent}>
					{selectedOption.icon && <span className={styles.selectedIcon}>{selectedOption.icon}</span>}
					<span>
						{inlineLabel && label ? `${label}: ` : ''}
						{selectedOption.label}
					</span>
				</span>
			);
		} else if (displayEmpty || !hasValue) {
			displayContent = <span className={styles.placeholder}>{inlineLabel && label ? label : placeholder}</span>;
		}

		const wrapperClassNames = [styles.wrapper, fullWidth && styles.fullWidth, className].filter(Boolean).join(' ');

		const triggerClassNames = [
			styles.trigger,
			styles[`size-${size}`],
			open && styles.open,
			error && styles.error,
			disabled && styles.disabled,
		]
			.filter(Boolean)
			.join(' ');

		return (
			<div className={wrapperClassNames}>
				{label && !inlineLabel && (
					<label className={styles.label}>
						{label}
						{required && <span className={styles.required}> *</span>}
					</label>
				)}

				{/* Hidden input for form submission / react-hook-form */}
				{name && <input type="hidden" name={name} value={value ?? ''} />}

				<button
					ref={triggerRef}
					type="button"
					className={triggerClassNames}
					onClick={() => (open ? closeMenu() : openMenu())}
					onKeyDown={handleKeyDown}
					disabled={disabled}
					aria-haspopup="listbox"
					aria-expanded={open}
				>
					<span className={styles.triggerContent}>{displayContent}</span>
					<IconChevronDown
						size={16}
						stroke={1.5}
						className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}
					/>
				</button>

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
								minWidth: menuPosition.width,
							}}
							role="listbox"
						>
							{options.map((option, index) => {
								const optionClassNames = [
									styles.option,
									option.value === value && styles.selected,
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
										aria-selected={option.value === value}
										aria-disabled={option.disabled}
										onClick={() => selectOption(option)}
										onMouseEnter={() => !option.disabled && setHighlightedIndex(index)}
									>
										{option.icon && <span className={styles.optionIcon}>{option.icon}</span>}
										<span className={styles.optionContent}>
											<span className={styles.optionLabel}>{option.label}</span>
											{option.description && (
												<span className={styles.optionDescription}>{option.description}</span>
											)}
										</span>
									</div>
								);
							})}
							{options.length === 0 && <div className={styles.emptyState}>No options</div>}
						</div>,
						getPortalTarget(triggerRef)
					)}
			</div>
		);
	}
);

Dropdown.displayName = 'Dropdown';
export default Dropdown;
