'use client';
import { Typography } from '@mui/material';
import { useChecklistStore } from '@/stores/useChecklistStore';
import { ChecklistMode } from '@/config/enums';
import './styles.css';
import theme, { BASE_COLOR_LIGHT } from '@/styles/theme';
import FormatQuote from '@mui/icons-material/FormatQuote';

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
			style={{ ...styles.node, paddingLeft: level * 25 }}
			onClick={mode === ChecklistMode.EDIT ? () => updateSelectedAnswer(questionId, answerId) : undefined}
			className="flex-row-between"
		>
			<div className="flex-row-left">
				<FormatQuote
					sx={{ fontSize: 16, marginRight: '10px', color: selected ? 'warning.main' : BASE_COLOR_LIGHT }}
				/>
				<Typography
					color={selected ? theme.palette.warning.light : isPlaceholder ? '#DAB0FF' : ''}
					fontWeight={isPlaceholder ? 'bold' : ''}
					className={isPlaceholder ? 'node-p' : 'node-a'}
					lineHeight="19px"
					sx={{ cursor: 'pointer' }}
				>
					{answerText} (p{pageId}.q{questionId}.a{answerId === -1 ? '?' : answerId})
				</Typography>
			</div>
		</div>
	);
}

const styles = {
	node: {
		width: '100%',
		minHeight: 30,
		padding: '5px 0px',
	},
};
