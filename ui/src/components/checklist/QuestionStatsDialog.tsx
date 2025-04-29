import { useShallow } from 'zustand/react/shallow';
import { useQuestionStats } from '../../api/queries/page-queries';
import useStore, { useChecklistSlice } from '../../state/store';
import * as actions from '../../state/checklist/actions';
import * as selectors from '../../state/checklist/selectors';
import BasicDialog from '../common/BasicDialog';
import QuestionStatItem from './QuestionStatItem';
import { useState } from 'react';
import { Collapse, IconButton, Typography } from '@mui/material';
import { OpenInNew, Warning } from '@mui/icons-material';
import BasicButton from '../common/BasicButton';
import { useNavigate } from 'react-router';

export default function QuestionStatsDialog() {
	const navigate = useNavigate();
	const checklistId = useChecklistSlice((state) => state.checklist)?.id ?? -1;
	const selectedPageInfo = useStore(useShallow(selectors.selectedPageInfo));
	const { isPending: loading, data = [] } = useQuestionStats(selectedPageInfo.pageId, true);
	const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
	return (
		<BasicDialog
			title={`Breakdown for ${selectedPageInfo.title} (p${selectedPageInfo.pageId})`}
			iconActions={[
				<BasicButton
					buttonProps={{
						onClick: () => {
							navigate(`/checklist/${checklistId}/page-instances/${selectedPageInfo.instanceId}`);
						},
					}}
					tooltipProps={{
						title: 'Go to analysis',
					}}
					icon={<OpenInNew />}
				/>,
			]}
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
				<div style={styles.row} className="flex-row-left">
					<Warning sx={{ color: 'warning.main' }} />
					<Typography color="warning" fontStyle="italic" marginLeft="5px">
						This summary only shows responses for the last <b>30</b> days.
					</Typography>
				</div>
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
	row: {
		padding: 10,
	},
};
