'use client';
import { Replay } from '@mui/icons-material';
import { FormLabel, IconButton, Tooltip, Typography } from '@mui/material';
import QuestionInfo from './QuestionInfo';
import { FieldValues, UseFormSetValue } from 'react-hook-form';
import { Question } from '@/types/types';
import { QuestionType } from '@/config/enums';

export default function ChecklistFormLabel(props: {
	id: string;
	value?: string | string[];
	idx: number;
	question: Question;
	setValue: UseFormSetValue<FieldValues>;
}) {
	const { id, value, idx, question, setValue } = props;
	return (
		<FormLabel sx={{ marginLeft: 0, paddingLeft: 0 }} className="flex-row-left">
			<Tooltip title="Reset question" enterDelay={500}>
				<span>
					<IconButton
						onClick={() =>
							setValue(id, question.type === QuestionType.FREEFORM ? '' : [], { shouldDirty: true })
						}
						disabled={!value?.length}
						sx={{ marginRight: '10px' }}
					>
						<Replay sx={{ fontSize: 17 }} />
					</IconButton>
				</span>
			</Tooltip>
			<Typography fontWeight="bold">
				{idx + 1}. {question.text}
			</Typography>
			{!!question.description_text && (
				<QuestionInfo description={question.description_text} filename={question.description_image_url} />
			)}
		</FormLabel>
	);
}
