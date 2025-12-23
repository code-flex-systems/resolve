'use client';

import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import { Autocomplete, MenuItem, Stack, TextField, Typography } from '@mui/material';
import BasicDialog from '../common/BasicDialog';
import { usePartyTrpc } from '@/hooks/trpc/usePartyTrpc';
import { useAlertStore } from '@/stores/useAlertStore';
import { useState } from 'react';
import { PartyPhone } from '@/api/database/types';
import useDebounce from '@/lib/utils/useDebounce';
import { PhoneType, PhoneStatus } from '@/schemas/partySchemas';

/** Type for party search results from tRPC */
interface PartySearchResult {
	id: number;
	name: string;
	organization: string | null;
}

interface PhoneFormData {
	party_id: number | null;
	country_code: string;
	area_code: string;
	phone_number: string;
	extension: string;
	phone_type: string;
	phone_status: string;
}

interface PhoneDialogProps {
	phone?: PartyPhone & { party_name?: string };
	partyId?: number;
	onClose?: () => void;
}

export default function PhoneDialog({ phone, partyId, onClose }: PhoneDialogProps) {
	const showAlert = useAlertStore((state) => state.showAlert);
	const partyTrpc = usePartyTrpc();
	const { mutateAsync: createPhone, isPending: creating } = partyTrpc.createPhone;
	const { mutateAsync: updatePhone, isPending: updating } = partyTrpc.updatePhone;

	const isEditMode = !!phone;
	const [partySearchTerm, setPartySearchTerm] = useState('');
	const [selectedParty, setSelectedParty] = useState<PartySearchResult | null>(null);

	// Party search with debounce (only for creating without partyId)
	const { data: partyMatches = [] } = partyTrpc.search(
		{ searchTerm: partySearchTerm },
		{
			enabled: partySearchTerm.length > 0 && !isEditMode && !partyId,
		}
	);

	const {
		control,
		handleSubmit,
		watch,
		formState: { errors, isSubmitting, isDirty },
	} = useForm<PhoneFormData>({
		defaultValues: {
			party_id: phone?.party_id || partyId || null,
			country_code: phone?.country_code || '',
			area_code: phone?.area_code || '',
			phone_number: phone?.phone_number || '',
			extension: phone?.extension || '',
			phone_type: String(phone?.phone_type ?? PhoneType.WORK),
			phone_status: String(phone?.phone_status ?? PhoneStatus.UNKNOWN),
		},
		mode: 'onChange',
	});

	const phoneNumber = watch('phone_number');

	const handleClose = () => {
		if (onClose) {
			onClose();
		}
	};

	const onSubmit: SubmitHandler<PhoneFormData> = async (data) => {
		try {
			const effectivePartyId = data.party_id || partyId;
			if (!effectivePartyId && !isEditMode) {
				showAlert('Please select a party', 'error');
				return;
			}

			if (isEditMode && phone) {
				await updatePhone({
					id: +phone.id,
					params: {
						country_code: data.country_code || undefined,
						area_code: data.area_code || undefined,
						phone_number: data.phone_number,
						extension: data.extension || undefined,
						phone_type: data.phone_type as 'mobile' | 'home' | 'work' | 'fax',
						phone_status: data.phone_status as 'valid' | 'disconnected' | 'unknown',
					},
				});
				showAlert('Phone updated successfully', 'success');
			} else {
				await createPhone({
					party_id: effectivePartyId!,
					country_code: data.country_code || undefined,
					area_code: data.area_code || undefined,
					phone_number: data.phone_number,
					extension: data.extension || undefined,
					phone_type: data.phone_type as 'mobile' | 'home' | 'work' | 'fax',
					phone_status: data.phone_status as 'valid' | 'disconnected' | 'unknown',
				});
				showAlert('Phone created successfully', 'success');
			}
			handleClose();
		} catch (error: any) {
			showAlert(error?.message || 'Failed to save phone', 'error');
		}
	};

	const debouncedPartySearch = useDebounce((search: string) => {
		setPartySearchTerm(search);
	}, 500);

	return (
		<BasicDialog
			title={isEditMode ? `Edit Phone${phone?.party_name ? ` - ${phone.party_name}` : ''}` : 'New Phone'}
			primaryAction={{
				label: isEditMode ? 'Update' : 'Create',
				onClick: handleSubmit(onSubmit),
				disabled: !phoneNumber || isSubmitting || creating || updating || (isEditMode && !isDirty),
			}}
			secondaryActions={[
				{
					label: 'Cancel',
					onClick: handleClose,
				},
			]}
			onClose={handleClose}
			width={500}
		>
			<form style={styles.form}>
				{/* Party Selection - Only shown when creating without partyId */}
				{!isEditMode && !partyId && (
					<Controller
						name="party_id"
						control={control}
						rules={{ required: 'Party is required' }}
						render={({ field }) => (
							<Autocomplete<PartySearchResult>
								options={partyMatches as PartySearchResult[]}
								getOptionLabel={(party) => party.name}
								onChange={(_, value) => {
									setSelectedParty(value);
									field.onChange(value?.id || null);
								}}
								onInputChange={(_, value: string) => {
									debouncedPartySearch(value);
								}}
								value={selectedParty}
								renderOption={(props, party) => (
									<li {...props} key={party.id}>
										<div>
											<Typography variant="body2" fontWeight="bold">
												{party.name}
											</Typography>
											{party.organization && (
												<Typography variant="caption" color="text.secondary">
													{party.organization}
												</Typography>
											)}
										</div>
									</li>
								)}
								renderInput={(params) => (
									<TextField
										{...params}
										label="Party"
										error={!!errors.party_id}
										helperText={errors.party_id?.message}
										placeholder="Search for party..."
									/>
								)}
							/>
						)}
					/>
				)}

				{/* Phone Number Row */}
				<Stack direction="row" spacing={1}>
					<Controller
						name="country_code"
						control={control}
						render={({ field }) => (
							<TextField
								{...field}
								label="Country"
								placeholder="+1"
								sx={{ width: 80 }}
							/>
						)}
					/>
					<Controller
						name="area_code"
						control={control}
						render={({ field }) => (
							<TextField
								{...field}
								label="Area"
								placeholder="555"
								sx={{ width: 80 }}
							/>
						)}
					/>
					<Controller
						name="phone_number"
						control={control}
						rules={{ required: 'Phone number is required' }}
						render={({ field }) => (
							<TextField
								{...field}
								label="Phone Number"
								placeholder="123-4567"
								error={!!errors.phone_number}
								helperText={errors.phone_number?.message}
								sx={{ flex: 1 }}
							/>
						)}
					/>
					<Controller
						name="extension"
						control={control}
						render={({ field }) => (
							<TextField
								{...field}
								label="Ext"
								placeholder="123"
								sx={{ width: 80 }}
							/>
						)}
					/>
				</Stack>

				{/* Type & Status Row */}
				<Stack direction="row" spacing={2}>
					<Controller
						name="phone_type"
						control={control}
						render={({ field }) => (
							<TextField
								{...field}
								select
								label="Phone Type"
								fullWidth
							>
								<MenuItem value={PhoneType.MOBILE}>Mobile</MenuItem>
								<MenuItem value={PhoneType.HOME}>Home</MenuItem>
								<MenuItem value={PhoneType.WORK}>Work</MenuItem>
								<MenuItem value={PhoneType.FAX}>Fax</MenuItem>
							</TextField>
						)}
					/>

					<Controller
						name="phone_status"
						control={control}
						render={({ field }) => (
							<TextField
								{...field}
								select
								label="Status"
								fullWidth
							>
								<MenuItem value={PhoneStatus.VALID}>Valid</MenuItem>
								<MenuItem value={PhoneStatus.DISCONNECTED}>Disconnected</MenuItem>
								<MenuItem value={PhoneStatus.UNKNOWN}>Unknown</MenuItem>
							</TextField>
						)}
					/>
				</Stack>
			</form>
		</BasicDialog>
	);
}

const styles = {
	form: {
		display: 'flex',
		flexDirection: 'column' as const,
		gap: '20px',
		paddingTop: '10px',
	},
};
