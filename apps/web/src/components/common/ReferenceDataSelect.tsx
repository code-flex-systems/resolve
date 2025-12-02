import { Box, Chip, CircularProgress, MenuItem, Paper, PopperProps, Tooltip, Typography } from '@mui/material';
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
	 * Custom height for the chip
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
	 * Custom styles for the chip
	 */
	sx?: object;
}

/**
 * Generic select component for reference data entities
 * Fetches options from the database and displays them in a dropdown
 *
 * Usage:
 * <ReferenceDataSelect
 *   entity="loss_type"
 *   value={lossType}
 *   onChange={setLossType}
 *   placeholder="Filter by loss type"
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

	return (
		<>
			<Chip
				label={isLoading ? 'Loading...' : displayLabel}
				icon={
					isLoading ? (
						<CircularProgress size={14} sx={{ marginLeft: '8px' }} />
					) : showIcon && displayIcon ? (
						<Box marginLeft="5px">
							<Typography fontSize={14}>{displayIcon}</Typography>
						</Box>
					) : (
						<CategoryIcon sx={{ color: value ? undefined : BASE_COLOR_LIGHT }} />
					)
				}
				onClick={(e) => {
					if (!disabled && !isLoading) {
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
				disabled={disabled || isLoading}
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
										<Typography fontSize={13} marginLeft={showIcon && option.icon_emoji ? '5px' : 0}>
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
		outline: 1,
		outlineColor: 'divider',
		marginTop: '5px',
		minWidth: 220,
		maxHeight: 300,
		overflow: 'auto',
	},
};

/**
 * Convenience wrapper components for common entity types
 * These provide the same API as the original enum-based selects
 * and can be dropped in as replacements
 */

export function LossTypeSelect({
	lossType,
	setLossType,
	clearable = true,
	height,
	text = 'Filter by loss type',
	disabled = false,
}: {
	lossType: string | null;
	setLossType: (newType: string | null) => void;
	clearable?: boolean;
	height?: number;
	text?: string;
	disabled?: boolean;
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
}: {
	lineOfBusiness: string | null;
	setLineOfBusiness: (newType: string | null) => void;
	clearable?: boolean;
	height?: number;
	text?: string;
	disabled?: boolean;
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
}: {
	substatus: string | null;
	setSubstatus: (newType: string | null) => void;
	clearable?: boolean;
	height?: number;
	text?: string;
	disabled?: boolean;
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
		/>
	);
}

export function ClaimPartyRoleSelect({
	role,
	setRole,
	clearable = true,
	height,
	text = 'Select role',
	disabled = false,
}: {
	role: string | null;
	setRole: (newRole: string | null) => void;
	clearable?: boolean;
	height?: number;
	text?: string;
	disabled?: boolean;
}) {
	return (
		<ReferenceDataSelect
			entity="claim_party_role"
			value={role}
			onChange={setRole}
			clearable={clearable}
			height={height}
			placeholder={text}
			disabled={disabled}
		/>
	);
}

export function FacilitatorCategorySelect({
	category,
	setCategory,
	clearable = true,
	height,
	text = 'Select category',
	disabled = false,
}: {
	category: string | null;
	setCategory: (newCategory: string | null) => void;
	clearable?: boolean;
	height?: number;
	text?: string;
	disabled?: boolean;
}) {
	return (
		<ReferenceDataSelect
			entity="facilitator_category"
			value={category}
			onChange={setCategory}
			clearable={clearable}
			height={height}
			placeholder={text}
			disabled={disabled}
		/>
	);
}

export function EntityCategorySelect({
	category,
	setCategory,
	clearable = true,
	height,
	text = 'Select category',
	disabled = false,
}: {
	category: string | null;
	setCategory: (newCategory: string | null) => void;
	clearable?: boolean;
	height?: number;
	text?: string;
	disabled?: boolean;
}) {
	return (
		<ReferenceDataSelect
			entity="entity_category"
			value={category}
			onChange={setCategory}
			clearable={clearable}
			height={height}
			placeholder={text}
			disabled={disabled}
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

	// Loading state
	if (isLoading) {
		return (
			<Box display="flex" alignItems="center" gap={0.5} sx={sx}>
				<CircularProgress size={12} />
				<Typography fontSize={fontSize} color="text.secondary">
					Loading...
				</Typography>
			</Box>
		);
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
			{showEmoji && option.icon_emoji && (
				<Typography fontSize={fontSize}>{option.icon_emoji}</Typography>
			)}
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

export function ClaimPartyRoleValue({
	value,
	showEmoji = true,
	fallback,
	fontSize,
	sx,
}: Omit<ReferenceDataValueProps, 'entity'>) {
	return (
		<ReferenceDataValue
			entity="claim_party_role"
			value={value}
			showEmoji={showEmoji}
			fallback={fallback}
			fontSize={fontSize}
			sx={sx}
		/>
	);
}

export function FacilitatorCategoryValue({
	value,
	showEmoji = true,
	fallback,
	fontSize,
	sx,
}: Omit<ReferenceDataValueProps, 'entity'>) {
	return (
		<ReferenceDataValue
			entity="facilitator_category"
			value={value}
			showEmoji={showEmoji}
			fallback={fallback}
			fontSize={fontSize}
			sx={sx}
		/>
	);
}

export function EntityCategoryValue({
	value,
	showEmoji = true,
	fallback,
	fontSize,
	sx,
}: Omit<ReferenceDataValueProps, 'entity'>) {
	return (
		<ReferenceDataValue
			entity="entity_category"
			value={value}
			showEmoji={showEmoji}
			fallback={fallback}
			fontSize={fontSize}
			sx={sx}
		/>
	);
}

/**
 * Party category value component that automatically selects the right entity
 * based on party_type (entity or facilitator)
 */
export function PartyCategoryValue({
	value,
	partyType,
	showEmoji = true,
	fallback,
	fontSize,
	sx,
}: Omit<ReferenceDataValueProps, 'entity'> & { partyType: string }) {
	const entity = partyType === 'facilitator' ? 'facilitator_category' : 'entity_category';
	return (
		<ReferenceDataValue
			entity={entity as ReferenceEntity}
			value={value}
			showEmoji={showEmoji}
			fallback={fallback}
			fontSize={fontSize}
			sx={sx}
		/>
	);
}
