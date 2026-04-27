import { trpc } from '@/lib/trpc';
import type { ReferenceEntity } from '@/schemas/referenceDataSchemas';
import { IconAlertTriangle } from '@tabler/icons-react';
import Dropdown from '@/components/ui/Dropdown';
import Chip from '@/components/ui/Chip';
import Skeleton from '@/components/ui/Skeleton';
import Tooltip from '@/components/ui/Tooltip';

interface ReferenceDataSelectProps {
	entity: ReferenceEntity;
	value: string | null;
	onChange: (newValue: string | null) => void;
	showIcon?: boolean;
	clearable?: boolean;
	placeholder?: string;
	disabled?: boolean;
	isFilter?: boolean;
	label?: string;
	fullWidth?: boolean;
}

export default function ReferenceDataSelect({
	entity,
	value,
	onChange,
	showIcon = true,
	clearable = true,
	placeholder = 'Select...',
	disabled = false,
	isFilter = true,
	label,
	fullWidth = true,
}: ReferenceDataSelectProps) {
	const { data: options = [], isLoading } = trpc.referenceData.getReferenceOptions.useQuery(
		{ entity },
		{ staleTime: 5 * 60 * 1000, gcTime: 10 * 60 * 1000 }
	);

	if (isLoading) {
		return <Skeleton variant="rect" width={isFilter ? 120 : '100%'} height={32} />;
	}

	const dropdownOptions = [
		...(clearable ? [{ value: '' as string | number, label: 'None' }] : []),
		...options.map((opt) => ({
			value: opt.value,
			label: opt.display_label,
			icon: showIcon && opt.icon_emoji ? <span style={{ fontSize: 14 }}>{opt.icon_emoji}</span> : undefined,
		})),
	];

	return (
		<Dropdown
			options={dropdownOptions}
			value={value ?? ''}
			onChange={(val) => onChange(val === '' ? null : String(val))}
			placeholder={placeholder}
			disabled={disabled}
			label={label}
			inlineLabel={isFilter}
			fullWidth={fullWidth}
			renderValue={value ? (val, opt) => (
				<span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
					{opt?.icon}
					<span>{opt?.label}</span>
				</span>
			) : undefined}
		/>
	);
}

// ============================================================================
// CONVENIENCE WRAPPERS
// ============================================================================

interface CommonSelectProps {
	clearable?: boolean;
	text?: string;
	disabled?: boolean;
	isFilter?: boolean;
	label?: string;
}

export function LossTypeSelect({ lossType, setLossType, clearable = true, text = 'Filter by loss type', disabled = false, isFilter = true, label }: CommonSelectProps & { lossType: string | null; setLossType: (v: string | null) => void }) {
	return <ReferenceDataSelect entity="loss_type" value={lossType} onChange={setLossType} clearable={clearable} placeholder={text} disabled={disabled} isFilter={isFilter} label={label} />;
}

export function LineOfBusinessSelect({ lineOfBusiness, setLineOfBusiness, clearable = true, text = 'Filter by line of business', disabled = false, isFilter = true, label }: CommonSelectProps & { lineOfBusiness: string | null; setLineOfBusiness: (v: string | null) => void }) {
	return <ReferenceDataSelect entity="line_of_business" value={lineOfBusiness} onChange={setLineOfBusiness} clearable={clearable} placeholder={text} disabled={disabled} isFilter={isFilter} label={label} />;
}

export function ClaimSubstatusSelect({ substatus, setSubstatus, clearable = true, text = 'Filter by substatus', disabled = false, isFilter = true, label }: CommonSelectProps & { substatus: string | null; setSubstatus: (v: string | null) => void }) {
	return <ReferenceDataSelect entity="claim_substatus" value={substatus} onChange={setSubstatus} clearable={clearable} placeholder={text} disabled={disabled} isFilter={isFilter} label={label} />;
}

export function ClaimantPartyRoleSelect({ role, setRole, clearable = true, text = 'Select role', disabled = false, isFilter = true, label }: CommonSelectProps & { role: string | null; setRole: (v: string | null) => void }) {
	return <ReferenceDataSelect entity="claimant_party_role" value={role} onChange={setRole} clearable={clearable} placeholder={text} disabled={disabled} isFilter={isFilter} label={label} />;
}

