import { useEffect } from 'react';
import { usePageInstance, useQuestionStats } from '../../api/queries/page-queries';
import PageWrapper from '../common/PageWrapper';
import { useBreakdownSlice } from '../../state/store';
import { useParams } from 'react-router';
import * as actions from '../../state/breakdown/actions';
import BreakdownNavigation from '../breakdown/BreakdownNavigation';
import Breakdown from '../breakdown/Breakdown';
import { generateIntervalKey } from '../../utils/utils';

export default function ChecklistPageBreakdown() {
	const { checklistId, pageId, instanceId } = useParams<{
		checklistId?: string;
		pageId?: string;
		instanceId?: string;
	}>();
	const breakdownInterval = useBreakdownSlice((state) => state.breakdownInterval);
	const pageInstance = useBreakdownSlice((state) => state.pageInstance);
	const questionStats = useBreakdownSlice((state) => state.questionStats).get(
		generateIntervalKey(+(pageId ?? '-1'), breakdownInterval.from, breakdownInterval.to)
	);
	const { isFetching: loadingPage } = usePageInstance(
		+(checklistId ?? '-1'),
		+(pageId ?? '-1'),
		actions.updatePageInstance,
		!pageInstance
	);
	const { isFetching: loadingStats, refetch: refetchQuestionStats } = useQuestionStats(
		pageId ? +pageId : null,
		!questionStats,
		actions.updateQuestionStats,
		breakdownInterval
	);

	return (
		<PageWrapper route="breakdown">
			{!checklistId || !pageId || !instanceId ? (
				<></>
			) : (
				<div style={styles.container}>
					<BreakdownNavigation
						pageId={+pageId}
						refetchQuestionStats={refetchQuestionStats}
						loadingPage={loadingPage}
						loadingStats={loadingStats}
					/>
					<Breakdown />
				</div>
			)}
		</PageWrapper>
	);
}

const styles = {
	container: {
		width: '100%',
		height: '100%',
		display: 'flex',
		justifyContent: 'flex-start',
		alignItems: 'flex-start',
	},
};
