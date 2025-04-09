import { Question } from '../../types';
import { Control, Controller, FieldValues, UseFormResetField, UseFormWatch } from 'react-hook-form';
import ChecklistFormLabel from './ChecklistFormLabel';
import ChecklistAnswerRadio from './ChecklistAnswerRadio';
import { QuestionType } from '../../config/enums';
import ChecklistAnswerFreeform from './ChecklistAnswerFreeform';

export function ChecklistQuestion(props: {
	control: Control<FieldValues, any, FieldValues>;
	resetField: UseFormResetField<FieldValues>;
	watch: UseFormWatch<FieldValues>;
	question: Question;
	idx: number;
}) {
	const { control, question, resetField, watch, idx } = props;
	const fieldName = question.id.toString();
	const fieldValue = watch(fieldName);
	return (
		<div style={styles.container} className="flex-col-left">
			<ChecklistFormLabel
				id={fieldName}
				value={fieldValue}
				idx={idx}
				question={question}
				resetField={resetField}
			/>
			<Controller
				name={fieldName}
				control={control}
				render={({ field }) => {
					switch (question.q_type) {
						case QuestionType.FREEFORM:
							return <ChecklistAnswerFreeform key={question.id} field={field} question={question} />;
						case QuestionType.MULTI:
						case QuestionType.SINGLE:
							return (
								<ChecklistAnswerRadio
									key={question.id}
									field={field}
									question={question}
									watch={watch}
								/>
							);
						default:
							return <></>;
					}
				}}
			/>
		</div>
	);
}

const styles = {
	container: {
		width: '100%',
		padding: 10,
	},
};
