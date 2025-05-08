import { Checkbox, FormControlLabel, Link, Radio, Stack, Tooltip, Typography } from '@mui/material';
import { QuestionType } from '../../config/enums';
import { Question } from '../../types';
import { ControllerRenderProps, FieldValues } from 'react-hook-form';
import * as actions from '../../state/checklist/actions';

export default function ChecklistAnswerRadio(props: {
	field: ControllerRenderProps<FieldValues, string>;
	question: Question;
	disabled?: boolean;
}) {
	const { field, question, disabled } = props;
	return (
		<Stack direction="row" flexWrap="wrap" spacing={0.5} useFlexGap padding="0px 10px">
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
									disabled={disabled}
									sx={{ color: 'primary.main' }}
								/>
							) : (
								<Radio
									checked={!!field.value?.includes(a.id)}
									onChange={(e) => {
										const newValue = e.target.checked ? [a.id] : [];
										field.onChange(newValue);
									}}
									disabled={disabled}
									color="primary"
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
								<Typography noWrap>{a.text}</Typography>
							)
						}
					/>
				</Tooltip>
			))}
		</Stack>
	);
}
