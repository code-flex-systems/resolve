'use client';
import { useChecklistStore } from '@/stores/useChecklistStore';
import { ChecklistMode } from '@/config/enums';
import './styles.css';
import { IconQuote } from '@tabler/icons-react';

export default function AnswerNode(props: {
	pagePosition: number;
	questionPosition: number;
	answerPosition: number;
	questionId: string;
	answerId: string;
	answerText: string;
	level: number;
}) {
	const { pagePosition, questionPosition, answerPosition, questionId, answerId, answerText, level } = props;
	const mode = useChecklistStore((state) => state.mode);
	const selectedQuestion = useChecklistStore((state) => state.selectedQuestion);
	const selectedAnswer = useChecklistStore((state) => state.selectedAnswer);
	const updateSelectedAnswer = useChecklistStore((state) => state.updateSelectedAnswer);
	const selected = selectedAnswer === answerId;
	const isPlaceholder = answerId === '';
	return (
		<div
			style={{ ...styles.node, paddingLeft: level * 3.125 * 8 }}
			onClick={mode === ChecklistMode.EDIT ? () => updateSelectedAnswer(questionId, answerId) : undefined}
			className="flex-row-between"
		>
			<div className="flex-row-left">
				<IconQuote size={16} style={{ marginRight: '10px', color: selected ? 'var(--status-warning)' : 'var(--text-muted)' }}
				/>
				<span
					className={isPlaceholder ? 'node-p' : 'node-a'}
					style={{ cursor: 'pointer', color: selected ? 'var(--status-warning)' : isPlaceholder ? 'var(--text-muted)' : '', fontWeight: isPlaceholder ? 'bold' : '', fontStyle: isPlaceholder ? 'italic' : undefined, lineHeight: '19px' }}
				>
					{answerText} (p{pagePosition}.q{questionPosition}.a{answerId === '' ? '?' : answerPosition})
				</span>
			</div>
		</div>
	);
}

const styles = {
	node: {
		width: '100%',
		minHeight: 30,
		paddingTop: 5,
		paddingBottom: 5,
	} as React.CSSProperties,
};
