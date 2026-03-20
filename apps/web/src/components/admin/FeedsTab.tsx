'use client';

import Feeds from './Feeds';

export default function FeedsTab() {
	return (
		<div>
			<div style={styles.container}>
				<Feeds />
			</div>
		</div>
	);
}

const styles = {
	container: {
		width: '100%',
		height: '100%',
	},
};
