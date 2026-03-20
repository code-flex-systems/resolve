'use client';
import { FormLabel } from '@mui/material';
import Tooltip from '@/components/ui/Tooltip';
import Button from '@/components/ui/Button';
import QuestionInfo from './QuestionInfo';
import { FieldValues, UseFormSetValue } from 'react-hook-form';
import { Question } from '@/types/types';
import { ChecklistMode, QuestionType } from '@/config/enums';
import { useChecklistStore, getSelectedPageInfoOrDefault } from '@/stores/useChecklistStore';
import { GetCommentOutput } from '@/hooks/trpc/useCommentTrpc';
import useIsAssigned from '@/hooks/useIsAssigned';
import { IconMessage, IconRefresh } from '@tabler/icons-react';

export default function ChecklistFormLabel(props: {
	id: string;
	value?: string | string[];
	idx: number;
	question: Question;
	comment?: GetCommentOutput;
	disabled: boolean;
	setValue: UseFormSetValue<FieldValues>;
}) {
	const { id, value, idx, question, comment, disabled, setValue } = props;
	const mode = useChecklistStore((state) => state.mode);
	const selectedPageInfo = getSelectedPageInfoOrDefault();
	const highlightedQuestion = useChecklistStore((state) => state.highlightedQuestion);
	const toggleQuestionCommentDialog = useChecklistStore((state) => state.toggleQuestionCommentDialog);
	const isAssigned = useIsAssigned();
	const isEmpty = Array.isArray(value) ? !value.length : !value;
	return (
		<FormLabel sx={{ marginLeft: 0, paddingLeft: 0 }} className="flex-row-left">
			{isAssigned && (
				<Tooltip content="Reset question">
					<span>
						<Button
							variant="icon"
							size="sm"
							onClick={() =>
								setValue(id, question.type === QuestionType.FREEFORM ? '' : [], {
									shouldDirty: true,
								})
							}
							disabled={!value?.length || disabled}
							style={{ marginRight: '5px' }}
						>
							<IconRefresh size={17} />
						</Button>
					</span>
				</Tooltip>
			)}
			{mode === ChecklistMode.VIEW && (
				<Tooltip content="Add a comment">
					<span>
						<Button
							variant="icon"
							size="sm"
							onClick={() =>
								toggleQuestionCommentDialog(selectedPageInfo.instanceId, question.id, comment)
							}
							disabled={disabled}
							style={{ marginRight: '10px' }}
						>
							<IconMessage size={17} style={{ color: comment ? 'var(--text-accent)' : undefined }}
							/>
						</Button>
					</span>
				</Tooltip>
			)}

			<span
				
				
				 style={{ fontSize: 14, color: isEmpty && mode === ChecklistMode.VIEW
						? 'error.light'
						: highlightedQuestion === question.id
							? 'secondary'
							: undefined, fontWeight: 'bold' }}
			>
				{idx + 1}. {question.text}
			</span>
			{(!!question.description_text || question.id !== -1) && (
				<QuestionInfo
					description={question.description_text}
					filename={question.description_image_url}
					questionId={question.id}
				/>
			)}
		</FormLabel>
	);
}
