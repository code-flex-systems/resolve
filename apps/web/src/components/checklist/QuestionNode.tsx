'use client';
import { useChecklistStore } from '@/stores/useChecklistStore';
import './styles.css';
import AnswerNode from './AnswerNode';
import { useEffect, useState } from 'react';
import { Answer } from '@/types/types';
import { QuestionType } from '@/config/enums';
import { IconCircleMinus, IconHelpCircle } from '@tabler/icons-react';
import Collapse from '@/components/ui/Collapse';

export default function QuestionNode(props: {
	pagePosition: number;
	questionId: string;
	questionText: string;
	questionType?: QuestionType;
	questionAnswers: Answer[];
	level: number;
	idx: number;
}) {
	const { pagePosition, questionId, questionText, questionType, questionAnswers, level, idx } =
		props;
	const [expanded, setExpanded] = useState(false);
	const expandAll = useChecklistStore((state) => state.expandAll);
	const selectedQuestion = useChecklistStore((state) => state.selectedQuestion);
	const updateSelectedQuestion = useChecklistStore((state) => state.updateSelectedQuestion);
	const selected = selectedQuestion === questionId;
	const isPlaceholder = questionId === '';

	useEffect(() => setExpanded(expandAll), [expandAll]);

	return (
		<>
			<div
				style={{ ...styles.node, paddingLeft: level * 1.875 * 8, paddingRight: 10 }}
				onClick={() => updateSelectedQuestion(questionId)}
				className="flex-row-between"
			>
				<div className="flex-row-left">
					<IconHelpCircle
						size={16}
						style={{ marginRight: '10px', color: selected ? 'var(--text-accent)' : '' }}
					/>
					<span
						className={isPlaceholder ? 'node-p' : 'node-q'}
						style={{
							cursor: 'pointer',
							color: selected ? 'var(--status-success)' : isPlaceholder ? 'var(--text-muted)' : '',
							fontWeight: isPlaceholder ? 'bold' : '',
							fontStyle: isPlaceholder ? 'italic' : undefined,
							lineHeight: '19px',
						}}
					>
						{questionId !== '' ? `${idx + 1}. ` : ''}
						{questionText} (p{pagePosition}.q{questionId === '' ? '?' : idx + 1})
					</span>
				</div>
				{questionId === '' || questionType === QuestionType.FREEFORM ? (
					<div style={{ width: 25 }} />
				) : (
					<button
						style={{
							background: 'none',
							border: 'none',
							padding: '2px',
							cursor: 'pointer',
							display: 'flex',
							alignItems: 'center',
						}}
						onClick={(e) => {
							setExpanded((prev) => !prev);
							e.stopPropagation();
							e.preventDefault();
						}}
					>
						<IconCircleMinus
							size={14}
							style={{
								transform: expanded === true ? 'rotate(90deg)' : undefined,
								transition: 'transform 100ms ease',
								color: 'var(--text-muted)',
							}}
						/>
					</button>
				)}
			</div>
			<Collapse open={expanded}>
				<span>
					{[...questionAnswers]
						.sort((a, b) => a.position - b.position)
						.map((a, i) => (
							<AnswerNode
								key={i}
								pagePosition={pagePosition}
								questionPosition={idx + 1}
								answerPosition={i + 1}
								questionId={questionId}
								answerId={a.id}
								answerText={a.text}
								level={level + 1}
							/>
						))}
					{questionId !== '' && questionType !== QuestionType.FREEFORM && (
						<AnswerNode
							key="new"
							pagePosition={pagePosition}
							questionPosition={idx + 1}
							answerPosition={0}
							questionId={questionId}
							answerId=""
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
