'use client';
import { useChecklistStore } from '@/stores/useChecklistStore';
import { ChecklistMode } from '@/config/enums';
import './styles.css';
import { BASE_COLOR_LIGHT } from '@/styles/theme';
import { IconQuote } from '@tabler/icons-react';

export default function AnswerNode(props: {
	pageId: number;
	questionId: number;
	answerId: number;
	answerText: string;
	level: number;
}) {
	const { pageId, questionId, answerId, answerText, level } = props;
	const mode = useChecklistStore((state) => state.mode);
	const selectedQuestion = useChecklistStore((state) => state.selectedQuestion);
	const selectedAnswer = useChecklistStore((state) => state.selectedAnswer);
	const updateSelectedAnswer = useChecklistStore((state) => state.updateSelectedAnswer);
	const selected = selectedAnswer === answerId && selectedQuestion === questionId;
	const isPlaceholder = answerId === -1;
	return (
		<div
			style={{ ...styles.node, paddingLeft: level * 3.125 * 8 }}
			onClick={mode === ChecklistMode.EDIT ? () => updateSelectedAnswer(questionId, answerId) : undefined}
			className="flex-row-between"
		>
			<div className="flex-row-left">
				<IconQuote size={16} style={{ marginRight: '10px', color: selected ? 'var(--status-warning)' : BASE_COLOR_LIGHT }}
				/>
				<span
					className={isPlaceholder ? 'node-p' : 'node-a'}
					style={{ cursor: 'pointer', color: selected ? 'var(--status-warning)' : isPlaceholder ? '#DAB0FF' : '', fontWeight: isPlaceholder ? 'bold' : '', lineHeight: '19px' }}
				>
					{answerText} (p{pageId}.q{questionId}.a{answerId === -1 ? '?' : answerId})
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
