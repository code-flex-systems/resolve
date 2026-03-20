import {
	Chip,
	FormControl,
	InputLabel,
	MenuItem,
	Paper,
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
import { IconCategory, IconAlertTriangle } from '@tabler/icons-react';

interface ReferenceDataSelectProps {
	entity: ReferenceEntity;
	value: string | null;
	onChange: (newValue: string | null) => void;
	showIcon?: boolean;
	clearable?: boolean;
	height?: number;
	placeholder?: string;
	disabled?: boolean;
	sx?: object;
	isFilter?: boolean;
	label?: string;
	size?: 'small' | 'medium';
	fullWidth?: boolean;
}

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
	const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

	const { data: options = [], isLoading } = trpc.referenceData.getReferenceOptions.useQuery(
		{ entity },
		{
			staleTime: 5 * 60 * 1000,
			gcTime: 10 * 60 * 1000,
		}
	);

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
							<span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
								{showIcon && option.icon_emoji && (
									<span style={{ fontSize: 14 }}>
										{option.icon_emoji}
									</span>
								)}
								<span>{option.display_label}</span>
							</span>
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
							<span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
								{showIcon && option.icon_emoji && (
									<span style={{ fontSize: 14 }}>{option.icon_emoji}</span>
								)}
								<span>{option.display_label}</span>
							</span>
						</MenuItem>
					))}
				</Select>
			</FormControl>
		);
	}

	// Filter chip mode
	if (isLoading) {
		return <Skeleton variant="rounded" width={120} height={height || 32} sx={{ borderRadius: 9999, ...sx }} />;
	}

	return (
		<>
			<Chip
				label={displayLabel}
				icon={
					showIcon && displayIcon ? (
						<span style={{ marginLeft: 5 }}>
							<span style={{ fontSize: 14 }}>{displayIcon}</span>
						</span>
					) : (
						<IconCategory size={20} style={{ color: value ? undefined : BASE_COLOR_LIGHT }} />
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
								<span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
									No options available
								</span>
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
									<div style={{ width: '100%', display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
										{showIcon && option.icon_emoji && (
											<span style={{ fontSize: 14 }}>{option.icon_emoji}</span>
										)}
										<span
											style={{
												fontSize: 13,
												marginLeft: showIcon && option.icon_emoji ? 5 : 0,
											}}
										>
											{option.display_label}
										</span>
									</div>
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
	entity: ReferenceEntity;
	value: string | null | undefined;
	showEmoji?: boolean;
	fallback?: string;
	fontSize?: number;
	sx?: object;
}

export function ReferenceDataValue({
	entity,
	value,
	showEmoji = true,
	fallback = '\u2014',
	fontSize = 13,
	sx,
}: ReferenceDataValueProps) {
	const { data: option, isLoading } = trpc.referenceData.getReferenceOption.useQuery(
		{ entity, value: value!, includeDeactivated: true },
		{
			enabled: !!value,
			staleTime: 5 * 60 * 1000,
			gcTime: 10 * 60 * 1000,
		}
	);

	if (!value) {
		return (
			<span style={{ fontSize, color: 'var(--text-secondary)', ...(sx as React.CSSProperties) }}>
				{fallback}
			</span>
		);
	}

	if (isLoading) {
		return <Skeleton variant="rounded" width={70} height={18} sx={{ display: 'inline-block', verticalAlign: 'middle', ...sx }} />;
	}

	if (!option) {
		return (
			<span style={{ fontSize, color: 'var(--text-secondary)', ...(sx as React.CSSProperties) }}>
				{value}
			</span>
		);
	}

	const isDeactivated = !!option.deleted_at;

	return (
		<span style={{ display: 'flex', alignItems: 'center', gap: 4, ...(sx as React.CSSProperties) }}>
			{showEmoji && option.icon_emoji && <span style={{ fontSize }}>{option.icon_emoji}</span>}
			<span style={{ fontSize }}>{option.display_label}</span>
			{isDeactivated && (
				<Tooltip title="This option has been deactivated" arrow>
					<span style={{ display: 'inline-flex', marginLeft: 4 }}>
						<IconAlertTriangle size={fontSize + 2} style={{ color: 'var(--color-warning)' }} />
					</span>
				</Tooltip>
			)}
		</span>
	);
}

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

// ============================================================================
// REFERENCE DATA CHIP COMPONENT
// ============================================================================

interface ReferenceDataChipProps {
	entity: ReferenceEntity;
	value: string | null | undefined;
	showEmoji?: boolean;
	size?: 'small' | 'medium';
	color?: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
	variant?: 'filled' | 'outlined';
	fontSize?: number;
	sx?: object;
}

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

	const displayLabelText = option?.display_label || value;
	const displayIconEmoji = option?.icon_emoji;

	return (
		<Chip
			size={size}
			color={color}
			variant={variant}
			label={
				<span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
					{showEmoji && displayIconEmoji && <span style={{ fontSize }}>{displayIconEmoji}</span>}
					<span style={{ fontSize }}>{displayLabelText}</span>
				</span>
			}
			sx={sx}
		/>
	);
}

export function LossTypeChip(props: Omit<ReferenceDataChipProps, 'entity'>) {
	return <ReferenceDataChip entity="loss_type" color="secondary" {...props} />;
}

export function LineOfBusinessChip(props: Omit<ReferenceDataChipProps, 'entity'>) {
	return <ReferenceDataChip entity="line_of_business" color="primary" {...props} />;
}

export function ClaimSubstatusChip(props: Omit<ReferenceDataChipProps, 'entity'>) {
	return <ReferenceDataChip entity="claim_substatus" color="secondary" {...props} />;
}
