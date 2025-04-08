import { Checkbox, FormControlLabel, Link, Radio, Tooltip } from '@mui/material';
import { QuestionType } from '../../config/enums';
import { Question } from '../../types';
import { ControllerRenderProps, FieldValues } from 'react-hook-form';

export default function ChecklistAnswerRadio(props: {
	field: ControllerRenderProps<FieldValues, string>;
	question: Question;
}) {
	const { field, question } = props;
	return (
		<div className="flex-row-left">
			{question.answers.map((a) => (
				<Tooltip key={a.id} title={a.a_desc ?? ''}>
					<FormControlLabel
						control={
							question.q_type === QuestionType.MULTI ? (
								<Checkbox
									checked={!!field.value?.includes(a.a_text)}
									onChange={(e) => {
										const newValue = e.target.checked
											? [...(field.value ?? []), a.a_text]
											: field.value?.filter((value: any) => value !== a.a_text);
										field.onChange(newValue);
									}}
								/>
							) : (
								<Radio
									checked={!!field.value?.includes(a.a_text)}
									onChange={(e) => {
										const newValue = e.target.checked ? [a.a_text] : [];
										field.onChange(newValue);
									}}
								/>
							)
						}
						label={a.calls_page_id ? <Link color="info">{a.a_text}</Link> : a.a_text}
					/>
				</Tooltip>
			))}
		</div>
	);
}
