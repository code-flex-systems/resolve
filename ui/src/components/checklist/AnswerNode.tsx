import { Typography } from '@mui/material';
import * as actions from '../../state/checklist/actions';
import { useChecklistSlice } from '../../state/store';
import { ChecklistMode } from '../../config/enums';
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
	const selectedQuestion = useChecklistSlice((state) => state.selectedQuestion);
	const selectedAnswer = useChecklistSlice((state) => state.selectedAnswer);
	let selected = selectedAnswer === answerId && selectedQuestion === questionId;
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
					{answerText} (p{pageId}.q{questionId}.a{answerId === -1 ? '?' : answerId})
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
