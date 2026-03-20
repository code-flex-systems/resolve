import Select from '@/components/ui/Select';
import { DeductibleStatus } from '@/config/enums';

interface DeductibleStatusSelectProps {
	value: DeductibleStatus;
	onChange: (value: DeductibleStatus) => void;
	required?: boolean;
	disabled?: boolean;
	error?: boolean;
	helperText?: string;
}

export const DEDUCTIBLE_STATUS_OPTIONS = [
	{ value: DeductibleStatus.NOT_CONFIRMED, label: 'Not Confirmed (NC)', abbrev: 'NC' },
	{ value: DeductibleStatus.APPLIES, label: 'Applies (A)', abbrev: 'A' },
	{ value: DeductibleStatus.WAIVED, label: 'Waived (W)', abbrev: 'W' },
	{
		value: DeductibleStatus.REIMBURSED_BY_CLIENT,
		label: 'Reimbursed by Client (RMBC)',
		abbrev: 'RMBC',
	},
	{
		value: DeductibleStatus.REIMBURSED_BY_ADVERSE,
		label: 'Reimbursed by Adverse (RMBA)',
		abbrev: 'RMBA',
	},
	{ value: DeductibleStatus.NO_DEDUCTIBLE, label: 'No Deductible (ND)', abbrev: 'ND' },
];

export default function DeductibleStatusSelect({
	value,
	onChange,
	required = false,
	disabled = false,
	error = false,
	helperText,
}: DeductibleStatusSelectProps) {
	return (
		<Select
			label="Deductible Status"
			value={value}
			onChange={(val) => onChange(val as DeductibleStatus)}
			required={required}
			disabled={disabled}
			error={error}
			helperText={helperText}
			fullWidth
			options={DEDUCTIBLE_STATUS_OPTIONS.map((option) => ({
				value: option.value,
				label: option.label,
			}))}
		/>
	);
}
