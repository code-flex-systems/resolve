'use client';
import PageNavigation from '@/components/checklist/PageNavigation';
import Page from '@/components/checklist/Page';
import PageEditor from '@/components/checklist/PageEditor';
import { resetStoreSlice, useChecklistSlice } from '@/state/store';
import { ChecklistMode } from '@/config/enums';
import { useChecklistParams } from '@/hooks/useChecklistParams';
import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import { useClaimTrpc } from '@/hooks/trpc/useClaimTrpc';
import { usePageTrpc } from '@/hooks/trpc/usePageTrpc';
import { useEffect } from 'react';
import { SLICES } from '@/state/storeConfig';
import { Box } from '@mui/material';
import ChecklistProgressDialog from '../checklist/ChecklistProgressDialog';
import ChecklistHandoffDialog from '../checklist/ChecklistHandoffDialog';

export default function Checklist() {
	const { checklistId = -1, claimId = -1 } = useChecklistParams();
	const mode = useChecklistSlice((state) => state.mode);
	const showChecklistHandoffDialog = useChecklistSlice((state) => state.showChecklistHandoffDialog);
	const showChecklistProgressDialog = useChecklistSlice((state) => state.showChecklistProgressDialog);

	const { data: checklist } = useChecklistTrpc().get({ id: checklistId! }, { enabled: checklistId !== -1 });
	const { data: claim } = useClaimTrpc().get(
		{ checklistId, claimId },
		{ enabled: checklistId !== -1 && claimId !== -1 }
	);
	usePageTrpc().listTemplates();

	useEffect(() => {
		return () => resetStoreSlice(SLICES.CHECKLIST);
	}, []);

	return !checklist || (!!claimId && !claim) ? (
		<></>
	) : (
		<Box width="100%" height="100%" display="flex" justifyContent="flex-start" alignItems="flex-start">
			<PageNavigation />
			{mode === ChecklistMode.EDIT ? <PageEditor /> : <Page />}
			{showChecklistHandoffDialog && <ChecklistHandoffDialog />}
			{showChecklistProgressDialog && claimId && <ChecklistProgressDialog />}
		</Box>
	);
}
