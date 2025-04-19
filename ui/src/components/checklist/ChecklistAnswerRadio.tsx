import { Checkbox, FormControlLabel, Link, Radio, TextField, Tooltip } from '@mui/material';
import { QuestionType } from '../../config/enums';
import { Question } from '../../types';
import { ControllerRenderProps, FieldValues, UseFormWatch } from 'react-hook-form';
import * as actions from '../../state/checklist/actions';

export default function ChecklistAnswerRadio(props: {
	field: ControllerRenderProps<FieldValues, string>;
	question: Question;
	watch: UseFormWatch<FieldValues>;
}) {
	const { field, question, watch } = props;
	return (
		<div className="flex-row-left">
			{(question.answers ?? []).map((a) => (
				<Tooltip key={a.id} placement="top" title={a.description_text ?? ''} arrow>
					<FormControlLabel
						control={
							question.type === QuestionType.MULTI ? (
								<Checkbox
									checked={!!field.value?.includes(a.id)}
									onChange={(e) => {
										const newValue = e.target.checked
											? [...(field.value ?? []), a.id]
											: field.value?.filter((value: any) => value !== a.id);
										field.onChange(newValue);
									}}
								/>
							) : (
								<Radio
									checked={!!field.value?.includes(a.id)}
									onChange={(e) => {
										const newValue = e.target.checked ? [a.id] : [];
										field.onChange(newValue);
									}}
								/>
							)
						}
						label={
							a.calls_instance_id && field.value?.includes(a.id) ? (
								<Link
									color="info"
									onClick={() => {
										actions.updateSelectedPage(a.calls_instance_id);
										actions.updateSelectedPageInfoSearch(a.calls_instance_id!);
									}}
								>
									{a.text}
								</Link>
							) : (
								a.text
							)
						}
					/>
				</Tooltip>
			))}
		</div>
	);
}
