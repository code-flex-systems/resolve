import Claims from './Claims';
import Feeds from './Feeds';

export default function FeedsAndClaimsTab() {
	return (
		<div style={styles.container} className="flex-row-between">
			<Feeds />
			<Claims />
		</div>
	);
}

const styles = {
	container: {
		width: '100%',
		height: 'calc(100vh - 135px)',
	},
};
