'use client';

import { ProgressBar } from '@/components/ui/Progress';
import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import useIsAssigned from '@/hooks/useIsAssigned';
import { IconInfoCircle } from '@tabler/icons-react';
import Skeleton from '@/components/ui/Skeleton';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';

export default function ChecklistProgress({
	checklistId,
	claimId,
	width,
	fontSize = 17,
	showInfo = true,
}: {
	checklistId: string;
	claimId: string;
	width: number;
	fontSize?: number;
	showInfo?: boolean;
}) {
	const isAssigned = useIsAssigned();
	const { data: progress = { answerCount: 0, totalQuestionCount: 0 }, isFetching: isFetchingProgress } =
		useChecklistTrpc().progress({ checklistId, claimId }, { enabled: !!checklistId && !!claimId });

	const progressPercentage =
		progress.totalQuestionCount > 0 ? Math.floor((progress.answerCount / progress.totalQuestionCount) * 100) : 0;

	return (
		<>
			<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', paddingBottom: '15px' }}>
				{showInfo && (
					<Tooltip
						content="isAssigned
								? 'Answering additional questions or changing your existing responses will alter this metric.'
								: 'If additional questions are answered or existing responses are changed, this metric will update.'"
						position="bottom"
					>
						<Button variant="icon" size="sm" color="neutral">
							<IconInfoCircle size={16} />
						</Button>
					</Tooltip>
				)}
				<span style={{ fontSize: fontSize, marginLeft: '10px' }}>
					{isFetchingProgress ? (
						<>Checking progress...</>
					) : isAssigned ? (
						<>
							You've answered <b>{progressPercentage}%</b> of this checklist.
						</>
					) : (
						<>
							<b>{progressPercentage}%</b> of this checklist has been answered.
						</>
					)}
				</span>
			</div>
			<div style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
				<ProgressBar value={isFetchingProgress ? undefined : progressPercentage} color="success" />
			</div>
		</>
	);
}
