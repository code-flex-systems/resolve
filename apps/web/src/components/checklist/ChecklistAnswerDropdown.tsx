'use client';
import { MenuItem, Select, Tooltip, Typography } from '@mui/material';
import { Question } from '@/types/types';
import { ControllerRenderProps, FieldValues } from 'react-hook-form';

export default function ChecklistAnswerDropdown(props: {
	field: ControllerRenderProps<FieldValues, string>;
	question: Question;
	disabled?: boolean;
}) {
	const { field, question, disabled } = props;
	return (
		<Select
			variant="outlined"
			displayEmpty
			{...field}
			value={field.value ?? ''}
			onChange={(e) => {
				const value = e.target.value;
				field.onChange([value]);
			}}
			renderValue={(value) => {
				return question.answers.find((a) => a.id === +value?.[0])?.text ?? 'Choose an answer';
			}}
			sx={{
				width: 300,
				marginTop: '5px',
				marginLeft: '10px',
				padding: '2px 10px',
				'& .MuiInputBase-root': {
					padding: '2px 5px',
				},
				'& .MuiOutlinedInput-input': {
					fontSize: 13,
					padding: '2px 5px',
				},
			}}
			disabled={disabled}
		>
			{question.answers.map((a) => (
				<MenuItem key={a.id} value={a.id}>
					<Tooltip title={a.description_text ?? ''} placement="right" arrow>
						<Typography fontSize={13}>{a.text}</Typography>
					</Tooltip>
				</MenuItem>
			))}
		</Select>
	);
}
