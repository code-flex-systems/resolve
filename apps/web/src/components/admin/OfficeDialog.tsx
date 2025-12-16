'use client';

import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import { Autocomplete, Stack, Switch, TextField, Typography } from '@mui/material';
import BasicDialog from '../common/BasicDialog';
import AddressFields from '../common/AddressFields';
import { usePartyTrpc } from '@/hooks/trpc/usePartyTrpc';
import { useAdminStore } from '@/stores/useAdminStore';
import { useAlertStore } from '@/stores/useAlertStore';
import { useState } from 'react';
import { PartyOffice } from '@/api/database/types';
import type { CountryCode } from '@/config/addressConstants';
import useDebounce from '@/lib/utils/useDebounce';

/** Type for party search results from tRPC */
interface PartySearchResult {
	id: number;
	name: string;
	organization: string | null;
}

interface OfficeFormData {
	party_id: number | null;
	office_name: string;
	street_address: string | null;
	city: string | null;
	state: string | null;
	postal_code: string | null;
	country: string | null;
	phone: string;
	fax: string;
	is_primary: boolean;
}

interface OfficeDialogProps {
	office?: PartyOffice & { party_name?: string };
	onClose?: () => void;
}

export default function OfficeDialog({ office, onClose }: OfficeDialogProps) {
	const toggleNewOfficeDialog = useAdminStore((state) => state.toggleNewOfficeDialog);
	const showAlert = useAlertStore((state) => state.showAlert);
	const partyTrpc = usePartyTrpc();
	const { mutateAsync: createOffice, isPending: creating } = partyTrpc.createOffice;
	const { mutateAsync: updateOffice, isPending: updating } = partyTrpc.updateOffice;

	const isEditMode = !!office;
	const [partySearchTerm, setPartySearchTerm] = useState('');
	const [selectedParty, setSelectedParty] = useState<PartySearchResult | null>(null);

	// Party search with debounce
	const { data: partyMatches = [] } = partyTrpc.search(
		{ searchTerm: partySearchTerm },
		{
			enabled: partySearchTerm.length > 0 && !isEditMode,
		}
	);

	const {
		control,
		handleSubmit,
		watch,
		setValue,
		formState: { errors, isSubmitting, isDirty },
	} = useForm<OfficeFormData>({
		defaultValues: {
			party_id: office?.party_id || null,
			office_name: office?.office_name || '',
			street_address: office?.street_address || '',
			city: office?.city || '',
			state: office?.state || '',
			postal_code: office?.postal_code || '',
			country: office?.country || '',
			phone: office?.phone || '',
			fax: office?.fax || '',
			is_primary: Boolean(office?.is_primary),
		},
		mode: 'onChange',
	});

	const office_name = watch('office_name');
	const street_address = watch('street_address');
	const city = watch('city');
	const phone = watch('phone');

	// At least one of office_name, street_address, city, or phone is required
	const hasRequiredField = office_name || street_address || city || phone;

	const handleClose = () => {
		if (onClose) {
			onClose();
		} else {
			toggleNewOfficeDialog();
		}
	};

	const onSubmit: SubmitHandler<OfficeFormData> = async (data) => {
		try {
			if (!data.party_id && !isEditMode) {
				showAlert('Please select a party', 'error');
				return;
			}

			if (isEditMode && office) {
				// Update existing office
				await updateOffice({
					id: +office.id,
					params: {
						office_name: data.office_name || undefined,
						street_address: data.street_address || null,
						city: data.city || null,
						state: data.state || null,
						postal_code: data.postal_code || null,
						country: (data.country as CountryCode) || null,
						phone: data.phone || undefined,
						fax: data.fax || undefined,
						is_primary: data.is_primary,
					},
				});
				showAlert('Office updated successfully', 'success');
			} else {
				// Create new office
				await createOffice({
					party_id: data.party_id!,
					office_name: data.office_name || undefined,
					street_address: data.street_address || null,
					city: data.city || null,
					state: data.state || null,
					postal_code: data.postal_code || null,
					country: (data.country as CountryCode) || null,
					phone: data.phone || undefined,
					fax: data.fax || undefined,
					is_primary: data.is_primary,
				});
				showAlert('Office created successfully', 'success');
			}
			handleClose();
		} catch (error: any) {
			showAlert(error?.message || 'Failed to save office', 'error');
		}
	};

	const debouncedPartySearch = useDebounce((search: string) => {
		setPartySearchTerm(search);
	}, 500);

	return (
		<BasicDialog
			title={isEditMode ? `Edit Office${office?.party_name ? ` - ${office.party_name}` : ''}` : 'New Office'}
			primaryAction={{
				label: isEditMode ? 'Update' : 'Create',
				onClick: handleSubmit(onSubmit),
				disabled: !hasRequiredField || isSubmitting || creating || updating || (isEditMode && !isDirty),
			}}
			secondaryActions={[
				{
					label: 'Cancel',
					onClick: handleClose,
				},
			]}
			onClose={handleClose}
			width={600}
		>
			<form style={styles.form}>
				{/* Party Selection - Only shown when creating new office */}
				{!isEditMode && (
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
										variant="standard"
										error={!!errors.party_id}
										helperText={errors.party_id?.message}
										placeholder="Search for party..."
									/>
								)}
							/>
						)}
					/>
				)}

				{/* Office Name */}
				<Controller
					name="office_name"
					control={control}
					render={({ field }) => (
						<TextField
							{...field}
							label="Office Name"
							variant="standard"
							fullWidth
							placeholder="e.g., Main Office, Regional Branch"
						/>
					)}
				/>

				{/* Address Fields */}
				<Stack spacing={2}>
					<AddressFields
						control={control}
						errors={errors}
						setValue={setValue}
						disabled={isSubmitting}
						variant="standard"
						width={552}
					/>
				</Stack>

				{/* Phone */}
				<Controller
					name="phone"
					control={control}
					render={({ field }) => (
						<TextField {...field} label="Phone" variant="standard" fullWidth placeholder="(555) 123-4567" />
					)}
				/>

				{/* Fax */}
				<Controller
					name="fax"
					control={control}
					render={({ field }) => (
						<TextField {...field} label="Fax" variant="standard" fullWidth placeholder="(555) 123-4567" />
					)}
				/>

				{/* Primary Office */}
				<div style={styles.switchContainer}>
					<Typography variant="body2">Primary Office</Typography>
					<Controller
						name="is_primary"
						control={control}
						render={({ field }) => (
							<Switch checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />
						)}
					/>
				</div>

				{!hasRequiredField && (
					<Typography variant="caption" color="error" fontStyle="italic">
						* At least one of: Office Name, City, Street Address, or Phone is required
					</Typography>
				)}
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
	switchContainer: {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
};
