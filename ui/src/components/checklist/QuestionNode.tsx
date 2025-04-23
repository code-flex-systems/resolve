import { Collapse, IconButton, Typography } from '@mui/material';
import * as actions from '../../state/checklist/actions';
import { useChecklistSlice } from '../../state/store';
import { Add } from '@mui/icons-material';
import './styles.css';
import { Answer } from '../../types';
import AnswerNode from './AnswerNode';
import { useEffect, useState } from 'react';
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
	const expandAll = useChecklistSlice((state) => state.expandAll);
	const selectedQuestion = useChecklistSlice((state) => state.selectedQuestion);
	let selected = selectedQuestion === questionId;
	let isPlaceholder = questionId === -1;

	useEffect(() => setExpanded(expandAll), [expandAll]);

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
						{questionId === -1 ? '' : <b>{idx + 1}. </b>}
						{questionText} (p{pageId}.q{questionId === -1 ? '?' : questionId})
					</Typography>
				</div>
			</div>
			<Collapse in={expanded} unmountOnExit>
				{[...questionAnswers]
					.sort((a, b) => a.position - b.position)
					.map((a, i) => (
						<AnswerNode
							key={i}
							pageId={pageId}
							questionId={questionId}
							answerId={a.id}
							answerText={a.text}
							level={level + 1}
						/>
					))}
				{questionId !== -1 && (
					<AnswerNode
						key={-1}
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
