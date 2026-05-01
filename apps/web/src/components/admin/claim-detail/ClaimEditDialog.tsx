'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import BasicDialog from '@/components/common/BasicDialog';
import Input from '@/components/ui/Input';
import Dropdown from '@/components/ui/Dropdown';
import Divider from '@/components/ui/Divider';
import DateField from '@/components/common/DateField';
import AddressFields from '@/components/common/AddressFields';
import { useClaimTrpc } from '@/hooks/trpc/useClaimTrpc';
import { RecoveryStatus } from '@/config/enums';
import { formatRecoveryStatus, RECOVERY_STATUS_ICONS } from '@/lib/utils/recoveryUtils';
import {
	ClaimSubstatusSelect,
	LineOfBusinessSelect,
} from '@/components/common/ReferenceDataSelect';
import useIsAdmin from '@/hooks/useIsAdmin';
import useIsSuperAdmin from '@/hooks/useIsSuperAdmin';
import type { CountryCode } from '@/config/addressConstants';

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

interface ClaimEditDialogProps {
	claimId: string;
	onClose: () => void;
}

export default function ClaimEditDialog({ claimId, onClose }: ClaimEditDialogProps) {
	const isAdmin = useIsAdmin();
	const isSuperAdmin = useIsSuperAdmin();
	const canEditRestrictedFields = isAdmin || isSuperAdmin;

	const { data: existingClaim, isLoading } = useClaimTrpc().get(
		{ claimId },
		{ enabled: !!claimId }
	);

	const { mutateAsync: updateClaim, isPending: isUpdating } = useClaimTrpc().update;

	const {
		register,
		handleSubmit,
		formState: { errors, isValid },
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

	useEffect(() => {
		if (existingClaim) {
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
				recovery_status:
					(existingClaim.recovery_status as RecoveryStatus) || RecoveryStatus.PENDING,
				substatus: existingClaim.substatus || null,
				line_of_business: existingClaim.line_of_business || null,
			});
		}
	}, [existingClaim, reset]);

	const onSubmit = handleSubmit(async (data) => {
		try {
			const updatePayload: Parameters<typeof updateClaim>[0] = {
				claimId,
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

			if (canEditRestrictedFields) {
				updatePayload.claim_number = data.claim_number || null;
				updatePayload.recovery_status = data.recovery_status;
				updatePayload.substatus = data.substatus ?? undefined;
			}

			await updateClaim(updatePayload);
			onClose();
		} catch (e) {
			console.error('Failed to update claim:', e);
		}
	});

	const recoveryStatus = watch('recovery_status');
	const substatus = watch('substatus');
	const lineOfBusiness = watch('line_of_business');

	return (
		<BasicDialog
			onClose={onClose}
			title="Edit Claim"
			width={750}
			primaryAction={{
				label: isUpdating ? 'Saving...' : 'Save Changes',
				onClick: onSubmit,
				disabled: !isValid || isUpdating || isLoading,
			}}
		>
			{isLoading ? (
				<div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
					Loading claim data...
				</div>
			) : (
				<div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
					{/* Basic Information */}
					<div>
						<span style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: 'block' }}>
							Basic Information
						</span>
						<div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
							<Input
								id="claim_number"
								label="Claim Number"
								placeholder="CLM-2024-00001"
								error={!!errors.claim_number}
								disabled={!canEditRestrictedFields}
								style={{ minWidth: 200, flex: 1, maxWidth: 300 }}
								{...register('claim_number', { required: true })}
							/>
							<Input
								id="insured"
								label="Insured"
								placeholder="Rachel Anderson"
								error={!!errors.insured}
								style={{ minWidth: 200, flex: 1, maxWidth: 300 }}
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
						</div>
					</div>

					<Divider />

					{/* Loss Location */}
					<div>
						<span style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: 'block' }}>
							Loss Location (optional)
						</span>
						<div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
							<AddressFields
								control={control}
								errors={errors}
								setValue={setValue}
								disabled={isUpdating}
								variant="loss"
								width={300}
							/>
						</div>
					</div>

					<Divider />

					{/* Client Information */}
					<div>
						<span style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: 'block' }}>
							Client Information
						</span>
						<div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
							<Input
								id="client"
								label="Client"
								placeholder="Liberty Mutual"
								error={!!errors.client}
								style={{ minWidth: 200, flex: 1, maxWidth: 300 }}
								{...register('client', { required: true })}
							/>
							<Input
								id="client_adjuster"
								label="Client Adjuster"
								placeholder="Matthew Howell"
								error={!!errors.client_adjuster}
								style={{ minWidth: 200, flex: 1, maxWidth: 300 }}
								{...register('client_adjuster', { required: true })}
							/>
						</div>
					</div>

					<Divider />

					{/* Classification */}
					<div>
						<span style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: 'block' }}>
							Classification
						</span>
						<div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
							<div style={{ minWidth: 200, flex: 1, maxWidth: 300 }}>
								<LineOfBusinessSelect
									lineOfBusiness={lineOfBusiness}
									setLineOfBusiness={(value) => setValue('line_of_business', value)}
									clearable
									isFilter={false}
									label="Line of Business"
								/>
							</div>
							<div style={{ minWidth: 200, flex: 1, maxWidth: 300 }}>
								<Dropdown
									label="Recovery Status"
									options={Object.values(RecoveryStatus).map((status) => ({
										value: status,
										label: formatRecoveryStatus(status),
										icon: <span style={{ fontSize: 14 }}>{RECOVERY_STATUS_ICONS[status]}</span>,
									}))}
									value={recoveryStatus}
									onChange={(v) => setValue('recovery_status', v as RecoveryStatus)}
									disabled={!canEditRestrictedFields}
									fullWidth
								/>
							</div>
							<div style={{ minWidth: 200, flex: 1, maxWidth: 300 }}>
								<ClaimSubstatusSelect
									substatus={substatus}
									setSubstatus={(value) => setValue('substatus', value)}
									clearable={false}
									isFilter={false}
									label="Substatus"
									disabled={!canEditRestrictedFields}
								/>
							</div>
						</div>
					</div>
				</div>
			)}
		</BasicDialog>
	);
}
