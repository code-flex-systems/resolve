'use client';
import { Question } from '@/types/types';
import { Box } from '@mui/material';
import { Control, Controller, FieldValues, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import ChecklistFormLabel from './ChecklistFormLabel';
import ChecklistAnswerRadio from './ChecklistAnswerRadio';
import { QuestionType } from '@/config/enums';
import ChecklistAnswerFreeform from './ChecklistAnswerFreeform';
import ChecklistAnswerDropdown from './ChecklistAnswerDropdown';
import ChecklistAnswerFileUpload from './ChecklistAnswerFileUpload';
import { useChecklistStore } from '@/stores/useChecklistStore';
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
	const uploadAnswer = question.answers?.find((a) => a.requires_upload);
	const fieldFreeformName = `${question.id}-${additionalInfoAnswer?.id ?? ''}-${QuestionType.FREEFORM}`;
	const fieldUploadName = `${question.id}-${uploadAnswer?.id ?? ''}-upload`;
	const highlightedQuestion = useChecklistStore((state) => state.highlightedQuestion);
	const isAssigned = useIsAssigned();
	const disabled = props.disabled || !isAssigned;

	return (
		<Box
			sx={{
				...styles.container,
				backgroundColor: highlightedQuestion === question.id ? 'rgba(50, 174, 153, 0.1)' : undefined,
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
									isFreeformQuestion={true}
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
									watch={watch}
								/>
							);
						default:
							return <></>;
					}
				}}
			/>
			{question.type !== QuestionType.FREEFORM && !!additionalInfoAnswer && (
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
			{question.type !== QuestionType.FREEFORM && !!uploadAnswer && (
				<Controller
					name={fieldUploadName}
					control={control}
					render={({ field }) => (
						<ChecklistAnswerFileUpload
							key={fieldUploadName}
							field={field}
							answer={uploadAnswer}
							disabled={disabled || !fieldValue || !fieldValue.includes(uploadAnswer.id)}
							allowedExtensions={uploadAnswer.allowed_extensions}
						/>
					)}
				/>
			)}
		</Box>
	);
}

const styles = {
	container: {
		width: '100%',
		py: 1.25,
		transition: 'background-color 300ms ease',
	},
};
