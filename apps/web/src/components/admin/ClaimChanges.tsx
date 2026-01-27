'use client';

import { useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import {
	Box,
	Button,
	Paper,
	TextField,
	Typography,
	Divider,
	Select,
	MenuItem,
	FormControl,
	InputLabel,
} from '@mui/material';
import Save from '@mui/icons-material/Save';
import Cancel from '@mui/icons-material/Cancel';
import DateField from '../common/DateField';
import { useClaimTrpc } from '@/hooks/trpc/useClaimTrpc';
import { RecoveryStatus } from '@/config/enums';
import { formatRecoveryStatus, RECOVERY_STATUS_ICONS } from '@/lib/utils/recoveryUtils';
import { ClaimSubstatusSelect, LineOfBusinessSelect } from '../common/ReferenceDataSelect';
import AddressFields from '../common/AddressFields';
import useIsAdmin from '@/hooks/useIsAdmin';
import useIsSuperAdmin from '@/hooks/useIsSuperAdmin';
import type { CountryCode } from '@/config/addressConstants';

interface ClaimChangesProps {
	claimId?: number;
}

interface ClaimFormData {
	claim_number: string;
	client: string;
	client_adjuster: string;
	insured: string;
	date_of_loss: string | null;
	loss_street_address: string | null;
	loss_city: string | null;
	loss_state: string | null;
	loss_postal_code: string | null;
	loss_country: string | null;
	recovery_status: RecoveryStatus;
	substatus: string | null;
	line_of_business: string | null;
}

export default function ClaimChanges({ claimId }: ClaimChangesProps) {
	const router = useRouter();
	const isEditMode = !!claimId;
	const isAdmin = useIsAdmin();
	const isSuperAdmin = useIsSuperAdmin();
	const canEditRestrictedFields = isAdmin || isSuperAdmin;

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting, isValid },
		setValue,
		watch,
		control,
		reset,
	} = useForm<ClaimFormData>({
		mode: 'onChange',
		defaultValues: {
			claim_number: '',
			client: '',
			client_adjuster: '',
			insured: '',
			date_of_loss: null,
			loss_street_address: '',
			loss_city: '',
			loss_state: '',
			loss_postal_code: '',
			loss_country: '',
			recovery_status: RecoveryStatus.PENDING,
			substatus: null,
			line_of_business: null,
		},
	});

	const { data: existingClaim, isLoading } = useClaimTrpc().get({ claimId: claimId! }, { enabled: isEditMode });

	const { mutateAsync: createClaims, isPending: isCreating } = useClaimTrpc().createMany;
	const { mutateAsync: updateClaim, isPending: isUpdating } = useClaimTrpc().update;

	// Populate form when editing existing claim
	useEffect(() => {
		if (existingClaim && isEditMode) {
			// Convert Date to ISO string for DateField component
			const dateOfLossStr = existingClaim.date_of_loss
				? new Date(existingClaim.date_of_loss).toISOString().split('T')[0]
				: null;
			reset({
				claim_number: existingClaim.claim_number || '',
				client: existingClaim.client || '',
				client_adjuster: existingClaim.client_adjuster || '',
				insured: existingClaim.insured || '',
				date_of_loss: dateOfLossStr,
				loss_street_address: existingClaim.loss_street_address || '',
				loss_city: existingClaim.loss_city || '',
				loss_state: existingClaim.loss_state || '',
				loss_postal_code: existingClaim.loss_postal_code || '',
				loss_country: existingClaim.loss_country || '',
				recovery_status: (existingClaim.recovery_status as RecoveryStatus) || RecoveryStatus.PENDING,
				substatus: existingClaim.substatus || null,
				line_of_business: existingClaim.line_of_business || null,
			});
		}
	}, [existingClaim, isEditMode, reset]);

	const onSubmit = handleSubmit(async (data) => {
		try {
			if (isEditMode) {
				// Build update payload - only include restricted fields if user has permission
				const updatePayload: Parameters<typeof updateClaim>[0] = {
					claimId: claimId!,
					client: data.client || null,
					client_adjuster: data.client_adjuster || null,
					insured: data.insured || null,
					date_of_loss: data.date_of_loss || null,
					loss_street_address: data.loss_street_address || null,
					loss_city: data.loss_city || null,
					loss_state: data.loss_state || null,
					loss_postal_code: data.loss_postal_code || null,
					loss_country: (data.loss_country as CountryCode) || null,
					line_of_business: data.line_of_business || null,
				};

				// Only include restricted fields for admins
				if (canEditRestrictedFields) {
					updatePayload.claim_number = data.claim_number || null;
					updatePayload.recovery_status = data.recovery_status;
					updatePayload.substatus = data.substatus ?? undefined;
				}

				await updateClaim(updatePayload);

				// Navigate back to where user came from
				router.back();
			} else {
				await createClaims({
					claims: [
						{
							claim_number: data.claim_number || null,
							client: data.client || null,
							client_adjuster: data.client_adjuster || null,
							insured: data.insured || null,
							date_of_loss: data.date_of_loss || null,
							loss_street_address: data.loss_street_address || null,
							loss_city: data.loss_city || null,
							loss_state: data.loss_state || null,
							loss_postal_code: data.loss_postal_code || null,
							loss_country: (data.loss_country as CountryCode) || null,
							line_of_business: data.line_of_business || null,
							last_updated_by: null,
							last_update: null,
						},
					],
				});

				// Navigate back to where user came from
				router.back();
			}
		} catch (e) {
			console.error(e);
		}
	});

	const handleCancel = useCallback(() => {
		router.back();
	}, [router]);

	const recoveryStatus = watch('recovery_status');
	const substatus = watch('substatus');
	const lineOfBusiness = watch('line_of_business');

	return (
		<Box sx={styles.container}>
			{isEditMode && isLoading ? (
				<Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
					<Typography>Loading claim data...</Typography>
				</Box>
			) : (
				<Paper sx={styles.paper}>
					<Box sx={styles.header}>
						<Typography variant="h5">{isEditMode ? 'Edit Claim' : 'New Claim'}</Typography>
						<Box display="flex" gap={2}>
							<Button variant="outlined" startIcon={<Cancel />} onClick={handleCancel}>
								Cancel
							</Button>
							<Button
								variant="contained"
								startIcon={<Save />}
								onClick={onSubmit}
								disabled={!isValid || isSubmitting || isCreating || isUpdating}
							>
								{isEditMode ? 'Save Changes' : 'Create Claim'}
							</Button>
						</Box>
					</Box>

					<Divider sx={{ mb: 2 }} />

					<form onSubmit={onSubmit}>
						<Box>
							{/* Basic Information Section */}
							<Typography variant="h6" sx={{ mb: 1.5 }}>
								Basic Information
							</Typography>

							<Box display="flex" flexWrap="wrap" gap={1.5} mb={2.5}>
								<TextField
									id="claim_number"
									label="Claim Number"
									placeholder="OPV63SASBX"
									error={!!errors.claim_number}
									size="small"
									disabled={!canEditRestrictedFields}
									sx={{ minWidth: 200, flex: 1, maxWidth: 300 }}
									{...register('claim_number', { required: true })}
								/>

								<TextField
									id="insured"
									label="Insured"
									placeholder="Rachel Anderson"
									error={!!errors.insured}
									size="small"
									sx={{ minWidth: 200, flex: 1, maxWidth: 300 }}
									{...register('insured', { required: true })}
								/>

								<Controller
									name="date_of_loss"
									control={control}
									rules={{ required: true }}
									render={({ field }) => (
										<DateField
											label="Date of Loss"
											value={field.value}
											onChange={field.onChange}
											error={!!errors.date_of_loss}
											sx={{ minWidth: 200, flex: 1, maxWidth: 300 }}
										/>
									)}
								/>
							</Box>

							{/* Loss Location */}
							<Typography variant="subtitle2" sx={{ mt: 2, mb: 1, color: 'text.secondary' }}>
								Loss Location
							</Typography>
							<Box display="flex" flexWrap="wrap" gap={1.5} mb={2.5}>
								<AddressFields
									control={control}
									errors={errors}
									setValue={setValue}
									disabled={isSubmitting || isCreating || isUpdating}
									variant="loss"
									width={300}
								/>
							</Box>

							{/* Client Information */}
							<Typography variant="subtitle2" sx={{ mt: 2, mb: 1, color: 'text.secondary' }}>
								Client Information
							</Typography>
							<Box display="flex" flexWrap="wrap" gap={1.5} mb={2.5}>
								<TextField
									id="client"
									label="Client"
									placeholder="Liberty Mutual"
									error={!!errors.client}
									size="small"
									sx={{ minWidth: 200, flex: 1, maxWidth: 300 }}
									{...register('client', { required: true })}
								/>

								<TextField
									id="client_adjuster"
									label="Client Adjuster"
									placeholder="Matthew Howell"
									error={!!errors.client_adjuster}
									size="small"
									sx={{ minWidth: 200, flex: 1, maxWidth: 300 }}
									{...register('client_adjuster', { required: true })}
								/>
							</Box>

							{/* Classification Section */}
							<Divider sx={{ my: 2.5 }} />
							<Typography variant="h6" sx={{ mb: 1.5 }}>
								Classification
							</Typography>

							<Box display="flex" flexWrap="wrap" gap={1.5} mb={2.5} alignItems="center">
								<LineOfBusinessSelect
									lineOfBusiness={lineOfBusiness}
									setLineOfBusiness={(value) => setValue('line_of_business', value)}
									clearable={true}
									isFilter={false}
									label="Line of Business"
									sx={{ minWidth: 200, flex: 1, maxWidth: 300 }}
								/>

								<FormControl
									size="small"
									sx={{ minWidth: 200, flex: 1, maxWidth: 300 }}
									disabled={!canEditRestrictedFields}
								>
									<InputLabel>Recovery Status</InputLabel>
									<Select
										value={recoveryStatus}
										label="Recovery Status"
										onChange={(e) => setValue('recovery_status', e.target.value as RecoveryStatus)}
									>
										{Object.values(RecoveryStatus).map((status) => (
											<MenuItem key={status} value={status}>
												<Box display="flex" alignItems="center" gap={1}>
													<Typography fontSize={14}>
														{RECOVERY_STATUS_ICONS[status]}
													</Typography>
													<Typography fontSize={14}>
														{formatRecoveryStatus(status)}
													</Typography>
												</Box>
											</MenuItem>
										))}
									</Select>
								</FormControl>

								<ClaimSubstatusSelect
									substatus={substatus}
									setSubstatus={(value) => setValue('substatus', value)}
									clearable={false}
									isFilter={false}
									label="Substatus"
									disabled={!canEditRestrictedFields}
									sx={{ minWidth: 200, flex: 1, maxWidth: 300 }}
								/>
							</Box>
						</Box>
					</form>
				</Paper>
			)}
		</Box>
	);
}

const styles = {
	container: {
		padding: '24px',
		width: '100%',
		height: '100%',
		margin: '0 auto',
	},
	paper: {
		padding: '24px',
		height: '100%',
		overflow: 'auto',
	},
	header: {
		display: 'flex',
		justifyContent: 'space-between',
		alignItems: 'center',
		mb: 2,
	},
};
