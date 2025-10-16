'use client';

import { Box, Chip, Collapse, Paper, Stack } from '@mui/material';
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
				<Box left="calc(50% - 130px)" top={60} position="absolute" zIndex={-1}>
					<Image alt="insurance" src={InsuranceGraphic1} width={260} height={230} />
				</Box>
				<Box height={90} />
				<Stack
					width="100%"
					height="calc(100% - 90px)"
					display="flex"
					justifyContent="center"
					alignItems="center"
				>
					<ClaimsSearch showIcon={false} />
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
			</Paper>
			{showChecklistClaimDialog && <ChecklistClaimDialog />}
		</>
	);
}

const styles = {
	container: {
		width: '100%',
		minWidth: '100%',
		height: '100%',
		flex: 1,
		padding: '10px 20px',
		borderRadius: 4,
		margin: '5px',
		position: 'relative',
		zIndex: 0,
	},
};
