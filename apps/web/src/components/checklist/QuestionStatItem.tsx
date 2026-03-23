'use client';
import Accordion from '@/components/ui/Accordion';
import { QuestionStat } from '@/types/types';

export default function QuestionStatItem(props: {
	bgColor?: string;
	expandedIdx: number | null;
	idx: number;
	item: QuestionStat;
	onAnswerClick: (id: string) => void;
	pagePosition: number;
	selectedAnswerId?: string;
	setExpandedIdx: (newIdx: number | null) => void;
}) {
	const { bgColor, expandedIdx, idx, item, onAnswerClick, pagePosition, selectedAnswerId, setExpandedIdx } = props;
	const { question_id, question_text, answers } = item;
	const expanded = expandedIdx === idx;

	return (
		<div style={{ backgroundColor: bgColor, borderTopLeftRadius: idx === 0 ? 6 : undefined, borderTopRightRadius: idx === 0 ? 6 : undefined }}>
			<Accordion
				title={`${question_text} (p${pagePosition}.q${idx + 1})`}
				defaultOpen={false}
			>
				{answers.map((a, ai) => (
					<div key={a.answer_id} className="flex-col-left" style={styles.container}>
						<div className="flex-row-left" style={styles.container}>
							<div
								style={{
									...styles.dot,
									backgroundColor:
										selectedAnswerId === a.answer_id ? 'var(--text-accent)' : '#EBEBEB',
									transition: 'background-color 300ms ease',
									display: 'flex',
									justifyContent: 'center',
									alignItems: 'center',
								}}
							>
								<span style={{ fontSize: 12, color: selectedAnswerId === a.answer_id ? 'white' : undefined }}>
									{a.answer_count.toLocaleString()}
								</span>
							</div>
							{a.answer_count > 0 ? (
								<button
									className="link"
									style={{ marginLeft: '10px', background: 'none', border: 'none', padding: 0, font: 'inherit', color: selectedAnswerId === a.answer_id ? 'var(--status-success)' : 'var(--text-accent)', cursor: 'pointer' }}
									onClick={() => onAnswerClick(a.answer_id)}
								>
									{a.answer_text} (p{pagePosition}.q{idx + 1}.a{ai + 1})
								</button>
							) : (
								<span style={{ marginLeft: '10px' }}>
									{a.answer_text} (p{pagePosition}.q{idx + 1}.a{ai + 1})
								</span>
							)}
						</div>
					</div>
				))}
			</Accordion>
		</div>
	);
}

const styles = {
	container: {
		width: '100%',
		height: 30,
	},
	dot: {
		minWidth: 40,
		height: 21,
		borderRadius: 5,
		cursor: 'pointer',
	},
};
