'use client';
import { Box, Stack, Typography } from '@mui/material';
import { BG_TERTIARY } from '@/styles/theme';
import { useRouter } from 'next/navigation';
import Toolbar from '@/components/common/Toolbar';
import SummaryChart from '@/components//summary/SummaryChart';
import ClaimInfo from '@/components/checklist/ClaimInfo';
import SummaryDetails from '@/components/summary/SummaryDetails';
import BasicButtonStyled from '../common/BasicButtonStyled';
import ChecklistInfo from '../checklist/ChecklistInfo';
import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import { useChecklistParams } from '@/hooks/useChecklistParams';
import { IconArrowLeft, IconChecklist } from '@tabler/icons-react';
import Divider from '@/components/ui/Divider';

export default function Summary() {
	const router = useRouter();
	const { checklistId } = useChecklistParams();
	const { data: checklist } = useChecklistTrpc().get({ id: checklistId! }, { enabled: checklistId !== -1 });

	return (
		<Stack flex={1} width="100%" display="flex" justifyContent="flex-start" alignItems="flex-start" padding="10px">
			<Toolbar
				left={
					<>
						<Box marginRight="5px">
							<BasicButtonStyled
								icon={<IconArrowLeft size={20} />}
								buttonProps={{ onClick: () => router.back() }}
								tooltipProps={{ title: 'Back to checklist' }}
							/>
						</Box>
						<IconChecklist size={20} />
						<Typography variant="h6" ml={0.5} mr={1}>
							{checklist?.name}
						</Typography>
						<ClaimInfo />
					</>
				}
				padding={0}
			/>
			<Box sx={styles.divider} mt={1}>
				<Divider />
			</Box>
			<Box sx={styles.containerInner} className="flex-row-left">
				<SummaryChart />
				<SummaryDetails />
			</Box>
		</Stack>
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
		padding: '0px 10px',
	},
	containerInner: {
		width: '100%',
		height: 'calc(100vh - 65px)',
		bgcolor: BG_TERTIARY,
		p: '20px',
	},
	divider: {
		width: '100%',
	},
};
