'use client';
import { Box, Fade, Link, Paper, Popper, PopperProps, Skeleton, Stack, Typography } from '@mui/material';
import dayjs from 'dayjs';
import Separator from '../common/Separator';
import theme, { BASE_COLOR_LIGHT } from '@/styles/theme';
import { formatAmount, formatMDY } from '@/lib/utils/utils';
import { ContentPasteSearch } from '@mui/icons-material';
import { useState } from 'react';
import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import { useClaimTrpc } from '@/hooks/trpc/useClaimTrpc';
import { useChecklistParams } from '@/hooks/useChecklistParams';
import StackedHeaderCell from '../common/StackedHeaderCell';
import BasicButtonStyled from '../common/BasicButtonStyled';

function Row(props: {
	label: string;
	value: string | number | null;
	loading?: boolean;
	amount?: boolean;
	date?: boolean;
}) {
	const getFormattedValue = () => {
		if (props.amount) {
			return formatAmount(props.value!, true);
		}
		if (props.date) {
			return dayjs(props.value).format('DD/MM/YYYY');
		}
		return props.value;
	};

	return (
		<div style={styles.row} className="flex-row-between">
			{props.loading ? (
				<Skeleton width={`calc(100% - ${Math.ceil(Math.random() * 30)}px)`} height={15} />
			) : (
				<>
					<div className="flex-row-left">
						{props.label && (
							<>
								<Separator color={theme.palette.warning.main} />
								<Typography minWidth="fit-content" marginRight="10px" fontWeight="bold">
									{props.label}
								</Typography>
							</>
						)}
					</div>

					<Typography>{getFormattedValue() || '###'}</Typography>
				</>
			)}
		</div>
	);
}

export function StackedRow({ primary, secondary }: { primary: any; secondary: any }) {
	return (
		<Stack
			display="flex"
			width="100%"
			height="100%"
			justifyContent="center"
			alignItems="flex-start"
			padding="5px 0px"
		>
			<Typography fontSize={15} lineHeight="17px" paddingBottom="2px">
				{primary}
			</Typography>
			<Typography fontSize={13} lineHeight="15px" color={BASE_COLOR_LIGHT}>
				{secondary}
			</Typography>
		</Stack>
	);
}

export default function ClaimInfo() {
	const { checklistId = -1, claimId = -1 } = useChecklistParams();
	const [claimAnchorEl, setClaimAnchorEl] = useState<PopperProps['anchorEl']>(null);
	const { data: checklist } = useChecklistTrpc().get({ id: checklistId! }, { enabled: checklistId !== -1 });
	const { data: claim } = useClaimTrpc().get(
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
					startIcon: <ContentPasteSearch />,
					color: 'primary',
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
										<StackedRow primary="Claim Number" secondary={claim.claim_number} />
										<StackedRow primary="Client" secondary={claim.client} />
										<StackedRow primary="Client Adjuster" secondary={claim.client_adjuster} />
										<StackedRow primary="Insured" secondary={claim.insured} />
										<StackedRow
											primary="Claim Amount"
											secondary={formatAmount(claim.claim_amount!, true)}
										/>
										<StackedRow
											primary="Total Incurred"
											secondary={formatAmount(claim.total_incurred!, true)}
										/>
									</Stack>
									<Stack
										width="50%"
										display="flex"
										justifyContent="flex-start"
										alignItems="flex-start"
									>
										<StackedRow primary="Status" secondary={'###'} />
										<StackedRow
											primary="Date of Loss"
											secondary={formatMDY(claim.date_of_loss?.toString() ?? '')}
										/>
										<StackedRow primary="Loss Location" secondary={claim.loss_location} />
										<StackedRow
											primary="Last Update By"
											secondary={`${claim.last_updated_by} on ${formatMDY(claim.last_update?.toString() ?? '')}`}
										/>
										<StackedRow
											primary="Expected Recovery"
											secondary={formatAmount(claim.expected_recovery!, true)}
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
		border: `1px solid ${theme.palette.primary.main}`,
		marginTop: 5,
	},
	row: {
		width: '100%',
		margin: '2px 0px',
	},
};
