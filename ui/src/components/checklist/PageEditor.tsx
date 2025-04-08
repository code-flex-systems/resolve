import { useShallow } from 'zustand/react/shallow';
import useStore, { useChecklistSlice } from '../../state/store';
import * as selectors from '../../state/checklist/selectors';
import { Typography } from '@mui/material';
import FormQuestion from './FormQuestion';
import FormAnswer from './FormAnswer';

export default function PageEditor() {
	const selectedAnswer = useChecklistSlice((state) => state.selectedAnswer);
	const selectedQuestion = useChecklistSlice((state) => state.selectedQuestion);
	const selectedPageData = useStore(useShallow(selectors.selectedPageData));

	return (
		<div style={styles.container}>
			{!!selectedPageData && !selectedQuestion && !selectedAnswer && (
				<Typography fontStyle="italic">Questions: {selectedPageData?.length ?? 0}</Typography>
			)}
			{selectedQuestion && !selectedAnswer && <FormQuestion />}
			{!!selectedAnswer && <FormAnswer />}
		</div>
	);
}

const styles = {
	container: {
		width: '100%',
		height: '100%',
		display: 'flex',
		flexDirection: 'column' as const,
		justifyContent: 'flex-start',
		alignItems: 'flex-start',
		padding: 20,
	},
};
