import { Checkbox, FormControlLabel, Link, Radio, Tooltip } from '@mui/material';
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
			{question.answers.map((a) => (
				<Tooltip key={a.id} placement="top" title={a.a_desc ?? ''} arrow>
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
						label={
							a.calls_page_id && field.value?.includes(a.a_text) ? (
								<Link
									color="info"
									onClick={() => {
										actions.updateSelectedPage(a.calls_page_id);
										actions.updateSelectedPageInfoSearch(a.calls_page_id!);
									}}
								>
									{a.a_text}
								</Link>
							) : (
								a.a_text
							)
						}
					/>
				</Tooltip>
			))}
		</div>
	);
}
