import {
	Box,
	Chip,
	FormControl,
	InputLabel,
	MenuItem,
	Paper,
	PopperProps,
	Select,
	Skeleton,
	Tooltip,
	Typography,
} from '@mui/material';
import { useState } from 'react';
import BasicPopper from './BasicPopper';
import { BASE_COLOR_LIGHT } from '@/styles/theme';
import { trpc } from '@/lib/trpc';
import type { ReferenceEntity } from '@/schemas/referenceDataSchemas';
import CategoryIcon from '@mui/icons-material/Category';
import WarningAmber from '@mui/icons-material/WarningAmber';

interface ReferenceDataSelectProps {
	/**
	 * The reference entity type to load options for
	 */
	entity: ReferenceEntity;
	/**
	 * The currently selected value (snake_case key)
	 */
	value: string | null;
	/**
	 * Callback when selection changes
	 */
	onChange: (newValue: string | null) => void;
	/**
	 * Whether to show an emoji icon when available
	 */
	showIcon?: boolean;
	/**
	 * Allow clearing the selection
	 */
	clearable?: boolean;
	/**
	 * Custom height for the chip (only applies when isFilter=true)
	 */
	height?: number;
	/**
	 * Placeholder text when no value is selected
	 */
	placeholder?: string;
	/**
	 * Whether the select is disabled
	 */
	disabled?: boolean;
	/**
	 * Custom styles
	 */
	sx?: object;
	/**
	 * Display as a filter chip (true) or standard form dropdown (false)
	 * - Filter mode: Compact chip style, good for toolbars/filter bars
	 * - Form mode: Standard MUI Select, good for forms/dialogs
	 */
	isFilter?: boolean;
	/**
	 * Label for the select (only applies when isFilter=false)
	 */
	label?: string;
	/**
	 * Size of the select (only applies when isFilter=false)
	 */
	size?: 'small' | 'medium';
	/**
	 * Whether to take full width (only applies when isFilter=false)
	 */
	fullWidth?: boolean;
}

/**
 * Generic select component for reference data entities
 * Fetches options from the database and displays them in a dropdown
 *
 * Usage (filter mode - chip style for toolbars):
 * <ReferenceDataSelect
 *   entity="loss_type"
 *   value={lossType}
 *   onChange={setLossType}
 *   placeholder="Filter by loss type"
 *   isFilter={true}
 * />
 *
 * Usage (form mode - standard dropdown for forms):
 * <ReferenceDataSelect
 *   entity="loss_type"
 *   value={lossType}
 *   onChange={setLossType}
 *   label="Loss Type"
 *   isFilter={false}
 * />
 */
