'use client';

import { Box, LinearProgress, linearProgressClasses, Skeleton, Typography } from '@mui/material';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import theme from '@/styles/theme';
import BasicButtonStyled from '../common/BasicButtonStyled';
import useIsAssigned from '@/hooks/useIsAssigned';

export default function ChecklistProgress({
	checklistId,
	claimId,
	width,
	fontSize = 17,
	showInfo = true,
}: {
	checklistId: number;
	claimId: number;
	width: number;
	fontSize?: number;
	showInfo?: boolean;
}) {
	const isAssigned = useIsAssigned();
	const { data: progress = { answerCount: 0, totalQuestionCount: 0 }, isFetching: isFetchingProgress } =
		useChecklistTrpc().progress({ checklistId, claimId }, { enabled: checklistId !== -1 && claimId !== -1 });

	const progressPercentage =
		progress.totalQuestionCount > 0 ? Math.floor((progress.answerCount / progress.totalQuestionCount) * 100) : 0;

	return (
		<>
			<Box display="flex" justifyContent="center" alignItems="center" paddingBottom="15px">
				{showInfo && (
					<BasicButtonStyled
						buttonProps={{}}
						icon={<InfoOutlined />}
						tooltipProps={{
							title: isAssigned
								? 'Answering additional questions or changing your existing responses will alter this metric.'
								: 'If additional questions are answered or existing responses are changed, this metric will update.',
							placement: 'bottom-start',
							arrow: true,
						}}
					/>
				)}
				<Typography fontSize={fontSize} marginLeft="10px">
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
				</Typography>
			</Box>
			<Box width="100%" display="flex" justifyContent="center" alignItems="center">
				<LinearProgress
					value={isFetchingProgress ? undefined : progressPercentage}
					variant={isFetchingProgress ? 'indeterminate' : 'determinate'}
					sx={{
						width,
						height: 5,
						borderRadius: 2,
						bgcolor: `rgba(76, 175, 79, 0.4)`,
						[`& .${linearProgressClasses.bar1}`]: {
							backgroundColor: theme.palette.success.light,
							transition: 'transform 500ms ease',
							borderRadius: 2,
						},
					}}
				/>
			</Box>
		</>
	);
}
