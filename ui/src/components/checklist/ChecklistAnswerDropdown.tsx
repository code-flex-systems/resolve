import {
	Checkbox,
	FormControlLabel,
	Link,
	MenuItem,
	Radio,
	Select,
	TextField,
	Tooltip,
	Typography,
} from '@mui/material';
import { Question } from '../../types';
import { ControllerRenderProps, FieldValues } from 'react-hook-form';

export default function ChecklistAnswerDropdown(props: {
	field: ControllerRenderProps<FieldValues, string>;
	question: Question;
}) {
	const { field, question } = props;
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
				borderRadius: 0,
				'& .MuiInputBase-root': {
					borderRadius: 0,
					padding: '2px 5px',
				},
				'& .MuiOutlinedInput-input': {
					borderRadius: 0,
					padding: '2px 5px',
				},
			}}
		>
			{question.answers.map((a) => (
				<MenuItem key={a.id} value={a.id}>
					<Tooltip title={a.description_text ?? ''} placement="right" arrow>
						<Typography>{a.text}</Typography>
					</Tooltip>
				</MenuItem>
			))}
		</Select>
	);
}
