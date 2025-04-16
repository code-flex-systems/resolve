import PageWrapper from '../common/PageWrapper';
import PageNavigation from '../checklist/PageNavigation';
import Page from '../checklist/Page';
import { useChecklistSlice, useGlobalSlice } from '../../state/store';
import { ChecklistMode } from '../../config/enums';
import PageEditor from '../checklist/PageEditor';
import { useChecklist } from '../../api/queries/checklist-queries';
import * as actions from '../../state/global/actions';

export default function Checklist() {
	const mode = useChecklistSlice((state) => state.mode);
	const checklist = useGlobalSlice((state) => state.checklist);
	useChecklist(1, actions.updateChecklist, !checklist);
	return (
		<PageWrapper route="/checklist">
			<div style={styles.container}>
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
		display: 'flex',
		justifyContent: 'flex-start',
		alignItems: 'flex-start',
	},
};
