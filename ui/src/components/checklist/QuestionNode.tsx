import { Collapse, IconButton, Typography } from '@mui/material';
import * as actions from '../../state/checklist/actions';
import { useChecklistSlice } from '../../state/store';
import { Add } from '@mui/icons-material';
import './styles.css';
import { Answer } from '../../types';
import AnswerNode from './AnswerNode';
import { useState } from 'react';
import { QuestionType } from '../../config/enums';

export default function QuestionNode(props: {
	pageId: number;
	questionId: number;
	questionText: string;
	questionType: QuestionType;
	questionAnswers: Answer[];
	level: number;
	idx: number;
}) {
	const { pageId, questionId, questionText, questionType, questionAnswers, level, idx } = props;
	const [expanded, setExpanded] = useState(false);
	const selectedQuestion = useChecklistSlice((state) => state.selectedQuestion);
	let selected = selectedQuestion === questionId;
	let isPlaceholder = questionId === -1;
	return (
		<>
			<div
				style={{ ...styles.node, paddingLeft: level * 15 }}
				onClick={() => actions.updateSelectedQuestion(questionId)}
				className="flex-row-between"
			>
				<div className="flex-row-left">
					{questionId === -1 ? (
						<div style={{ width: 25 }} />
					) : (
						<IconButton
							onClick={(e) => {
								setExpanded((prev) => !prev);
								e.stopPropagation();
								e.preventDefault();
							}}
							disableRipple
						>
							<Add
								sx={{
									transform: expanded === true ? 'rotate(90deg)' : undefined,
									transition: 'transform 100ms ease',
									fontSize: 15,
								}}
							/>
						</IconButton>
					)}
					<Typography
						color={selected ? 'info' : isPlaceholder ? 'primary' : ''}
						fontWeight={isPlaceholder ? 'bold' : ''}
						sx={{ cursor: 'pointer' }}
						className={'node-q'}
					>
						{questionId === -1 ? '' : `${idx + 1}. `}
						{questionText}
						{questionId === -1 ? '' : ` (p${pageId}.q${questionId})`}
					</Typography>
				</div>
			</div>
			<Collapse in={expanded}>
				{[...questionAnswers]
					.sort((a, b) => a.a_order - b.a_order)
					.map((a) => (
						<AnswerNode
							key={`p${pageId}.q${questionId}.a${a.id}`}
							pageId={pageId}
							questionId={questionId}
							answerId={a.id}
							answerText={a.a_text}
							level={level + 1}
						/>
					))}
				{questionType !== QuestionType.FREEFORM && (
					<AnswerNode
						key={`p${pageId}.q${questionId}.a${0}`}
						pageId={pageId}
						questionId={questionId}
						answerId={-1}
						answerText="New Answer"
						level={level + 1}
					/>
				)}
			</Collapse>
		</>
	);
}

const styles = {
	node: {
		width: '100%',
		height: 30,
		borderRadius: 5,
	},
};