export default function ReferenceDataSelect({
	entity,
	value,
	onChange,
	showIcon = true,
	clearable = true,
	height,
	placeholder = 'Select...',
	disabled = false,
	sx,
	isFilter = true,
	label,
	size = 'small',
	fullWidth = true,
}: ReferenceDataSelectProps) {
	const [anchorEl, setAnchorEl] = useState<PopperProps['anchorEl']>();

	// Fetch options from database with aggressive caching
	const { data: options = [], isLoading } = trpc.referenceData.getReferenceOptions.useQuery(
		{ entity },
		{
			staleTime: 5 * 60 * 1000, // 5 minutes
			gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
		}
	);

	// Find the selected option for display
	const selectedOption = options.find((opt) => opt.value === value);
	const displayLabel = selectedOption?.display_label || placeholder;
	const displayIcon = selectedOption?.icon_emoji;

	// Standard form dropdown mode
	if (!isFilter) {
		if (isLoading) {
			return <Skeleton variant="rounded" width="100%" height={40} sx={sx} />;
		}

		return (
			<FormControl fullWidth={fullWidth} size={size} disabled={disabled} sx={sx}>
				{label && <InputLabel shrink>{label}</InputLabel>}
				<Select
					value={value || ''}
					onChange={(e) => {
						const newValue = e.target.value as string;
						onChange(newValue === '' ? null : newValue);
					}}
					label={label}
					notched={!!label}
					displayEmpty
					renderValue={(selected) => {
						if (!selected) {
							return <Typography color="text.secondary">{placeholder}</Typography>;
						}
						const option = options.find((o) => o.value === selected);
						if (!option) return selected;
						return (
							<Box display="flex" alignItems="center" gap={0.5}>
								{showIcon && option.icon_emoji && (
									<Typography component="span" fontSize={14}>
										{option.icon_emoji}
									</Typography>
								)}
								<Typography component="span">{option.display_label}</Typography>
							</Box>
						);
					}}
				>
					{clearable && (
						<MenuItem value="">
							<Typography color="text.secondary">None</Typography>
						</MenuItem>
					)}
					{options.map((option) => (
						<MenuItem key={option.value} value={option.value}>
							<Box display="flex" alignItems="center" gap={0.5}>
								{showIcon && option.icon_emoji && (
									<Typography fontSize={14}>{option.icon_emoji}</Typography>
								)}
								<Typography>{option.display_label}</Typography>
							</Box>
						</MenuItem>
					))}
				</Select>
			</FormControl>
		);
	}

	// Filter chip mode (original behavior)
	// Show skeleton while loading
	if (isLoading) {
		return <Skeleton variant="rounded" width={120} height={height || 32} sx={{ borderRadius: 9999, ...sx }} />;
	}

	return (
		<>
			<Chip
				label={displayLabel}
				icon={
					showIcon && displayIcon ? (
						<Box marginLeft="5px">
							<Typography fontSize={14}>{displayIcon}</Typography>
						</Box>
					) : (
						<CategoryIcon sx={{ color: value ? undefined : BASE_COLOR_LIGHT }} />
					)
				}
				onClick={(e) => {
					if (!disabled) {
						setAnchorEl(e.currentTarget);
						e.preventDefault();
						e.stopPropagation();
					}
				}}
				onDelete={value && clearable && !disabled ? () => onChange(null) : undefined}
				sx={{
					...styles.chip,
					height,
					'& .MuiChip-icon': {
						color: value ? undefined : BASE_COLOR_LIGHT,
					},
					...sx,
				}}
				disabled={disabled}
			/>
			{!!anchorEl && (
				<BasicPopper anchorEl={anchorEl} setAnchorEl={() => setAnchorEl(null)} placement="bottom-start">
					<Paper sx={styles.paper}>
						{options.length === 0 ? (
							<MenuItem disabled>
								<Typography fontSize={13} color="text.secondary">
									No options available
								</Typography>
							</MenuItem>
						) : (
							options.map((option) => (
								<MenuItem
									key={option.value}
									selected={value === option.value}
									value={option.value}
									onClick={() => {
										onChange(option.value);
										setAnchorEl(null);
									}}
								>
									<Box width="100%" display="flex" justifyContent="flex-start" alignItems="center">
										{showIcon && option.icon_emoji && (
											<Typography fontSize={14}>{option.icon_emoji}</Typography>
										)}
										<Typography
											fontSize={13}
											marginLeft={showIcon && option.icon_emoji ? '5px' : 0}
										>
											{option.display_label}
										</Typography>
									</Box>
								</MenuItem>
							))
						)}
					</Paper>
				</BasicPopper>
			)}
		</>
	);
}

const styles = {
	chip: {
		margin: '5px 0px',
	},
	paper: {
		mt: 0.625,
		minWidth: 220,
		maxHeight: 300,
		overflow: 'auto',
	},
};

/**
 * Convenience wrapper components for common entity types
 * These provide a simpler API for common use cases
 *
 * Use isFilter=true (default) for filter bars/toolbars (chip style)
 * Use isFilter=false for forms/dialogs (standard dropdown)
 */

interface CommonSelectProps {
	clearable?: boolean;
	height?: number;
	text?: string;
	disabled?: boolean;
	isFilter?: boolean;
	label?: string;
	sx?: object;
}

export function LossTypeSelect({
	lossType,
	setLossType,
	clearable = true,
	height,
	text = 'Filter by loss type',
	disabled = false,
	isFilter = true,
	label,
}: CommonSelectProps & {
	lossType: string | null;
	setLossType: (newType: string | null) => void;
}) {
	return (
		<ReferenceDataSelect
			entity="loss_type"
			value={lossType}
			onChange={setLossType}
			clearable={clearable}
			height={height}
			placeholder={text}
			disabled={disabled}
			isFilter={isFilter}
			label={label}
		/>
	);
}

export function LineOfBusinessSelect({
	lineOfBusiness,
	setLineOfBusiness,
	clearable = true,
	height,
	text = 'Filter by line of business',
	disabled = false,
	isFilter = true,
	label,
	sx,
}: CommonSelectProps & {
	lineOfBusiness: string | null;
	setLineOfBusiness: (newType: string | null) => void;
}) {
	return (
		<ReferenceDataSelect
			entity="line_of_business"
			value={lineOfBusiness}
			onChange={setLineOfBusiness}
			clearable={clearable}
			height={height}
			placeholder={text}
			disabled={disabled}
			isFilter={isFilter}
			label={label}
			sx={sx}
		/>
	);
}

