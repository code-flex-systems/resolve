import { useShallow } from 'zustand/react/shallow';
import { useQuestionStats } from '../../api/queries/page-queries';
import useStore from '../../state/store';
import * as actions from '../../state/checklist/actions';
import * as selectors from '../../state/checklist/selectors';
import BasicDialog from '../common/BasicDialog';
import QuestionStatItem from './QuestionStatItem';
import { useState } from 'react';
import { Collapse, Typography } from '@mui/material';

export default function QuestionStatsDialog() {
	const selectedPageInfo = useStore(useShallow(selectors.selectedPageInfo));
	const { isPending: loading, data = [] } = useQuestionStats(selectedPageInfo.pageId, true);
	const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
	return (
		<BasicDialog
			title={`Breakdown for ${selectedPageInfo.title} (p${selectedPageInfo.pageId})`}
			onClose={actions.toggleStatsDialog}
			width={600}
			maxHeight={600}
		>
			{loading && (
				<div style={styles.loadingContainer} className="flex-row-center">
					<Typography fontStyle="italic">Loading...</Typography>
				</div>
			)}
			<Collapse in={!loading}>
				{data.map((stat, i) => (
					<QuestionStatItem
						key={i}
						expandedIdx={expandedIdx}
						idx={i}
						item={stat}
						setExpandedIdx={setExpandedIdx}
					/>
				))}
			</Collapse>
		</BasicDialog>
	);
}

const styles = {
	loadingContainer: {
		width: '100%',
		height: 50,
	},
};
