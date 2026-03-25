'use client';

import { TaskType } from '@/config/enums';
import { TASK_TYPE_CONFIG } from '@/lib/utils/taskUtils';
import Dropdown from '@/components/ui/Dropdown';

interface TaskTypeSelectProps {
	value: TaskType | null;
	onChange: (value: TaskType) => void;
	disabled?: boolean;
	required?: boolean;
	width?: number;
}

export default function TaskTypeSelect({
	value,
	onChange,
	disabled = false,
	required = false,
	width = 400,
}: TaskTypeSelectProps) {
	return (
		<Dropdown inlineLabel
			label="Task Type"
			options={Object.entries(TASK_TYPE_CONFIG).map(([type, config]) => ({
				value: type,
				label: config.label,
				icon: config.icon,
				description: config.description,
			}))}
			value={value ?? ''}
			onChange={(v) => onChange(v as TaskType)}
			disabled={disabled}
			required={required}
			className={`task-type-select`}
			renderValue={(val) => {
				if (!val) return <span></span>;
				const config = TASK_TYPE_CONFIG[val as TaskType];
				return <span>{config?.label ?? String(val)}</span>;
			}}
		/>
	);
}
