'use client';
import { useChecklistStore, getSelectedPageInfoOrDefault } from '@/stores/useChecklistStore';
import BasicDialog from '../common/BasicDialog';
import QuestionStatItem from './QuestionStatItem';
import { useState } from 'react';
import BasicButton from '../common/BasicButton';
import { useRouter } from 'next/navigation';
import { OFFWHITE_COLOR } from '@/styles/theme';
import { IconAlertTriangle, IconChartDonutFilled } from '@tabler/icons-react';
import { useQuestionTrpc } from '@/hooks/trpc/useQuestionTrpc';
import { useChecklistParams } from '@/hooks/useChecklistParams';
import Skeleton from '@/components/ui/Skeleton';
import Collapse from '@/components/ui/Collapse';

export default function QuestionStatsDialog() {
	const router = useRouter();
	const { checklistId = -1 } = useChecklistParams();
	const selectedPageInfo = getSelectedPageInfoOrDefault();
	const toggleStatsDialog = useChecklistStore((state) => state.toggleStatsDialog);
	const { isPending: loading, data = [] } = useQuestionTrpc().getStats({ pageId: selectedPageInfo.pageId });
	const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
	return (
		<BasicDialog
			title={`Breakdown for ${selectedPageInfo.title} (p${selectedPageInfo.pageId})`}
			iconActions={[
				<BasicButton
					buttonProps={{
						onClick: () => {
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
			onClose={toggleStatsDialog}
			width={600}
			maxHeight={600}>
			{loading && (
				<div style={{ gap: 16, padding: 16 }}>
					{[1, 2, 3].map((i) => (
						<Skeleton key={i} variant="rect" height={60} />
					))}
				</div>
			)}
			<Collapse open={!loading}>
				<div className="flex-row-left" style={styles.row}>
					<IconAlertTriangle size={20} style={{ color: 'warning.main' }} />
					<span style={{ color: 'warning', fontStyle: 'italic', marginLeft: '5px' }}>
						This summary only shows responses for the last <b>30</b> days.
					</span>
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
	row: {
		padding: 10,
	},
};
