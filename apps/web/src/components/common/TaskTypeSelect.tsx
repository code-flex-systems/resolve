'use client';

import { FormControl, InputLabel, MenuItem, Select, ListItemIcon, ListItemText } from '@mui/material';
import { TaskType } from '@/config/enums';
import { TASK_TYPE_CONFIG } from '@/lib/utils/taskUtils';

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
		<FormControl sx={{ width }} required={required}>
			<InputLabel>Task Type</InputLabel>
			<Select
				value={value ?? ''}
				onChange={(e) => onChange(e.target.value as TaskType)}
				disabled={disabled}
				renderValue={(selected) => {
					if (!selected) return '';
					const config = TASK_TYPE_CONFIG[selected as TaskType];
					return config?.label ?? selected;
				}}
			>
				{Object.entries(TASK_TYPE_CONFIG).map(([type, config]) => (
					<MenuItem key={type} value={type}>
						<ListItemIcon sx={{ minWidth: 36 }}>{config.icon}</ListItemIcon>
						<ListItemText primary={config.label} secondary={config.description} />
					</MenuItem>
				))}
			</Select>
		</FormControl>
	);
}
