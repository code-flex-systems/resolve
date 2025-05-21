'use client';
import { useShallow } from 'zustand/react/shallow';
import useStore, { useChecklistSlice } from '@/state/store';
import * as actions from '@/state/checklist/actions';
import * as breakdownActions from '@/state/breakdown/actions';
import * as selectors from '@/state/checklist/selectors';
import BasicDialog from '../common/BasicDialog';
import QuestionStatItem from './QuestionStatItem';
import { useState } from 'react';
import { Collapse, Typography } from '@mui/material';
import { Warning } from '@mui/icons-material';
import BasicButton from '../common/BasicButton';
import { useRouter } from 'next/navigation';
import { LineWobble } from 'ldrs/react';
import 'ldrs/react/LineWobble.css';
import theme, { OFFWHITE_COLOR } from '@/styles/theme';
import { IconChartDonutFilled } from '@tabler/icons-react';
import { useQuestionTrpc } from '@/hooks/trpc/useQuestionTrpc';

export default function QuestionStatsDialog() {
	const router = useRouter();
	const checklistId = useChecklistSlice((state) => state.checklist)?.id ?? -1;
	const selectedPageInfo = useStore(useShallow(selectors.selectedPageInfo));
	const { isPending: loading, data = [] } = useQuestionTrpc().getStats({ pageId: selectedPageInfo.pageId });
	const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
	return (
		<BasicDialog
			title={`Breakdown for ${selectedPageInfo.title} (p${selectedPageInfo.pageId})`}
			iconActions={[
				<BasicButton
					buttonProps={{
						onClick: () => {
							// Update breakdown state with pre-loaded data
							breakdownActions.updatePageInstance({
								id: selectedPageInfo.pageId,
								parent_id: selectedPageInfo.parentInstanceId,
								instance_id: selectedPageInfo.instanceId,
								title: selectedPageInfo.title,
							});
							router.push(
								`/checklist/${checklistId}/pages/${selectedPageInfo.pageId}/page-instances/${selectedPageInfo.instanceId}`
							);
						},
					}}
					tooltipProps={{
						title: 'Go to analysis',
					}}
					icon={<IconChartDonutFilled size={21} />}
				/>,
			]}
			onClose={actions.toggleStatsDialog}
			width={600}
			maxHeight={600}
		>
			{loading && (
				<div style={styles.loadingContainer} className="flex-col-center">
					<Typography fontStyle="italic" color="primary">
						Loading...
					</Typography>
					<LineWobble size="200" stroke="5" bgOpacity="0.1" speed="2" color={theme.palette.primary.main} />
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
						pageId={selectedPageInfo.pageId}
						onAnswerClick={() => {}}
						setExpandedIdx={setExpandedIdx}
						bgColor={OFFWHITE_COLOR}
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
