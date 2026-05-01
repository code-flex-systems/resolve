import Skeleton from '@/components/ui/Skeleton';
import { trpc } from '@/lib/trpc';
import Dropdown from '@/components/ui/Dropdown';

interface CoverageTypeSelectProps {
	value: string;
	onChange: (value: string) => void;
	label?: string;
	fullWidth?: boolean;
}

export default function CoverageTypeSelect({
	value,
	onChange,
	label = 'Coverage Type',
	fullWidth,
}: CoverageTypeSelectProps) {
	const { data: options = [], isLoading } = trpc.referenceData.getReferenceOptions.useQuery(
		{ entity: 'loss_type' },
		{
			staleTime: 5 * 60 * 1000,
			gcTime: 10 * 60 * 1000,
		}
	);

	if (isLoading) {
		return <Skeleton variant="rect" width="100%" height={40} />;
	}

	return (
		<Dropdown
			inlineLabel
			label={label}
			options={options.map((option) => ({
				value: option.value,
				label: option.display_label,
				icon: option.icon_emoji ? (
					<span style={{ fontSize: 14 }}>{option.icon_emoji}</span>
				) : undefined,
			}))}
			value={value}
			onChange={(v) => onChange(String(v))}
			fullWidth={fullWidth}
			placeholder="Select coverage type"
			renderValue={(val) => {
				const option = options.find((o) => o.value === val);
				if (!option) return <span>{String(val)}</span>;
				return (
					<span style={{ display: 'flex', alignItems: 'center' }}>
						{option.icon_emoji && (
							<span style={{ fontSize: 14, marginRight: 8 }}>{option.icon_emoji}</span>
						)}
						<span>{option.display_label}</span>
					</span>
				);
			}}
		/>
	);
}
