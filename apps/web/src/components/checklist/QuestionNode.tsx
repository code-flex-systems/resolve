'use client';
import Button from '@/components/ui/Button';
import { useChecklistStore } from '@/stores/useChecklistStore';
import './styles.css';
import AnswerNode from './AnswerNode';
import { useEffect, useState } from 'react';
import { Answer } from '@/types/types';
import { QuestionType } from '@/config/enums';
import { IconCircleMinus, IconHelpCircle } from '@tabler/icons-react';
import Collapse from '@/components/ui/Collapse';

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
			<div
				style={{ ...styles.node, paddingLeft: level * 1.875 * 8, paddingRight: 10 }}
				onClick={() => updateSelectedQuestion(questionId)}
				className="flex-row-between"
			>
				<div className="flex-row-left">
					<IconHelpCircle size={16} style={{ marginRight: '10px', color: selected ? 'var(--text-accent)' : '' }} />
					<span
						className={isPlaceholder ? 'node-p' : 'node-q'}
						style={{ cursor: 'pointer', color: selected ? '#5BBEAE' : isPlaceholder ? '#DAB0FF' : '', fontWeight: isPlaceholder ? 'bold' : '', lineHeight: '19px' }}
					>
						{questionId !== -1 ? `${idx + 1}. ` : ''}
						{questionText} (p{pageId}.q{questionId === -1 ? '?' : questionId})
					</span>
				</div>
				{questionId === -1 || questionType === QuestionType.FREEFORM ? (
					<div style={{ width: 25 }} />
				) : (
					<Button
						variant="icon"
						size="sm"
						onClick={(e) => {
							setExpanded((prev) => !prev);
							e.stopPropagation();
							e.preventDefault();
						}}
					>
						<IconCircleMinus
						 style={{
								transform: expanded === true ? 'rotate(90deg)' : undefined,
								transition: 'transform 100ms ease',
								fontSize: 17,
							}}
						/>
					</Button>
				)}
			</div>
			<Collapse open={expanded}>
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
		paddingTop: 10,
		paddingBottom: 10,
	} as React.CSSProperties,
};