export function AdversePartyRoleSelect({ role, setRole, clearable = true, text = 'Select role', disabled = false, isFilter = true, label }: CommonSelectProps & { role: string | null; setRole: (v: string | null) => void }) {
	return <ReferenceDataSelect entity="adverse_party_role" value={role} onChange={setRole} clearable={clearable} placeholder={text} disabled={disabled} isFilter={isFilter} label={label} />;
}

// ============================================================================
// VALUE DISPLAY COMPONENTS
// ============================================================================

interface ReferenceDataValueProps {
	entity: ReferenceEntity;
	value: string | null | undefined;
	showEmoji?: boolean;
	fallback?: string;
	fontSize?: number;
}

export function ReferenceDataValue({ entity, value, showEmoji = true, fallback = '\u2014', fontSize = 13 }: ReferenceDataValueProps) {
	const { data: option, isLoading } = trpc.referenceData.getReferenceOption.useQuery(
		{ entity, value: value!, includeDeactivated: true },
		{ enabled: !!value, staleTime: 5 * 60 * 1000, gcTime: 10 * 60 * 1000 }
	);

	if (!value) return <span style={{ fontSize, color: 'var(--text-secondary)' }}>{fallback}</span>;
	if (isLoading) return <Skeleton variant="rect" width={70} height={18} />;
	if (!option) return <span style={{ fontSize, color: 'var(--text-secondary)' }}>{value}</span>;

	const isDeactivated = !!option.deleted_at;

	return (
		<span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
			{showEmoji && option.icon_emoji && <span style={{ fontSize }}>{option.icon_emoji}</span>}
			<span style={{ fontSize }}>{option.display_label}</span>
			{isDeactivated && (
				<Tooltip content="This option has been deactivated" position="top">
					<span style={{ display: 'inline-flex', marginLeft: 4 }}>
						<IconAlertTriangle size={fontSize + 2} style={{ color: 'var(--status-warning)' }} />
					</span>
				</Tooltip>
			)}
		</span>
	);
}

export function LossTypeValue(props: Omit<ReferenceDataValueProps, 'entity'>) {
	return <ReferenceDataValue entity="loss_type" {...props} />;
}

export function LineOfBusinessValue(props: Omit<ReferenceDataValueProps, 'entity'>) {
	return <ReferenceDataValue entity="line_of_business" {...props} />;
}

export function ClaimSubstatusValue(props: Omit<ReferenceDataValueProps, 'entity'>) {
	return <ReferenceDataValue entity="claim_substatus" {...props} />;
}

// ============================================================================
// CHIP DISPLAY COMPONENTS
// ============================================================================

interface ReferenceDataChipProps {
	entity: ReferenceEntity;
	value: string | null | undefined;
	showEmoji?: boolean;
	color?: 'success' | 'error' | 'warning' | 'info' | 'neutral';
	variant?: 'filled' | 'outlined';
	fontSize?: number;
}

export function ReferenceDataChip({ entity, value, showEmoji = true, color = 'neutral', variant = 'outlined', fontSize = 12 }: ReferenceDataChipProps) {
	const { data: option, isLoading } = trpc.referenceData.getReferenceOption.useQuery(
		{ entity, value: value!, includeDeactivated: true },
		{ enabled: !!value, staleTime: 5 * 60 * 1000, gcTime: 10 * 60 * 1000 }
	);

	if (!value) return null;
	if (isLoading) return <Skeleton variant="rect" width={80} height={24} />;

	return (
		<Chip size="sm" color={color} variant={variant}>
			{showEmoji && option?.icon_emoji && <span style={{ fontSize }}>{option.icon_emoji}</span>}
			<span style={{ fontSize }}>{option?.display_label || value}</span>
		</Chip>
	);
}

export function LossTypeChip(props: Omit<ReferenceDataChipProps, 'entity'>) {
	return <ReferenceDataChip entity="loss_type" color="info" {...props} />;
}

export function LineOfBusinessChip(props: Omit<ReferenceDataChipProps, 'entity'>) {
	return <ReferenceDataChip entity="line_of_business" color="info" {...props} />;
}

export function ClaimSubstatusChip(props: Omit<ReferenceDataChipProps, 'entity'>) {
	return <ReferenceDataChip entity="claim_substatus" color="info" {...props} />;
}
