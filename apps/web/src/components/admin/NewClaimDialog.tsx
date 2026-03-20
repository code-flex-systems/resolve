'use client';

import { IconFileSearch, IconInfoCircle } from '@tabler/icons-react';
import { Grid } from '@mui/material';
import Input from '@/components/ui/Input';
import BasicDialog from '../common/BasicDialog';
import DateField from '../common/DateField';
import { useForm, Controller } from 'react-hook-form';
import { useAdminStore } from '@/stores/useAdminStore';
import { useClaimTrpc } from '@/hooks/trpc/useClaimTrpc';
import { formatDateToISO } from '@/lib/utils/utils';
import AddressFields from '../common/AddressFields';
import type { ClaimData } from '@/schemas/claimSchemas';

export default function NewClaimDialog() {
	const toggleNewClaimDialog = useAdminStore((state) => state.toggleNewClaimDialog);
	const {
		register,
		handleSubmit,
		control,
		setValue,
		formState: { errors, isSubmitting },
	} = useForm<ClaimData>();
	const { mutateAsync: createClaims, isPending } = useClaimTrpc().createMany;

	const onSubmit = handleSubmit(async (data) => {
		try {
			await createClaims({
				claims: [
					{
						...data,
						date_of_loss: formatDateToISO(data.date_of_loss),
						last_update: formatDateToISO(data.last_update),
						line_of_business: null,
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
				icon: <IconFileSearch size={20} />,
				disabled: isSubmitting || isPending,
			}}
			onClose={toggleNewClaimDialog}
			width={700}
		>
			<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', paddingBottom: '10px' }}>
				<IconInfoCircle style={{ color: 'var(--text-accent)' }} />
				<span style={{ marginLeft: '5px' }}>
					Toggle <b>Only Manual Claims</b> to filter by claims created here.
				</span>
			</div>

			<form style={styles.form} className="flex-col-start">
				<Grid container spacing={2}>
					<Grid style={styles.row}>
						<Input
							id="claim_number"
							label="Claim Number"
							placeholder="OPV63SASBX"
							error={!!errors.claim_number}
							style={{ width: 200 }}
							{...register('claim_number', { required: true })}
						/>
					</Grid>
					<Grid style={styles.row}>
						<Input
							id="client"
							label="Client"
							placeholder="Liberty Mutual"
							error={!!errors.client}
							style={{ width: 200 }}
							{...register('client', { required: true })}
						/>
					</Grid>
					<Grid style={styles.row}>
						<Input
							id="client_adjuster"
							label="Client Adjuster"
							placeholder="Matthew Howell"
							error={!!errors.client_adjuster}
							style={{ width: 200 }}
							{...register('client_adjuster', { required: true })}
						/>
					</Grid>
					<Grid style={styles.row}>
						<Controller
							name="date_of_loss"
							control={control}
							rules={{ required: true }}
							render={({ field }) => (
								<DateField
									label="Date of Loss"
									value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : field.value}
									onChange={(val) => field.onChange(val ? new Date(val) : null)}
									error={!!errors.date_of_loss}
									sx={{ width: 200 }}
								/>
							)}
						/>
					</Grid>
					<Grid style={styles.row}>
						<Input
							id="insured"
							label="Insured"
							placeholder="Rachel Anderson"
							error={!!errors.insured}
							style={{ width: 200 }}
							{...register('insured', { required: true })}
						/>
					</Grid>
					<Grid style={styles.row}>
						<Controller
							name="last_update"
							control={control}
							rules={{ required: true }}
							render={({ field }) => (
								<DateField
									label="Last Update"
									value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : field.value}
									onChange={(val) => field.onChange(val ? new Date(val) : null)}
									error={!!errors.last_update}
									sx={{ width: 200 }}
								/>
							)}
						/>
					</Grid>
					<Grid style={styles.row}>
						<Input
							id="last_updated_by"
							label="Updater"
							placeholder="Bridget Lubowitz-Nader"
							error={!!errors.last_updated_by}
							style={{ width: 200 }}
							{...register('last_updated_by', { required: true })}
						/>
					</Grid>
					<Grid style={styles.row}>
						<span style={{ marginBottom: 8, color: 'var(--text-secondary)' }}>
							Loss Location
						</span>
						<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
							<AddressFields
								control={control}
								errors={errors}
								setValue={setValue}
								disabled={isSubmitting || isPending}
								variant="loss"
								width={200}
							/>
						</div>
					</Grid>
					{/* Note: Total Incurred is now a calculated field from claim_coverage.amount_reserved */}
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
