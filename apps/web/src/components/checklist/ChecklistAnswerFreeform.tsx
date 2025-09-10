'use client';
import { TextField } from '@mui/material';
import { Answer } from '@/types/types';
import { ControllerRenderProps, FieldValues } from 'react-hook-form';

export default function ChecklistAnswerFreeform(props: {
	field: ControllerRenderProps<FieldValues, string>;
	answer?: Answer;
	disabled?: boolean;
}) {
	const { field, answer, disabled } = props;
	if (!answer) return <></>;
	return (
		<TextField
			variant="outlined"
			placeholder={answer.additional_info_placeholder ?? 'Type your response here'}
			multiline
			// multiline={!!answer.additional_info_num_lines}
			rows={answer.additional_info_num_lines ?? 2}
			{...field}
			disabled={disabled}
			sx={{
				width: 500,
				marginTop: '5px',
				padding: '0px 10px',
				'& .MuiInputBase-root': {
					padding: '2px 5px',
				},
				'& .MuiOutlinedInput-input': {
					fontSize: 14,
					padding: '2px 5px',
				},
			}}
		/>
	);
}
