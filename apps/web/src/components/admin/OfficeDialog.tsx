'use client';

import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import { Autocomplete, Switch, TextField, Typography } from '@mui/material';
import BasicDialog from '../common/BasicDialog';
import { usePartyTrpc } from '@/hooks/trpc/usePartyTrpc';
import { useAdminStore } from '@/stores/useAdminStore';
import { useAlertStore } from '@/stores/useAlertStore';
import { useState } from 'react';
import { Party, PartyOffice } from '@/api/database/types';
import useDebounce from '@/lib/utils/useDebounce';

interface OfficeFormData {
	party_id: number | null;
	office_name: string;
	address: string;
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
	const [selectedParty, setSelectedParty] = useState<Party | null>(null);

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
		formState: { errors, isSubmitting, isDirty },
	} = useForm<OfficeFormData>({
		defaultValues: {
			party_id: office?.party_id || null,
			office_name: office?.office_name || '',
			address: office?.address || '',
			phone: office?.phone || '',
			fax: office?.fax || '',
			is_primary: Boolean(office?.is_primary),
		},
		mode: 'onChange',
	});

	const office_name = watch('office_name');
	const address = watch('address');
	const phone = watch('phone');

	// At least one of office_name, address, or phone is required
	const hasRequiredField = office_name || address || phone;

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
						address: data.address || undefined,
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
					address: data.address || undefined,
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
							<Autocomplete
								options={partyMatches}
								getOptionLabel={(party: Party) => party.name}
								onChange={(_, value: Party | null) => {
									setSelectedParty(value);
									field.onChange(value?.id || null);
								}}
								onInputChange={(_, value: string) => {
									debouncedPartySearch(value);
								}}
								value={selectedParty}
								renderOption={(props, party: Party) => (
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

				{/* Address */}
				<Controller
					name="address"
					control={control}
					render={({ field }) => (
						<TextField
							{...field}
							label="Address"
							variant="standard"
							fullWidth
							multiline
							rows={3}
							placeholder="Street address, city, state, ZIP"
						/>
					)}
				/>

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
						* At least one of: Office Name, Address, or Phone is required
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
