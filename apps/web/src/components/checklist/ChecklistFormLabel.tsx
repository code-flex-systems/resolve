'use client';
import { Replay, SmsOutlined } from '@mui/icons-material';
import { FormLabel, IconButton, Tooltip, Typography } from '@mui/material';
import QuestionInfo from './QuestionInfo';
import { FieldValues, UseFormSetValue } from 'react-hook-form';
import { Question } from '@/types/types';
import { QuestionType } from '@/config/enums';
import { toggleQuestionCommentDialog } from '@/state/checklist/actions';
import useStore, { useChecklistSlice } from '@/state/store';
import * as selectors from '../../state/checklist/selectors';
import theme from '@/styles/theme';
import { GetCommentOutput } from '@/hooks/trpc/useCommentTrpc';
import useIsAssigned from '@/hooks/useIsAssigned';

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
	const selectedPageInfo = useStore(selectors.selectedPageInfo);
	const highlightedQuestion = useChecklistSlice((state) => state.highlightedQuestion);
	const isAssigned = useIsAssigned();
	return (
		<FormLabel sx={{ marginLeft: 0, paddingLeft: 0 }} className="flex-row-left">
			{isAssigned && (
				<Tooltip title="Reset question" enterDelay={500}>
					<span>
						<IconButton
							onClick={() =>
								setValue(id, question.type === QuestionType.FREEFORM ? '' : [], {
									shouldDirty: true,
								})
							}
							disabled={!value?.length || disabled}
							sx={{ marginRight: '5px' }}
						>
							<Replay sx={{ fontSize: 17 }} />
						</IconButton>
					</span>
				</Tooltip>
			)}
			<Tooltip title="Add a comment" enterDelay={500}>
				<span>
					<IconButton
						onClick={() => toggleQuestionCommentDialog(selectedPageInfo.instanceId, question.id, comment)}
						disabled={disabled}
						sx={{ marginRight: '10px' }}
					>
						<SmsOutlined sx={{ fontSize: 17, color: comment ? theme.palette.primary.main : undefined }} />
					</IconButton>
				</span>
			</Tooltip>

			<Typography color={highlightedQuestion === question.id ? 'primary' : undefined} fontWeight="bold">
				{idx + 1}. {question.text}
			</Typography>
			{!!question.description_text && (
				<QuestionInfo description={question.description_text} filename={question.description_image_url} />
			)}
		</FormLabel>
	);
}
