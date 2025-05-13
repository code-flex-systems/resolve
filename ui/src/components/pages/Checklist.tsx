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
import { useClaim } from '../../api/queries/claim-queries';

export default function Checklist() {
	const { checklistId = '-1', claimId } = useParams<{ checklistId?: string; claimId?: string }>();
	const mode = useChecklistSlice((state) => state.mode);
	const pageTemplates = useChecklistSlice((state) => state.pageTemplates);
	const checklist = useChecklistSlice((state) => state.checklist);
	const claim = useChecklistSlice((state) => state.claim);

	useChecklist(+checklistId, actions.setChecklistData, !checklist);
	useClaim(+checklistId, +(claimId ?? '-1'), actions.setClaimData, !!claimId && !claim);
	usePages(actions.updatePageTemplates, !pageTemplates.length);

	// useEffect(() => {
	// 	return () => resetStoreSlice(SLICES.CHECKLIST);
	// }, []);

	return (
		<PageWrapper route="checklist">
			{!checklist || (!!claimId && !claim) ? (
				<></>
			) : (
				<div style={styles.container}>
					<PageNavigation />
					{mode === ChecklistMode.EDIT ? <PageEditor /> : <Page />}
				</div>
			)}
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
