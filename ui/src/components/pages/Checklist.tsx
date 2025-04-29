import PageWrapper from '../common/PageWrapper';
import PageNavigation from '../checklist/PageNavigation';
import Page from '../checklist/Page';
import { resetStoreSlice, useChecklistSlice } from '../../state/store';
import { ChecklistMode } from '../../config/enums';
import PageEditor from '../checklist/PageEditor';
import { useChecklist } from '../../api/queries/checklist-queries';
import * as actions from '../../state/checklist/actions';
import { usePages } from '../../api/queries/page-queries';
import { useParams } from 'react-router';
import { useEffect } from 'react';
import { SLICES } from '../../state/storeConfig';

export default function Checklist() {
	const params = useParams<{ checklistId?: string; claimId?: string }>();
	const mode = useChecklistSlice((state) => state.mode);
	const pageTemplates = useChecklistSlice((state) => state.pageTemplates);
	const checklist = useChecklistSlice((state) => state.checklist);

	useChecklist(+(params.checklistId ?? '-1'), actions.setChecklistData, !checklist);
	usePages(actions.updatePageTemplates, !pageTemplates.length);

	useEffect(() => {
		return () => resetStoreSlice(SLICES.CHECKLIST);
	}, []);

	return (
		<PageWrapper route="checklist">
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
