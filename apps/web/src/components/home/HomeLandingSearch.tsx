'use client';

import { Chip, Collapse, Stack, Typography } from '@mui/material';
import ArrowCircleRightOutlined from '@mui/icons-material/ArrowCircleRightOutlined';
import Checklist from '@mui/icons-material/Checklist';
import ContentPasteSearch from '@mui/icons-material/ContentPasteSearch';
import ClaimsSearch from '@/components/home/ClaimsSearch';
import ChecklistsSearch from '@/components/home/ChecklistsSearch';
import Separator from '@/components/common/Separator';
import BasicButton from '@/components/common/BasicButton';
import ChecklistClaimDialog from '@/components/home/ChecklistClaimDialog';
import { useChecklistsStore } from '@/stores/useChecklistsStore';
import InsuranceGraphic1 from '@/lib/resources/images/insurance-graphic-1.png';
import config from '@/config/config';
import Image from 'next/image';

export default function HomeSearch() {
	const selectedChecklist = useChecklistsStore((state) => state.selectedChecklist);
	const selectedClaim = useChecklistsStore((state) => state.selectedClaim);
	const showChecklistClaimDialog = useChecklistsStore((state) => state.showChecklistClaimDialog);
	const updateSelectedClaim = useChecklistsStore((state) => state.updateSelectedClaim);
	const updateSelectedChecklist = useChecklistsStore((state) => state.updateSelectedChecklist);
	const toggleChecklistClaimDialog = useChecklistsStore((state) => state.toggleChecklistClaimDialog);

	return (
		<>
			<Stack width="100%" height="100%" display="flex" justifyContent="center" alignContent="center">
				<Image src={InsuranceGraphic1} alt="insurance-people" height={250} />
				<Typography fontSize={25} color="primary" height={80}>
					Welcome to {config.APP_NAME}!
				</Typography>
				<Typography>Find a claim to work.</Typography>
				<ClaimsSearch />
				<div className="flex-col-center">
					<Collapse in={Boolean(selectedClaim)} className="flex-col-center">
						<Chip
							label={selectedClaim?.claim_number ?? ''}
							icon={<ContentPasteSearch />}
							onDelete={() => updateSelectedClaim(null)}
						/>
					</Collapse>
					<div style={{ height: 40 }} className="flex-row-center">
						<Separator />
						<Separator />
						<Separator />
					</div>
					<Typography>Find a checklist to fill out.</Typography>
					<ChecklistsSearch />
				</div>
				<Collapse in={Boolean(selectedChecklist)} style={{ marginTop: 5 }} className="flex-col-center">
					<Chip
						label={selectedChecklist?.name ?? ''}
						icon={<Checklist />}
						onDelete={() => updateSelectedChecklist(null)}
					/>
				</Collapse>
				<BasicButton
					buttonProps={{
						onClick: toggleChecklistClaimDialog,
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
			</Stack>
			{showChecklistClaimDialog && <ChecklistClaimDialog />}
		</>
	);
}

const styles = {
	container: {
		width: 350,
		minWidth: 350,
		height: 375,
		padding: '10px 20px',
		overflow: 'hidden',
		borderRadius: 4,
		margin: '5px',
	},
};
