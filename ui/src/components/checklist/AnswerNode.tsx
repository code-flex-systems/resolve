import { Typography } from '@mui/material';
import * as actions from '../../state/checklist/actions';
import { useChecklistSlice } from '../../state/store';
import { ChecklistMode, QuestionType } from '../../config/enums';
import './styles.css';

export default function AnswerNode(props: {
	pageId: number;
	questionId: number;
	answerId: number;
	answerText: string;
	level: number;
}) {
	const { pageId, questionId, answerId, answerText, level } = props;
	const mode = useChecklistSlice((state) => state.mode);
	const selectedAnswer = useChecklistSlice((state) => state.selectedAnswer);
	let selected = selectedAnswer === answerId;
	let isPlaceholder = answerId === -1;
	return (
		<div
			style={{ ...styles.node, paddingLeft: level * 25 }}
			onClick={mode === ChecklistMode.EDIT ? () => actions.updateSelectedAnswer(questionId, answerId) : undefined}
			className="flex-row-between"
		>
			<div className="flex-row-left">
				<Typography
					color={selected ? 'info' : isPlaceholder ? 'primary' : ''}
					fontWeight={isPlaceholder ? 'bold' : ''}
					className={mode === ChecklistMode.EDIT ? 'node-q' : undefined}
					sx={{ cursor: 'pointer' }}
				>
					{answerText}
					{answerId === -1 || mode === ChecklistMode.VIEW ? '' : ` (p${pageId}.q${questionId}.a${answerId})`}
				</Typography>
			</div>
		</div>
	);
}

const styles = {
	node: {
		width: '100%',
		height: 30,
		borderRadius: 5,
	},
};
