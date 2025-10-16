'use client';
import { Collapse, IconButton, Typography } from '@mui/material';
import { useChecklistStore } from '@/stores/useChecklistStore';
import { Add } from '@mui/icons-material';
import './styles.css';
import { Answer } from '@/types/types';
import AnswerNode from './AnswerNode';
import { useEffect, useState } from 'react';

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
	const expandAll = useChecklistStore((state) => state.expandAll);
	const selectedQuestion = useChecklistStore((state) => state.selectedQuestion);
	const updateSelectedQuestion = useChecklistStore((state) => state.updateSelectedQuestion);
	const selected = selectedQuestion === questionId;
	const isPlaceholder = questionId === -1;

	useEffect(() => setExpanded(expandAll), [expandAll]);

	return (
		<>
			<div
				style={{ ...styles.node, paddingLeft: level * 15 }}
				onClick={() => updateSelectedQuestion(questionId)}
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
					{questionId !== -1 && (
						<Typography fontWeight="bold" paddingRight="10px">
							{idx + 1}.
						</Typography>
					)}
					<Typography
						color={selected ? 'primary' : isPlaceholder ? 'secondary' : ''}
						fontWeight={isPlaceholder ? 'bold' : ''}
						lineHeight="19px"
						sx={{ cursor: 'pointer' }}
						className={'node-q'}
					>
						{questionText} (p{pageId}.q{questionId === -1 ? '?' : questionId})
					</Typography>
				</div>
			</div>
			<Collapse in={expanded} unmountOnExit>
				<span>
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
				</span>
			</Collapse>
		</>
	);
}

const styles = {
	node: {
		width: '100%',
		minHeight: 30,
		padding: '5px 0px',
	},
};