export function ClaimSubstatusSelect({
	substatus,
	setSubstatus,
	clearable = true,
	height,
	text = 'Filter by substatus',
	disabled = false,
	isFilter = true,
	label,
	sx,
}: CommonSelectProps & {
	substatus: string | null;
	setSubstatus: (newType: string | null) => void;
}) {
	return (
		<ReferenceDataSelect
			entity="claim_substatus"
			value={substatus}
			onChange={setSubstatus}
			clearable={clearable}
			height={height}
			placeholder={text}
			disabled={disabled}
			isFilter={isFilter}
			label={label}
			sx={sx}
		/>
	);
}

// ClaimPartyRoleSelect was removed - use ClaimantPartyRoleSelect or AdversePartyRoleSelect instead

export function ClaimantPartyRoleSelect({
	role,
	setRole,
	clearable = true,
	height,
	text = 'Select role',
	disabled = false,
	isFilter = true,
	label,
}: CommonSelectProps & {
	role: string | null;
	setRole: (newRole: string | null) => void;
}) {
	return (
		<ReferenceDataSelect
			entity="claimant_party_role"
			value={role}
			onChange={setRole}
			clearable={clearable}
			height={height}
			placeholder={text}
			disabled={disabled}
			isFilter={isFilter}
			label={label}
		/>
	);
}

export function AdversePartyRoleSelect({
	role,
	setRole,
	clearable = true,
	height,
	text = 'Select role',
	disabled = false,
	isFilter = true,
	label,
}: CommonSelectProps & {
	role: string | null;
	setRole: (newRole: string | null) => void;
}) {
	return (
		<ReferenceDataSelect
			entity="adverse_party_role"
			value={role}
			onChange={setRole}
			clearable={clearable}
			height={height}
			placeholder={text}
			disabled={disabled}
			isFilter={isFilter}
			label={label}
		/>
	);
}

// ============================================================================
// REFERENCE DATA VALUE DISPLAY COMPONENT
// ============================================================================

interface ReferenceDataValueProps {
	/**
	 * The reference entity type
	 */
	entity: ReferenceEntity;
	/**
	 * The value to display (snake_case key)
	 */
	value: string | null | undefined;
	/**
	 * Whether to show the emoji icon (defaults to true)
	 */
	showEmoji?: boolean;
	/**
	 * Fallback text when value is null/undefined or not found
	 */
	fallback?: string;
	/**
	 * Font size for the label
	 */
	fontSize?: number;
	/**
	 * Custom styles
	 */
	sx?: object;
}

/**
 * Display component for reference data values
 * Looks up the display label for a given value, including deactivated options
 * Shows a warning indicator if the option has been deactivated
 *
 * Usage:
 * <ReferenceDataValue entity="loss_type" value={claim.loss_type} />
 */
export function ReferenceDataValue({
	entity,
	value,
	showEmoji = true,
	fallback = '—',
	fontSize = 13,
	sx,
}: ReferenceDataValueProps) {
	// Fetch the option including deactivated ones
	const { data: option, isLoading } = trpc.referenceData.getReferenceOption.useQuery(
		{ entity, value: value!, includeDeactivated: true },
		{
			enabled: !!value,
			staleTime: 5 * 60 * 1000, // 5 minutes
			gcTime: 10 * 60 * 1000, // 10 minutes
		}
	);

	// Handle null/undefined value
	if (!value) {
		return (
			<Typography fontSize={fontSize} color="text.secondary" sx={sx}>
				{fallback}
			</Typography>
		);
	}

	// Loading state - show skeleton matching label dimensions
	if (isLoading) {
		return <Skeleton variant="rounded" width={70} height={18} sx={{ display: 'inline-block', verticalAlign: 'middle', ...sx }} />;
	}

	// Option not found - show raw value
	if (!option) {
		return (
			<Typography fontSize={fontSize} color="text.secondary" sx={sx}>
				{value}
			</Typography>
		);
	}

	// Check if option is deactivated
	const isDeactivated = !!option.deleted_at;

	return (
		<Box display="flex" alignItems="center" gap={0.5} sx={sx}>
			{showEmoji && option.icon_emoji && <Typography fontSize={fontSize}>{option.icon_emoji}</Typography>}
			<Typography fontSize={fontSize}>{option.display_label}</Typography>
			{isDeactivated && (
				<Tooltip title="This option has been deactivated" arrow>
					<WarningAmber sx={{ fontSize: fontSize + 2, color: 'warning.main', ml: 0.5 }} />
				</Tooltip>
			)}
		</Box>
	);
}

