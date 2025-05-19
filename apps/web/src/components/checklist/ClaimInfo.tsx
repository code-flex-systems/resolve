'use client';
import { Fade, Link, Paper, Popper, PopperProps, Skeleton, Typography } from '@mui/material';
import dayjs from 'dayjs';
import Separator from '../common/Separator';
import theme from '@/styles/theme';
import { formatAmount } from '@/lib/utils/utils';
import { ContentPasteSearch } from '@mui/icons-material';
import { useState } from 'react';
import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import { useClaimTrpc } from '@/hooks/trpc/useClaimTrpc';
import { useChecklistParams } from '@/hooks/useChecklistParams';

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
			<ContentPasteSearch sx={{ color: 'secondary.main' }} />
			<Link
				marginLeft="5px"
				color="secondary"
				onMouseEnter={(e) => setClaimAnchorEl(e.currentTarget)}
				onMouseLeave={() => setClaimAnchorEl(null)}
			>
				{claim.claim_number} ({checklist?.name ?? ''})
			</Link>
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
								<Row label="Claim Number" value={claim.claim_number} />
								<Row label="Client" value={claim.client} />
								<Row label="Client Adjuster" value={claim.client_adjuster} />
								<Row label="Insured" value={claim.insured} />
								<Row label="Claim Amount" amount value={claim.claim_amount} />
								<Row label="Total Incurred" amount value={claim.total_incurred} />
								<Row label="Date of Loss" date value={claim.date_of_loss?.toString() ?? ''} />
								<Row label="Loss Location" value={claim.loss_location} />
								<Row label="Last Update" value={claim.last_updated_by} />
								<Row label="" date value={claim.last_update?.toString() ?? ''} />
								<Row label="Expected Recovery" amount value={claim.expected_recovery} />
								<Row label="Grade" value={''} />
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
		border: `1px solid ${theme.palette.secondary.main}`,
	},
	row: {
		width: '100%',
		margin: '2px 0px',
	},
};
