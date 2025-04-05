import { Grid, Typography } from '@mui/material';
import PageWrapper from '../common/PageWrapper';
import WelcomeDialog from '../home/WelcomeDialog';
import { BACKDROP_COLOR } from '../../styles/theme';
import HomeNavCard from '../home/HomeNavCard';
import UploadDialog from '../common/UploadDialog';
import { uploadFile } from '../../api/s3-utils';

export default function Home() {
	return (
		<PageWrapper route="">
			<div style={styles.container}>
				<div style={styles.card}>
					<Typography fontSize={25} fontWeight="bold">
						Welcome back, Owen!
					</Typography>
				</div>

				<Grid container columns={2} padding="20px 0px">
					<Grid size={1}>
						<HomeNavCard />
					</Grid>
				</Grid>
			</div>
		</PageWrapper>
	);
}

const styles = {
	card: {
		width: 'fit-content',
		padding: '2px 5px',
		backgroundColor: BACKDROP_COLOR,
	},
	container: {
		padding: 20,
	},
};