/**
 * Convenience wrapper components for common entity types
 */

export function LossTypeValue({
	value,
	showEmoji = true,
	fallback,
	fontSize,
	sx,
}: Omit<ReferenceDataValueProps, 'entity'>) {
	return (
		<ReferenceDataValue
			entity="loss_type"
			value={value}
			showEmoji={showEmoji}
			fallback={fallback}
			fontSize={fontSize}
			sx={sx}
		/>
	);
}

export function LineOfBusinessValue({
	value,
	showEmoji = true,
	fallback,
	fontSize,
	sx,
}: Omit<ReferenceDataValueProps, 'entity'>) {
	return (
		<ReferenceDataValue
			entity="line_of_business"
			value={value}
			showEmoji={showEmoji}
			fallback={fallback}
			fontSize={fontSize}
			sx={sx}
		/>
	);
}

export function ClaimSubstatusValue({
	value,
	showEmoji = true,
	fallback,
	fontSize,
	sx,
}: Omit<ReferenceDataValueProps, 'entity'>) {
	return (
		<ReferenceDataValue
			entity="claim_substatus"
			value={value}
			showEmoji={showEmoji}
			fallback={fallback}
			fontSize={fontSize}
			sx={sx}
		/>
	);
}

// ClaimPartyRoleValue was removed - use ClaimantPartyRoleValue or AdversePartyRoleValue instead

// ============================================================================
// REFERENCE DATA CHIP COMPONENT
// ============================================================================

interface ReferenceDataChipProps {
	/**
	 * The reference entity type
	 */
	entity: ReferenceEntity;
	/**
	 * The value to display (snake_case key)
	 */
	value: string | null | undefined;
	/**
	 * Whether to show the emoji icon (defaults to true)
	 */
	showEmoji?: boolean;
	/**
	 * Chip size
	 */
	size?: 'small' | 'medium';
	/**
	 * Chip color
	 */
	color?: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
	/**
	 * Chip variant
	 */
	variant?: 'filled' | 'outlined';
	/**
	 * Font size for the label
	 */
	fontSize?: number;
	/**
	 * Custom styles for the chip
	 */
	sx?: object;
}

/**
 * Chip component for reference data values that shows a skeleton when loading
 * Use this instead of wrapping ReferenceDataValue in a Chip manually
 */
export function ReferenceDataChip({
	entity,
	value,
	showEmoji = true,
	size = 'small',
	color = 'default',
	variant = 'outlined',
	fontSize = 12,
	sx,
}: ReferenceDataChipProps) {
	const { data: option, isLoading } = trpc.referenceData.getReferenceOption.useQuery(
		{ entity, value: value!, includeDeactivated: true },
		{
			enabled: !!value,
			staleTime: 5 * 60 * 1000,
			gcTime: 10 * 60 * 1000,
		}
	);

	// Show skeleton while loading
	if (isLoading || !value) {
		if (!value) return null;
		return (
			<Skeleton
				variant="rounded"
				width={80}
				height={size === 'small' ? 26 : 32}
				sx={{ borderRadius: 9999, ...sx }}
			/>
		);
	}

	const displayLabel = option?.display_label || value;
	const displayIcon = option?.icon_emoji;

	return (
		<Chip
			size={size}
			color={color}
			variant={variant}
			label={
				<Box display="flex" alignItems="center" gap={0.5}>
					{showEmoji && displayIcon && <Typography fontSize={fontSize}>{displayIcon}</Typography>}
					<Typography fontSize={fontSize}>{displayLabel}</Typography>
				</Box>
			}
			sx={sx}
		/>
	);
}

/**
 * Convenience chip wrappers for common entity types
 */

export function LossTypeChip(props: Omit<ReferenceDataChipProps, 'entity'>) {
	return <ReferenceDataChip entity="loss_type" color="secondary" {...props} />;
}

export function LineOfBusinessChip(props: Omit<ReferenceDataChipProps, 'entity'>) {
	return <ReferenceDataChip entity="line_of_business" color="primary" {...props} />;
}

export function ClaimSubstatusChip(props: Omit<ReferenceDataChipProps, 'entity'>) {
	return <ReferenceDataChip entity="claim_substatus" color="secondary" {...props} />;
}

// ClaimPartyRoleChip was removed - roles are now arrays displayed with inline Chip components

