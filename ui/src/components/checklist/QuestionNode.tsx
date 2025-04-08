import { Collapse, IconButton, Typography } from '@mui/material';
import * as actions from '../../state/checklist/actions';
import { useChecklistSlice } from '../../state/store';
import { Add } from '@mui/icons-material';
import './styles.css';
import { Answer } from '../../types';
import AnswerNode from './AnswerNode';
import { useState } from 'react';
import { ChecklistMode } from '../../config/enums';

export default function QuestionNode(props: {
	pageId: number;
	questionId: number;
	questionText: string;
	questionAnswers: Answer[];
	level: number;
	idx: number;
}) {
	const { pageId, questionId, questionText, questionAnswers, level, idx } = props;
	const [expanded, setExpanded] = useState(false);
	const mode = useChecklistSlice((state) => state.mode);
	const selectedQuestion = useChecklistSlice((state) => state.selectedQuestion);
	let selected = selectedQuestion === questionId;
	let isPlaceholder = questionId === -1;
	return (
		<>
			<div
				style={{ ...styles.node, paddingLeft: level * 15 }}
				onClick={mode === ChecklistMode.EDIT ? () => actions.updateSelectedQuestion(questionId) : undefined}
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
						className={mode === ChecklistMode.EDIT ? 'node-q' : undefined}
					>
						{questionText}
						{questionId === -1 || mode === ChecklistMode.VIEW ? '' : ` (p${pageId}.q${questionId})`}
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
				{mode === ChecklistMode.EDIT && (
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
