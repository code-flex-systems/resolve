import { Question } from '../../types';
import { Control, Controller, FieldValues, UseFormResetField, UseFormWatch } from 'react-hook-form';
import ChecklistFormLabel from './ChecklistFormLabel';
import ChecklistAnswerRadio from './ChecklistAnswerRadio';
import { QuestionType } from '../../config/enums';
import ChecklistAnswerFreeform from './ChecklistAnswerFreeform';
import ChecklistAnswerDropdown from './ChecklistAnswerDropdown';

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
	const additionalInfoAnswer = question.answers?.find((a) => a.has_additional_info);
	const fieldFreeformName = `${question.id}-${additionalInfoAnswer?.id ?? ''}-${QuestionType.FREEFORM}`;
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
					switch (question.type) {
						case QuestionType.DROPDOWN:
							return <ChecklistAnswerDropdown key={question.id} field={field} question={question} />;
						case QuestionType.FREEFORM:
							return (
								<ChecklistAnswerFreeform
									key={question.id}
									field={field}
									answer={question.answers?.[0]}
								/>
							);
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
			{question.type === QuestionType.SINGLE && !!additionalInfoAnswer && (
				<Controller
					name={fieldFreeformName}
					control={control}
					render={({ field }) => (
						<ChecklistAnswerFreeform
							key={fieldFreeformName}
							field={field}
							answer={additionalInfoAnswer}
							disabled={!fieldValue || !fieldValue.includes(additionalInfoAnswer.id)}
						/>
					)}
				/>
			)}
		</div>
	);
}

const styles = {
	container: {
		width: '100%',
		padding: 10,
	},
};
