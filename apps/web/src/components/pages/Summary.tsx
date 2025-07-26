'use client';
import { Box, Divider, IconButton, Stack } from '@mui/material';
import { ArrowBack, Checklist } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import Toolbar from '@/components/common/Toolbar';
import SummaryChart from '@/components//summary/SummaryChart';
import ClaimInfo from '@/components/checklist/ClaimInfo';
import SummaryDetails from '@/components/summary/SummaryDetails';
import BasicButtonStyled from '../common/BasicButtonStyled';
import { useChecklistSlice } from '@/state/store';
import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import { useChecklistParams } from '@/hooks/useChecklistParams';

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
								icon={<ArrowBack />}
								buttonProps={{ onClick: () => router.back() }}
								tooltipProps={{ title: 'Back to checklist' }}
							/>
						</Box>
						<ClaimInfo />
						<BasicButtonStyled buttonProps={{ startIcon: <Checklist />, sx: { marginLeft: '5px' } }}>
							{checklist?.name ?? ''}
						</BasicButtonStyled>
					</>
				}
				padding={0}
			/>
			<div style={styles.divider}>
				<Divider />
			</div>
			<div style={styles.containerInner} className="flex-row-left">
				<SummaryChart />
				<SummaryDetails />
			</div>
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
		height: 'calc(100vh - 120px)',
		padding: '20px 0px 10px',
	},
	divider: {
		width: '100%',
		height: 1,
	},
};
