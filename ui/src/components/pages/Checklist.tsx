import PageWrapper from '../common/PageWrapper';
import PageNavigation from '../checklist/PageNavigation';
import Page from '../checklist/Page';
import { useChecklistSlice } from '../../state/store';
import { ChecklistMode } from '../../config/enums';
import PageEditor from '../checklist/PageEditor';

export default function Checklist() {
	const mode = useChecklistSlice((state) => state.mode);
	return (
		<PageWrapper route="/checklist">
			<div style={styles.container} className="flex-row-left">
				<PageNavigation />
				{mode === ChecklistMode.EDIT ? <PageEditor /> : <Page />}
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
