import { Checkbox, FormControlLabel, Link, Radio, TextField, Tooltip } from '@mui/material';
import { QuestionType } from '../../config/enums';
import { Question } from '../../types';
import { ControllerRenderProps, FieldValues } from 'react-hook-form';

export default function ChecklistAnswerFreeform(props: {
	field: ControllerRenderProps<FieldValues, string>;
	question: Question;
}) {
	const { field, question } = props;
	let answer = question.answers?.[0];
	if (!answer) return <></>;
	return (
		<TextField
			variant="outlined"
			placeholder={answer.additional_info_placeholder ?? ''}
			multiline={!!answer.additional_info_num_lines}
			rows={answer.additional_info_num_lines ?? 0}
			{...field}
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
