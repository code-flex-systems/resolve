import { useShallow } from 'zustand/react/shallow';
import useStore, { useChecklistSlice } from '../../state/store';
import * as selectors from '../../state/checklist/selectors';
import { Divider, Typography } from '@mui/material';
import FormQuestion from './FormQuestion';
import FormAnswer from './FormAnswer';
import Toolbar from '../common/Toolbar';
import { Description } from '@mui/icons-material';

export default function PageEditor() {
	const selectedAnswer = useChecklistSlice((state) => state.selectedAnswer);
	const selectedQuestion = useChecklistSlice((state) => state.selectedQuestion);
	const selectedPageData = useStore(useShallow(selectors.selectedPageData));
	const selectedPageInfo = useStore(useShallow(selectors.selectedPageInfo));

	return (
		<div style={styles.container}>
			{!!selectedPageData && !selectedQuestion && !selectedAnswer && (
				<>
					<Toolbar
						left={
							<>
								<Description sx={{ color: 'primary.main', fontSize: 20, marginRight: '5px' }} />
								<Typography fontSize={20}>
									{selectedPageInfo.title} (p{selectedPageInfo.pageId})
								</Typography>
							</>
						}
						padding={0}
					/>
					<div style={styles.divider}>
						<Divider />
					</div>
					<Typography fontStyle="italic">Questions: {selectedPageData?.length ?? 0}</Typography>
				</>
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
	divider: {
		width: '100%',
		height: 1,
		marginBottom: 5,
	},
};
