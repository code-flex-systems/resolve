import { Box, LinearProgress, linearProgressClasses, Typography } from '@mui/material';
import BasicDialog from '../common/BasicDialog';
import { InfoOutlined } from '@mui/icons-material';
import { useChecklistParams } from '@/hooks/useChecklistParams';
import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import theme from '@/styles/theme';
import BasicButtonStyled from '../common/BasicButtonStyled';
import { toggleChecklistProgressDialog } from '@/state/checklist/actions';
import ExpandableTitle from '../common/ExpandableTitle';
import CheckGradient from '../common/CheckGradient';

export default function ChecklistProgressDialog() {
	const { checklistId = -1, claimId = -1 } = useChecklistParams();
	const { data: progress = { answerCount: 0, totalQuestionCount: 0 } } = useChecklistTrpc().progress(
		{ checklistId, claimId },
		{ enabled: checklistId !== -1 && claimId !== -1 }
	);
	const progressPercentage =
		progress.totalQuestionCount > 0 ? Math.floor((progress.answerCount / progress.totalQuestionCount) * 100) : 0;

	return (
		<BasicDialog
			title={<ExpandableTitle icon={<CheckGradient sx={{ fontSize: 25 }} />} title="Progress" color="white" />}
			onClose={toggleChecklistProgressDialog}
			width={400}
		>
			<Box display="flex" justifyContent="flex-start" alignItems="center" paddingBottom="15px">
				<BasicButtonStyled
					buttonProps={{}}
					icon={<InfoOutlined />}
					tooltipProps={{
						title: 'Answering additional questions or changing your existing responses may alter this metric.',
						placement: 'bottom-start',
						arrow: true,
					}}
				/>
				<Typography marginLeft="10px">
					You've answered <b>{progressPercentage}%</b> of this checklist.
				</Typography>
			</Box>
			<LinearProgress
				value={progressPercentage}
				variant="determinate"
				sx={{
					height: 8,
					borderRadius: 2,
					bgcolor: `rgba(76, 175, 79, 0.4)`,

					[`& .${linearProgressClasses.bar1}`]: {
						backgroundColor: theme.palette.success.light,
						transition: 'transform 500ms ease',
						borderRadius: 2,
					},
					marginBottom: '20px',
				}}
			/>
		</BasicDialog>
	);
}
