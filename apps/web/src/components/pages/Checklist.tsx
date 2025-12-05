'use client';
import PageNavigation from '@/components/checklist/PageNavigation';
import Page from '@/components/checklist/Page';
import PageEditor from '@/components/checklist/PageEditor';
import { useChecklistStore } from '@/stores/useChecklistStore';
import { ChecklistMode } from '@/config/enums';
import { useChecklistParams } from '@/hooks/useChecklistParams';
import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import { useClaimTrpc } from '@/hooks/trpc/useClaimTrpc';
import { usePageTrpc } from '@/hooks/trpc/usePageTrpc';
import { useEffect } from 'react';
import { Box } from '@mui/material';
import ChecklistProgressDialog from '../checklist/ChecklistProgressDialog';
import ChecklistHandoffDialog from '../checklist/ChecklistHandoffDialog';

export default function Checklist() {
	const { checklistId = -1, claimId = -1 } = useChecklistParams();
	const mode = useChecklistStore((state) => state.mode);
	const showChecklistHandoffDialog = useChecklistStore((state) => state.showChecklistHandoffDialog);
	const showChecklistProgressDialog = useChecklistStore((state) => state.showChecklistProgressDialog);

	const { data: checklist } = useChecklistTrpc().get({ id: checklistId! }, { enabled: checklistId !== -1 });
	const { data: claim } = useClaimTrpc().get(
		{ checklistId, claimId },
		{ enabled: checklistId !== -1 && claimId !== -1 }
	);
	usePageTrpc().listTemplates();

	useEffect(() => {
		return () => useChecklistStore.getState().reset();
	}, []);

	return !checklist || (claimId !== -1 && !claim) ? (
		<></>
	) : (
		<Box width="100%" height="100%" display="flex" justifyContent="flex-start" alignItems="stretch">
			<PageNavigation />
			{mode === ChecklistMode.EDIT ? <PageEditor /> : <Page />}
			{showChecklistHandoffDialog && <ChecklistHandoffDialog />}
			{showChecklistProgressDialog && claimId && <ChecklistProgressDialog />}
		</Box>
	);
}
