'use client';
import { Box, Fade, Paper, Popper, PopperProps, Stack } from '@mui/material';
import { formatAmount, formatMDY, formatUser } from '@/lib/utils/utils';
import ContentPasteSearch from '@mui/icons-material/ContentPasteSearch';
import { useState } from 'react';
import { useClaimTrpc } from '@/hooks/trpc/useClaimTrpc';
import { useChecklistParams } from '@/hooks/useChecklistParams';
import BasicButtonStyled from '../common/BasicButtonStyled';
import { StackedRow } from '../common/StackedRow';
import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import { useClerkSession } from '@/lib/auth/use-clerk-session';
import { formatCityState } from '@/schemas/addressSchemas';

export default function ClaimInfo() {
	const { data: session } = useClerkSession();
	const { checklistId = -1, claimId = -1 } = useChecklistParams();
	const [claimAnchorEl, setClaimAnchorEl] = useState<PopperProps['anchorEl']>(null);
	const { data: claim } = useClaimTrpc().get(
		{ checklistId, claimId },
		{ enabled: checklistId !== -1 && claimId !== -1 }
	);
	const { data: checklistClaim } = useChecklistTrpc().getForClaim(
		{ checklistId, claimId },
		{ enabled: checklistId !== -1 && claimId !== -1 }
	);

	if (!claim) return <></>;
	return (
		<Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
			<BasicButtonStyled
				buttonProps={{
					onMouseEnter: (e) => setClaimAnchorEl(e.currentTarget),
					onMouseLeave: () => setClaimAnchorEl(null),
					startIcon: <ContentPasteSearch sx={{ color: 'primary.main' }} />,
					sx: { mr: 0.5 },
				}}
			>
				{claim.claim_number}
			</BasicButtonStyled>
			<Popper
				open={!!claimAnchorEl}
				anchorEl={claimAnchorEl}
				placement="bottom-start"
				sx={{ zIndex: 100 }}
				transition
			>
				{({ TransitionProps }) => (
					<Fade {...TransitionProps} timeout={350}>
						<span>
							<Paper
								sx={{
									width: 450,
									maxWidth: 450,
									p: '0px 10px 10px',
									height: 'fit-content',
									borderTopRightRadius: 1,
									borderBottomLeftRadius: 1,
									borderBottomRightRadius: 1,
									border: '1px solid',
									borderColor: 'divider',
									mt: 0.5,
									display: 'flex',
									flexDirection: 'column',
									alignItems: 'flex-start',
								}}
							>
								<Box width="100%" display="flex" justifyContent="flex-start" alignItems="flex-start">
									<Stack
										width="50%"
										display="flex"
										justifyContent="flex-start"
										alignItems="flex-start"
									>
										<StackedRow
											primary="Current Assignee"
											secondary={formatUser(checklistClaim, session?.user?.email)}
										/>
										<StackedRow primary="Client" secondary={claim.client} />
										<StackedRow primary="Client Adjuster" secondary={claim.client_adjuster} />
										<StackedRow primary="Insured" secondary={claim.insured} />
										<StackedRow
											primary="Claim Amount"
											secondary={formatAmount(claim.claim_amount!, true)}
										/>
									</Stack>
									<Stack
										width="50%"
										display="flex"
										justifyContent="flex-start"
										alignItems="flex-start"
									>
										<StackedRow primary="Status" secondary={checklistClaim?.status ?? ''} />
										<StackedRow
											primary="Date of Loss"
											secondary={formatMDY(claim.date_of_loss?.toString() ?? '')}
										/>
										<StackedRow primary="Loss Location" secondary={formatCityState(claim.loss_city, claim.loss_state) || undefined} />
										<StackedRow
											primary="Last Update By"
											secondary={`${claim.last_updated_by} on ${formatMDY(claim.last_update?.toString() ?? '')}`}
										/>
										<StackedRow primary="Grade" secondary={'###'} />
									</Stack>
								</Box>
							</Paper>
						</span>
					</Fade>
				)}
			</Popper>
		</Box>
	);
}
