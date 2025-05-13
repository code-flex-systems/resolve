import PageWrapper from '../common/PageWrapper';
import { useChecklistSlice } from '../../state/store';
import Toolbar from '../common/Toolbar';
import { ArrowBack } from '@mui/icons-material';
import { Divider, IconButton } from '@mui/material';
import { useNavigate } from 'react-router';
import SummaryChart from '../summary/SummaryChart';
import ClaimInfo from '../checklist/ClaimInfo';
import SummaryDetails from '../summary/SummaryDetails';

export default function Summary() {
	const navigate = useNavigate();
	const checklist = useChecklistSlice((state) => state.checklist);
	const claim = useChecklistSlice((state) => state.claim);

	return (
		<PageWrapper route="checklist">
			<div style={styles.container}>
				<Toolbar
					left={
						<>
							<IconButton
								onClick={() => navigate(`/checklist/${checklist?.id}/claim/${claim?.id}`)}
								sx={{ marginRight: '5px' }}
							>
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
			</div>
		</PageWrapper>
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
		height: 'calc(100vh - 100px)',
		padding: '10px 0px',
	},
	divider: {
		width: '100%',
		height: 1,
	},
};
