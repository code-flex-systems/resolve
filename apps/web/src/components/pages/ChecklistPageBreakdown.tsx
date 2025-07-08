'use client';
import BreakdownNavigation from '@/components/breakdown/BreakdownNavigation';
import Breakdown from '@/components/breakdown/Breakdown';
import { useChecklistParams } from '@/hooks/useChecklistParams';
import { useEffect } from 'react';
import { resetStoreSlice } from '@/state/store';
import { SLICES } from '@/state/storeConfig';
import { Box } from '@mui/material';

export default function ChecklistPageBreakdown() {
	const { checklistId = -1, pageId = -1, instanceId = -1 } = useChecklistParams();

	useEffect(() => {
		return () => resetStoreSlice(SLICES.BREAKDOWN);
	}, []);

	return !checklistId || !pageId || !instanceId ? (
		<></>
	) : (
		<Box width="100%" flex={1} display="flex" justifyContent="flex-start" alignItems="flex-start">
			<BreakdownNavigation pageId={pageId} instanceId={instanceId} />
			<Breakdown instanceId={instanceId} />
		</Box>
	);
}
