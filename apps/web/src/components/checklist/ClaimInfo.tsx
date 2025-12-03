'use client';
import { Box, Fade, Paper, Popper, PopperProps, Stack } from '@mui/material';
import theme, { BASE_COLOR } from '@/styles/theme';
import { formatAmount, formatMDY, formatUser } from '@/lib/utils/utils';
import ContentPasteSearch from '@mui/icons-material/ContentPasteSearch';
import { useState } from 'react';
import { useClaimTrpc } from '@/hooks/trpc/useClaimTrpc';
import { useChecklistParams } from '@/hooks/useChecklistParams';
import BasicButtonStyled from '../common/BasicButtonStyled';
import { StackedRow } from '../common/StackedRow';
import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import { useSession } from 'next-auth/react';

export default function ClaimInfo() {
	const { data: session } = useSession();
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
		<div className="flex-row-left">
			<BasicButtonStyled
				buttonProps={{
					onMouseEnter: (e) => setClaimAnchorEl(e.currentTarget),
					onMouseLeave: () => setClaimAnchorEl(null),
					startIcon: <ContentPasteSearch sx={{ color: theme.palette.primary.main }} />,
					sx: { marginRight: '5px' },
				}}
			>
				{claim.claim_number}
			</BasicButtonStyled>
			<Popper
				open={!!claimAnchorEl}
				anchorEl={claimAnchorEl}
				placement="bottom-start"
				style={{ zIndex: 100 }}
				transition
			>
				{({ TransitionProps }) => (
					<Fade {...TransitionProps} timeout={350}>
						<span>
							<Paper style={styles.container} className="flex-col-start">
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
										<StackedRow primary="Loss Location" secondary={claim.loss_location} />
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
		</div>
	);
}

const styles = {
	container: {
		width: 450,
		maxWidth: 450,
		padding: '0px 10px 10px',
		height: 'fit-content',
		borderTopRightRadius: 5,
		borderBottomLeftRadius: 5,
		borderBottomRightRadius: 5,
		border: `1px solid ${theme.palette.divider}`,
		marginTop: 5,
	},
};
