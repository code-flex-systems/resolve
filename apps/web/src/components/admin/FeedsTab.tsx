'use client';

import { Fade } from '@mui/material';
import Feeds from './Feeds';

export default function FeedsTab() {
	return (
		<Fade in={true} timeout={1000}>
			<div style={styles.container}>
				<Feeds />
			</div>
		</Fade>
	);
}

const styles = {
	container: {
		width: '100%',
		height: '100%',
	},
};
