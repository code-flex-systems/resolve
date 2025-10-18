'use client';

import { Box, Chip, Collapse, Paper, Stack, Typography } from '@mui/material';
import { ArrowCircleRightOutlined, Checklist, ContentPasteSearch } from '@mui/icons-material';
import ClaimsSearch from '@/components/home/ClaimsSearch';
import ChecklistsSearch from '@/components/home/ChecklistsSearch';
import Separator from '@/components/common/Separator';
import BasicButton from '@/components/common/BasicButton';
import ChecklistClaimDialog from '@/components/home/ChecklistClaimDialog';
import { useChecklistsStore } from '@/stores/useChecklistsStore';
import InsuranceGraphic1 from '@/lib/resources/images/insurance-graphic-1.png';
import Image from 'next/image';
import { useSession } from 'next-auth/react';

export default function HomeSearch() {
	const { data: session } = useSession();
	const selectedChecklist = useChecklistsStore((state) => state.selectedChecklist);
	const selectedClaim = useChecklistsStore((state) => state.selectedClaim);
	const showChecklistClaimDialog = useChecklistsStore((state) => state.showChecklistClaimDialog);
	const updateSelectedClaim = useChecklistsStore((state) => state.updateSelectedClaim);
	const updateSelectedChecklist = useChecklistsStore((state) => state.updateSelectedChecklist);
	const toggleChecklistClaimDialog = useChecklistsStore((state) => state.toggleChecklistClaimDialog);

	return (
		<>
			<Paper elevation={0} sx={styles.container}>
				<Box width="100%" height="100%" display="flex" justifyContent="center" alignItems="flex-start">
					<Stack height="100%" display="flex" justifyContent="center" alignItems="center" marginLeft="10px">
						<Image alt="insurance" src={InsuranceGraphic1} width={180} height={150} />
						<Typography fontSize={25} color="primary">
							MANIFEST
						</Typography>
					</Stack>

					<Stack height="100%" display="flex" justifyContent="center" alignItems="center" marginLeft="10px">
						<ClaimsSearch showIcon={false} />
						<Collapse in={Boolean(selectedClaim)} className="flex-col-center">
							<Chip
								label={selectedClaim?.claim_number ?? ''}
								icon={<ContentPasteSearch />}
								onDelete={() => updateSelectedClaim(null)}
							/>
						</Collapse>
						<div style={{ height: 30 }} className="flex-row-center">
							<Separator />
							<Separator />
							<Separator />
						</div>
						<ChecklistsSearch showIcon={false} />
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
									width: 'fit-content',
								},
								className: 'bump-lg',
								disabled: !selectedClaim || !selectedChecklist,
							}}
						>
							Go
						</BasicButton>
					</Stack>
				</Box>
			</Paper>
			{showChecklistClaimDialog && <ChecklistClaimDialog />}
		</>
	);
}

const styles = {
	container: {
		width: 520,
		minWidth: 520,
		height: 350,
		padding: '10px 20px',
		overflow: 'hidden',
		borderRadius: 4,
		margin: '15px',
	},
};
