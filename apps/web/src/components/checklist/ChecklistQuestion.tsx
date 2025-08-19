'use client';
import { Question } from '@/types/types';
import { Control, Controller, FieldValues, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import ChecklistFormLabel from './ChecklistFormLabel';
import ChecklistAnswerRadio from './ChecklistAnswerRadio';
import { QuestionType } from '@/config/enums';
import ChecklistAnswerFreeform from './ChecklistAnswerFreeform';
import ChecklistAnswerDropdown from './ChecklistAnswerDropdown';
import { useChecklistSlice } from '@/state/store';
import { GetCommentOutput } from '@/hooks/trpc/useCommentTrpc';
import useIsAssigned from '@/hooks/useIsAssigned';

export function ChecklistQuestion(props: {
	control: Control<FieldValues, any, FieldValues>;
	setValue: UseFormSetValue<FieldValues>;
	watch: UseFormWatch<FieldValues>;
	question: Question;
	idx: number;
	comment?: GetCommentOutput;
	disabled: boolean;
}) {
	const { control, question, setValue, watch, idx, comment } = props;
	const fieldName = question.id.toString();
	const fieldValue = watch(fieldName);
	const additionalInfoAnswer = question.answers?.find((a) => a.has_additional_info);
	const fieldFreeformName = `${question.id}-${additionalInfoAnswer?.id ?? ''}-${QuestionType.FREEFORM}`;
	const highlightedQuestion = useChecklistSlice((state) => state.highlightedQuestion);
	const isAssigned = useIsAssigned();
	const disabled = props.disabled || !isAssigned;

	return (
		<div
			style={{
				...styles.container,
				backgroundColor: highlightedQuestion === question.id ? 'rgba(33, 106, 196, 0.1)' : undefined,
			}}
			className="flex-col-left"
		>
			<ChecklistFormLabel
				id={fieldName}
				value={fieldValue}
				idx={idx}
				question={question}
				setValue={setValue}
				comment={comment}
				disabled={props.disabled}
			/>
			<Controller
				name={fieldName}
				control={control}
				render={({ field }) => {
					switch (question.type) {
						case QuestionType.DROPDOWN:
							return (
								<ChecklistAnswerDropdown
									key={question.id}
									field={field}
									question={question}
									disabled={disabled}
								/>
							);
						case QuestionType.FREEFORM:
							return (
								<ChecklistAnswerFreeform
									key={question.id}
									field={field}
									answer={question.answers?.[0]}
									disabled={disabled}
								/>
							);
						case QuestionType.MULTI:
						case QuestionType.SINGLE:
							return (
								<ChecklistAnswerRadio
									key={question.id}
									field={field}
									question={question}
									disabled={disabled}
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
							disabled={disabled || !fieldValue || !fieldValue.includes(additionalInfoAnswer.id)}
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
		padding: '10px 0px',
		transition: 'background-color 300ms ease',
	},
};
