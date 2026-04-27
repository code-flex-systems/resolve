'use client';
import { Textarea } from '@/components/ui/Input';
import { Answer } from '@/types/types';
import { ControllerRenderProps, FieldValues } from 'react-hook-form';

export default function ChecklistAnswerFreeform(props: {
	field: ControllerRenderProps<FieldValues, string>;
	answer?: Answer;
	disabled?: boolean;
	isFreeformQuestion?: boolean;
}) {
	const { field, answer, disabled, isFreeformQuestion } = props;
	// For free-form questions, always show the text area even without an answer
	// For additional info fields, only show if answer exists
	if (!isFreeformQuestion && !answer) return <></>;

	return (
		<Textarea
			placeholder={answer?.additional_info_placeholder ?? 'Type your response here'}
			rows={answer?.additional_info_num_lines ?? 2}
			{...field}
			disabled={disabled}
			style={{
				width: 500,
				marginTop: 5,
				padding: '0px 10px',
				fontSize: 13,
			}}
		/>
	);
}
