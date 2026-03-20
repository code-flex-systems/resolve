import { useDeskTrpc } from '@/hooks/trpc/useDeskTrpc';
import Dropdown from '@/components/ui/Dropdown';

interface DeskLocationTypeSelectProps {
	value: number | null;
	onChange: (value: number | null) => void;
	placeholder?: string;
	disabled?: boolean;
	required?: boolean;
	fullWidth?: boolean;
}

export default function DeskLocationTypeSelect({
	value,
	onChange,
	placeholder = 'Select a desk type...',
	disabled,
	required,
	fullWidth,
}: DeskLocationTypeSelectProps) {
	const { data = { rows: [], count: 0 }, isFetching } = useDeskTrpc().listTypes({});

	return (
		<Dropdown
			label="Desk Location Type"
			options={data.rows.map((type) => ({
				value: type.id,
				label: type.name,
			}))}
			value={value}
			onChange={(v) => onChange(Number(v))}
			disabled={isFetching || disabled}
			placeholder={placeholder}
			required={required}
			fullWidth={fullWidth}
			renderValue={(val) => {
				const option = data.rows.find((t) => t.id === val);
				return <span>{option?.name || String(val)}</span>;
			}}
		/>
	);
}
