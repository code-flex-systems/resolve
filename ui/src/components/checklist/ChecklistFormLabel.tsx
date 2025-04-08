import { Replay } from '@mui/icons-material';
import { FormLabel, IconButton, Tooltip, Typography } from '@mui/material';
import QuestionInfo from './QuestionInfo';
import { FieldValues, UseFormResetField } from 'react-hook-form';
import { Question } from '../../types';
import { QuestionType } from '../../config/enums';

export default function ChecklistFormLabel(props: {
	id: string;
	value?: string | string[];
	idx: number;
	question: Question;
	resetField: UseFormResetField<FieldValues>;
}) {
	const { id, value, idx, question, resetField } = props;
	return (
		<FormLabel className="flex-row-left">
			<Typography fontWeight="bold">Question #{idx + 1}</Typography>
			<Typography marginLeft="10px" fontStyle="italic">
				{question.q_text}
			</Typography>
			<Tooltip title="Reset question" enterDelay={500}>
				<span>
					<IconButton
						onClick={() =>
							resetField(id, { defaultValue: question.q_type === QuestionType.FREEFORM ? '' : [] })
						}
						disabled={!value?.length}
						sx={{ marginLeft: '10px' }}
					>
						<Replay sx={{ fontSize: 17 }} />
					</IconButton>
				</span>
			</Tooltip>
			{!!question.q_desc && <QuestionInfo description={question.q_desc} filename={question.q_filename} />}
		</FormLabel>
	);
}
