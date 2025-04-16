import { Divider, Paper, Skeleton, Typography } from '@mui/material';
import { useClaimDummy } from '../../api/queries/claim-dummy-queries';
import * as actions from '../../state/checklist/actions';
import { useChecklistSlice } from '../../state/store';
import dayjs from 'dayjs';
import Separator from '../common/Separator';
import theme from '../../styles/theme';
import { useState } from 'react';

function Row(props: { label: string; value: string | number; loading: boolean; amount?: boolean; date?: boolean }) {
	const getFormattedValue = () => {
		if (props.amount) {
			return `$${parseFloat(props.value.toString()).toLocaleString('en-US', {
				minimumFractionDigits: 2,
			})}`;
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
								<Separator />
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
	const claim = useChecklistSlice((state) => state.claim);
	const [open, setOpen] = useState(false);
	const [showData, setShowData] = useState(false);
	const { isFetching } = useClaimDummy(actions.setClaimData, !claim);
	if (!claim) return <></>;
	return (
		<>
			<Paper
				onClick={() => {
					if (open) {
						setShowData(false);
					} else {
						setTimeout(() => setShowData(true), 350);
					}
					setOpen((prev) => !prev);
				}}
				style={{ ...styles.container, width: open ? 900 : 500, height: open ? 170 : 30 }}
			>
				{showData ? (
					<>
						<div style={styles.innerContainer} className="flex-col-start">
							<Row label="Claim Number" value={claim.claim_number} loading={isFetching} />
							<Row label="Client" value={claim.client} loading={isFetching} />
							<Row label="Client Adjuster" value={claim.client_adjuster} loading={isFetching} />
							<Row label="Insured" value={claim.insured} loading={isFetching} />
							<Row label="Claim Amount" amount value={claim.claim_amount} loading={isFetching} />
							<Row label="Total Incurred" amount value={claim.total_incurred} loading={isFetching} />
						</div>
						<div style={styles.innerContainer} className="flex-col-start">
							<Row label="Grade" value={''} loading={isFetching} />
							<Row label="Date of Loss" date value={claim.date_of_loss} loading={isFetching} />
							<Row label="Loss Location" value={claim.loss_location} loading={isFetching} />
							<Row label="Last Update" value={claim.last_updated_by} loading={isFetching} />
							<Row label="" date value={claim.last_update} loading={isFetching} />
							<Row
								label="Expected Recovery"
								amount
								value={claim.expected_recovery}
								loading={isFetching}
							/>
						</div>
					</>
				) : (
					<>
						<div style={{ ...styles.innerContainer, width: '65%' }} className="flex-col-start">
							<Row label="Claim Number" value={claim.claim_number} loading={isFetching} />
						</div>
						<div style={{ ...styles.innerContainer, width: '35%' }} className="flex-col-start">
							<Row label="Grade" value={''} loading={isFetching} />
						</div>
					</>
				)}
			</Paper>
			<div style={styles.divider}>
				<Divider />
			</div>
		</>
	);
}

const styles = {
	container: {
		width: '100%',
		maxWidth: 1000,
		height: 275,
		display: 'flex',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
		outline: `1px solid ${theme.palette.primary.main}`,
		transition: 'width 500ms ease, height 350ms ease',
		marginBottom: 20,
		cursor: 'pointer',
	},
	divider: {
		width: '100%',
		height: 1,
		marginBottom: 5,
	},
	innerContainer: {
		width: '50%',
		maxWidth: 450,
		padding: '0px 10px 10px',
	},
	row: {
		width: '100%',
		margin: '2px 0px',
	},
};
