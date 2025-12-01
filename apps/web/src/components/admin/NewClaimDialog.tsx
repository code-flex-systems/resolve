'use client';

import { Box, Grid, InputAdornment, TextField, Typography } from '@mui/material';
import BasicDialog from '../common/BasicDialog';
import { useForm } from 'react-hook-form';
import ContentPasteSearch from '@mui/icons-material/ContentPasteSearch';
import Info from '@mui/icons-material/Info';
import { useAdminStore } from '@/stores/useAdminStore';
import { Claim } from '@/types/types';
import { useClaimTrpc } from '@/hooks/trpc/useClaimTrpc';

export default function NewClaimDialog() {
	const toggleNewClaimDialog = useAdminStore((state) => state.toggleNewClaimDialog);
	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm<Omit<Claim, 'id'>>();
	const { mutateAsync: createClaims, isPending } = useClaimTrpc().createMany;

	const onSubmit = handleSubmit(async (data) => {
		try {
			await createClaims({
				claims: [
					{
						...data,
						claim_amount: data.claim_amount?.toString() ?? null,
						reserved_recovery: data.reserved_recovery?.toString() ?? null,
						paid_recovery: data.paid_recovery?.toString() ?? null,
						total_incurred: data.total_incurred?.toString() ?? null,
						date_of_loss: data.date_of_loss?.toString() ?? null,
						last_update: data.last_update?.toString() ?? null,
					},
				],
			});
			toggleNewClaimDialog();
		} catch (e) {
			console.error(e);
		}
	});

	return (
		<BasicDialog
			title="New Claim"
			primaryAction={{
				label: 'Create claim',
				onClick: onSubmit,
				icon: <ContentPasteSearch />,
				disabled: isSubmitting || isPending,
			}}
			onClose={toggleNewClaimDialog}
			width={700}
		>
			<Box display="flex" alignItems="center" justifyContent="flex-start" paddingBottom="10px">
				<Info sx={{ color: 'primary.main' }} />
				<Typography marginLeft="5px">
					Toggle <b>Only Manual Claims</b> to filter by claims created here.
				</Typography>
			</Box>

			<form style={styles.form} className="flex-col-start">
				<Grid container spacing={2}>
					<Grid style={styles.row}>
						<TextField
							id="claim_number"
							label="Claim Number"
							placeholder="OPV63SASBX"
							error={!!errors.claim_number}
							sx={{
								width: 200,
							}}
							{...register('claim_number', { required: true })}
						/>
					</Grid>
					<Grid style={styles.row}>
						<TextField
							id="claim_amount"
							label="Claim Amount"
							placeholder="75496.66"
							error={!!errors.claim_amount}
							type="number"
							slotProps={{
								input: {
									startAdornment: <InputAdornment position="start">$</InputAdornment>,
								},
							}}
							sx={{
								width: 200,
							}}
							{...register('claim_amount', { required: true })}
						/>
					</Grid>
					<Grid style={styles.row}>
						<TextField
							id="client"
							label="Client"
							placeholder="Liberty Mutual"
							error={!!errors.client}
							sx={{
								width: 200,
							}}
							{...register('client', { required: true })}
						/>
					</Grid>
					<Grid style={styles.row}>
						<TextField
							id="client_adjuster"
							label="Client Adjuster"
							placeholder="Matthew Howell"
							error={!!errors.client_adjuster}
							sx={{
								width: 200,
							}}
							{...register('client_adjuster', { required: true })}
						/>
					</Grid>
					<Grid style={styles.row}>
						<TextField
							id="date_of_loss"
							label="Date of Loss"
							error={!!errors.date_of_loss}
							type="date"
							sx={{
								width: 200,
							}}
							{...register('date_of_loss', { required: true })}
						/>
					</Grid>
					<Grid style={styles.row}>
						<TextField
							id="reserved_recovery"
							label="Reserved Recovery"
							placeholder="21521.43"
							slotProps={{
								input: {
									startAdornment: <InputAdornment position="start">$</InputAdornment>,
								},
							}}
							error={!!errors.reserved_recovery}
							type="number"
							sx={{
								width: 200,
							}}
							{...register('reserved_recovery', { required: false })}
						/>
					</Grid>
					<Grid style={styles.row}>
						<TextField
							id="paid_recovery"
							label="Paid Recovery"
							placeholder="0.00"
							slotProps={{
								input: {
									startAdornment: <InputAdornment position="start">$</InputAdornment>,
								},
							}}
							error={!!errors.paid_recovery}
							type="number"
							sx={{
								width: 200,
							}}
							{...register('paid_recovery', { required: false })}
						/>
					</Grid>
					<Grid style={styles.row}>
						<TextField
							id="insured"
							label="Insured"
							placeholder="Rachel Anderson"
							error={!!errors.insured}
							sx={{
								width: 200,
							}}
							{...register('insured', { required: true })}
						/>
					</Grid>
					<Grid style={styles.row}>
						<TextField
							id="last_update"
							label="Last Update"
							error={!!errors.last_update}
							type="date"
							sx={{
								width: 200,
							}}
							{...register('last_update', { required: true })}
						/>
					</Grid>
					<Grid style={styles.row}>
						<TextField
							id="last_updated_by"
							label="Updater"
							placeholder="Bridget Lubowitz-Nader"
							error={!!errors.last_updated_by}
							sx={{
								width: 200,
							}}
							{...register('last_updated_by', { required: true })}
						/>
					</Grid>
					<Grid style={styles.row}>
						<TextField
							id="loss_location"
							label="Loss Location"
							placeholder="New York City, NY"
							error={!!errors.loss_location}
							sx={{
								width: 200,
							}}
							{...register('loss_location', { required: true })}
						/>
					</Grid>
					<Grid style={styles.row}>
						<TextField
							id="total_incurred"
							label="Total Incurred"
							placeholder="94017.73"
							slotProps={{
								input: {
									startAdornment: <InputAdornment position="start">$</InputAdornment>,
								},
							}}
							error={!!errors.total_incurred}
							type="number"
							sx={{
								width: 200,
							}}
							{...register('total_incurred', { required: true })}
						/>
					</Grid>
				</Grid>
			</form>
		</BasicDialog>
	);
}

const styles = {
	form: {
		maxHeight: 500,
		overflow: 'auto',
	},
	row: {
		padding: '10px 0px',
	},
};
