import PageWrapper from '../common/PageWrapper';
import PageNavigation from '../checklist/PageNavigation';

export default function Checklist() {
	return (
		<PageWrapper route="/checklist">
			<div style={styles.container} className="flex-row-left">
				<PageNavigation />
			</div>
		</PageWrapper>
	);
}

const styles = {
	container: {
		width: '100%',
		height: '100%',
	},
};
