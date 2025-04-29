import { Collapse, Fade, Typography } from '@mui/material';
import ClaimsSearch from '../checklists/ClaimsSearch';
import Recents from '../checklists/Recents';
import PageWrapper from '../common/PageWrapper';
import { useChecklistsSlice } from '../../state/store';
import ClaimMenuItem from '../checklists/ClaimMenuItem';
import ChecklistsSearch from '../checklists/ChecklistsSearch';
import ChecklistMenuItem from '../checklists/ChecklistMenuItem';
import Separator from '../common/Separator';
import BasicButton from '../common/BasicButton';
import { ArrowCircleRightOutlined } from '@mui/icons-material';
import * as actions from '../../state/checklists/actions';
import ChecklistClaimDialog from '../checklists/ChecklistClaimDialog';

export default function Checklists() {
	const selectedChecklist = useChecklistsSlice((state) => state.selectedChecklist);
	const selectedClaim = useChecklistsSlice((state) => state.selectedClaim);
	const showChecklistClaimDialog = useChecklistsSlice((state) => state.showChecklistClaimDialog);
	console.log(selectedChecklist);

	return (
		<PageWrapper route="checklists">
			<div style={styles.container}>
				<Recents />
				<div style={styles.innerContainer} className="flex-col-center">
					<Typography fontSize={25} fontStyle="italic">
						Welcome to Checklists!
					</Typography>
					<Typography>Find a claim to get started.</Typography>
					<ClaimsSearch />
					<Collapse in={Boolean(selectedClaim)} className="flex-col-center">
						<div className="flex-col-center">
							<ClaimMenuItem claim={selectedClaim} clearable />
							<div style={{ height: 100 }} className="flex-row-center">
								<Separator />
								<Separator />
								<Separator />
							</div>
							<Typography>Find a checklist to fill out.</Typography>
							<ChecklistsSearch />
						</div>
					</Collapse>
					<Collapse in={Boolean(selectedChecklist)} className="flex-col-center">
						<ChecklistMenuItem checklist={selectedChecklist} clearable />
					</Collapse>
					<Fade in={!!selectedClaim && !!selectedChecklist}>
						<span>
							<BasicButton
								buttonProps={{
									onClick: actions.toggleChecklistClaimDialog,
									variant: 'contained',
									startIcon: <ArrowCircleRightOutlined sx={{ color: 'white' }} />,
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
						</span>
					</Fade>
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
		height: '100%',
	},
};
