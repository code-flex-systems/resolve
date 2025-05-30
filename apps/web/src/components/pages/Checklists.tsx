'use client';
import { Collapse, Typography } from '@mui/material';
import { ArrowCircleRightOutlined } from '@mui/icons-material';
import { useEffect } from 'react';

import ClaimsSearch from '@/components/checklists/ClaimsSearch';
import Recents from '@/components/checklists/Recents';
import PageWrapper from '@/components/common/PageWrapper';
import ClaimMenuItem from '@/components/checklists/ClaimMenuItem';
import ChecklistsSearch from '@/components/checklists/ChecklistsSearch';
import ChecklistMenuItem from '@/components/checklists/ChecklistMenuItem';
import Separator from '@/components/common/Separator';
import BasicButton from '@/components/common/BasicButton';
import ChecklistClaimDialog from '@/components/checklists/ChecklistClaimDialog';
import { SLICES } from '@/state/storeConfig';
import { resetStoreSlice, useChecklistsSlice } from '@/state/store';
import * as actions from '@/state/checklists/actions';

export default function Checklists() {
	const selectedChecklist = useChecklistsSlice((state) => state.selectedChecklist);
	const selectedClaim = useChecklistsSlice((state) => state.selectedClaim);
	const showChecklistClaimDialog = useChecklistsSlice((state) => state.showChecklistClaimDialog);

	useEffect(() => {
		return () => resetStoreSlice(SLICES.CHECKLISTS);
	}, []);

	return (
		<PageWrapper route="home">
			<div style={styles.container}>
				<Recents />
				<div style={styles.innerContainer} className="flex-col-center">
					<Typography fontSize={25} fontStyle="italic" color="primary" height={80}>
						Welcome to Checklists!
					</Typography>
					<Typography>Find a claim to work.</Typography>
					<ClaimsSearch />
					<div className="flex-col-center">
						<Collapse in={Boolean(selectedClaim)} className="flex-col-center">
							<ClaimMenuItem claim={selectedClaim} clearable />
						</Collapse>
						<div style={{ height: 80 }} className="flex-row-center">
							<Separator />
							<Separator />
							<Separator />
						</div>
						<Typography>Find a checklist to fill out.</Typography>
						<ChecklistsSearch />
					</div>
					<Collapse in={Boolean(selectedChecklist)} style={{ marginTop: 5 }} className="flex-col-center">
						<ChecklistMenuItem checklist={selectedChecklist} clearable />
					</Collapse>
					<BasicButton
						buttonProps={{
							onClick: actions.toggleChecklistClaimDialog,
							variant: 'contained',
							color: 'primary',
							startIcon: (
								<ArrowCircleRightOutlined
									sx={{ color: !selectedClaim || !selectedChecklist ? '#A6A6A6' : 'white' }}
								/>
							),
							sx: {
								marginTop: '20px',
								fontSize: 20,
							},
							className: 'bump-lg',
							disabled: !selectedClaim || !selectedChecklist,
						}}
					>
						Go
					</BasicButton>
				</div>
			</div>

			{showChecklistClaimDialog && <ChecklistClaimDialog />}
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
	innerContainer: {
		width: '100%',
		height: 'calc(100% - 100px)',
	},
};
