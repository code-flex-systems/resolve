'use client';
import { Divider, IconButton, Stack } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import Toolbar from '@/components/common/Toolbar';
import SummaryChart from '@/components//summary/SummaryChart';
import ClaimInfo from '@/components/checklist/ClaimInfo';
import SummaryDetails from '@/components/summary/SummaryDetails';

export default function Summary() {
	const router = useRouter();

	return (
		<Stack flex={1} width="100%" display="flex" justifyContent="flex-start" alignItems="flex-start" padding="10px">
			<Toolbar
				left={
					<>
						<IconButton onClick={() => router.back()} sx={{ marginRight: '5px' }}>
							<ArrowBack />
						</IconButton>
						<ClaimInfo />
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
		padding: '10px 0px',
	},
	divider: {
		width: '100%',
		height: 1,
	},
};
