import { TextField } from '@mui/material';
import { Answer } from '../../types';
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
			placeholder={answer.additional_info_placeholder ?? ''}
			multiline={!!answer.additional_info_num_lines}
			rows={answer.additional_info_num_lines ?? 0}
			{...field}
			disabled={disabled}
			sx={{
				width: 300,
				marginTop: '5px',
				'& .MuiInputBase-root': {
					borderRadius: 0,
					padding: '2px 5px',
				},
				'& .MuiOutlinedInput-input': {
					borderRadius: 0,
					padding: '2px 5px',
				},
			}}
		/>
	);
}
