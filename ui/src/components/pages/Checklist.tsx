import PageWrapper from '../common/PageWrapper';
import PageNavigation from '../checklist/PageNavigation';
import Page from '../checklist/Page';
import { useChecklistSlice, useGlobalSlice } from '../../state/store';
import { ChecklistMode } from '../../config/enums';
import PageEditor from '../checklist/PageEditor';
import { useChecklist } from '../../api/queries/checklist-queries';
import * as globalActions from '../../state/global/actions';
import * as actions from '../../state/checklist/actions';
import { useQueries } from '@tanstack/react-query';
import { usePages } from '../../api/queries/page-queries';

export default function Checklist() {
	const mode = useChecklistSlice((state) => state.mode);
	const pageTemplates = useChecklistSlice((state) => state.pageTemplates);
	const checklist = useGlobalSlice((state) => state.checklist);

	useChecklist(1, globalActions.updateChecklist, !checklist);
	usePages(actions.updatePageTemplates, !pageTemplates.length);

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
