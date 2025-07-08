'use client';
import PageWrapper from '@/components/common/PageWrapper';
import BreakdownNavigation from '@/components/breakdown/BreakdownNavigation';
import Breakdown from '@/components/breakdown/Breakdown';
import { useChecklistParams } from '@/hooks/useChecklistParams';
import { useEffect } from 'react';
import { resetStoreSlice } from '@/state/store';
import { SLICES } from '@/state/storeConfig';

export default function ChecklistPageBreakdown() {
	const { checklistId = -1, pageId = -1, instanceId = -1 } = useChecklistParams();

	useEffect(() => {
		return () => resetStoreSlice(SLICES.BREAKDOWN);
	}, []);

	return (
		<PageWrapper route="breakdown">
			{!checklistId || !pageId || !instanceId ? (
				<></>
			) : (
				<div style={styles.container}>
					<BreakdownNavigation pageId={pageId} instanceId={instanceId} />
					<Breakdown instanceId={instanceId} />
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
