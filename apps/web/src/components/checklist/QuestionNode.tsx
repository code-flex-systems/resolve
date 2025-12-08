'use client';
import { Box, Collapse, IconButton, Typography } from '@mui/material';
import { useChecklistStore } from '@/stores/useChecklistStore';
import RemoveCircleOutline from '@mui/icons-material/RemoveCircleOutline';
import './styles.css';
import AnswerNode from './AnswerNode';
import { useEffect, useState } from 'react';
import { Answer } from '@/types/types';
import HelpOutline from '@mui/icons-material/HelpOutline';
import { QuestionType } from '@/config/enums';

export default function QuestionNode(props: {
	pageId: number;
	questionId: number;
	questionText: string;
	questionType?: QuestionType;
	questionAnswers: Answer[];
	level: number;
	idx: number;
}) {
	const { pageId, questionId, questionText, questionType, questionAnswers, level, idx } = props;
	const [expanded, setExpanded] = useState(false);
	const expandAll = useChecklistStore((state) => state.expandAll);
	const selectedQuestion = useChecklistStore((state) => state.selectedQuestion);
	const updateSelectedQuestion = useChecklistStore((state) => state.updateSelectedQuestion);
	const selected = selectedQuestion === questionId;
	const isPlaceholder = questionId === -1;

	useEffect(() => setExpanded(expandAll), [expandAll]);

	return (
		<>
			<Box
				sx={{ ...styles.node, pl: level * 1.875, pr: 1.25 }}
				onClick={() => updateSelectedQuestion(questionId)}
				className="flex-row-between"
			>
				<Box className="flex-row-left">
					<HelpOutline sx={{ fontSize: 16, marginRight: '10px', color: selected ? 'secondary.main' : '' }} />
					<Typography
						color={selected ? '#5BBEAE' : isPlaceholder ? '#DAB0FF' : ''}
						fontWeight={isPlaceholder ? 'bold' : ''}
						lineHeight="19px"
						sx={{ cursor: 'pointer' }}
						className={isPlaceholder ? 'node-p' : 'node-q'}
					>
						{questionId !== -1 ? `${idx + 1}. ` : ''}
						{questionText} (p{pageId}.q{questionId === -1 ? '?' : questionId})
					</Typography>
				</Box>
				{questionId === -1 || questionType === QuestionType.FREEFORM ? (
					<Box sx={{ width: 25 }} />
				) : (
					<IconButton
						onClick={(e) => {
							setExpanded((prev) => !prev);
							e.stopPropagation();
							e.preventDefault();
						}}
						disableRipple
					>
						<RemoveCircleOutline
							sx={{
								transform: expanded === true ? 'rotate(90deg)' : undefined,
								transition: 'transform 100ms ease',
								fontSize: 17,
							}}
						/>
					</IconButton>
				)}
			</Box>
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
					{questionId !== -1 && questionType !== QuestionType.FREEFORM && (
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
		py: 1.25,
	},
};
