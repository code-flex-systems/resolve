'use client';
import { Autocomplete, TextField } from '@mui/material';
import Input from '@/components/ui/Input';
import Dropdown from '@/components/ui/Dropdown';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import BasicDialog from '../common/BasicDialog';
import AddressFields from '../common/AddressFields';
import { usePartyTrpc } from '@/hooks/trpc/usePartyTrpc';
import { useAdminStore } from '@/stores/useAdminStore';
import { useAlertStore } from '@/stores/useAlertStore';
import { useState } from 'react';
import { PartyAddress } from '@/api/database/types';
import type { CountryCode } from '@/config/addressConstants';
import useDebounce from '@/lib/utils/useDebounce';
import { AddressType, AddressStatus } from '@/schemas/partySchemas';

/** Type for party search results from tRPC */
interface PartySearchResult {
	id: number;
	name: string;
	organization: string | null;
}

interface AddressFormData {
	party_id: number | null;
	name: string;
	street_address: string | null;
	city: string | null;
	state: string | null;
	postal_code: string | null;
	country: string | null;
	address_type: string;
	address_status: string;
}

interface AddressDialogProps {
	address?: PartyAddress & { party_name?: string };
	onClose?: (createdAddress?: PartyAddress) => void;
}

export default function AddressDialog({ address, onClose }: AddressDialogProps) {
	const toggleNewAddressDialog = useAdminStore((state) => state.toggleNewAddressDialog);
	const showAlert = useAlertStore((state) => state.showAlert);
	const partyTrpc = usePartyTrpc();
	const { mutateAsync: createAddress, isPending: creating } = partyTrpc.createAddress;
	const { mutateAsync: updateAddress, isPending: updating } = partyTrpc.updateAddress;

	const isEditMode = !!address?.id;
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
	} = useForm<AddressFormData>({
		defaultValues: {
			party_id: address?.party_id || null,
			name: address?.name || '',
			street_address: address?.street_address || '',
			city: address?.city || '',
			state: address?.state || '',
			postal_code: address?.postal_code || '',
			country: address?.country || '',
			address_type: String(address?.address_type ?? AddressType.BUSINESS),
			address_status: String(address?.address_status ?? AddressStatus.VALID),
		},
		mode: 'onChange',
	});

	const name = watch('name');
	const street_address = watch('street_address');
	const city = watch('city');

	// At least one of name, street_address, or city is required
	const hasRequiredField = name || street_address || city;

	const handleClose = (createdAddress?: PartyAddress) => {
		if (onClose) {
			onClose(createdAddress);
		} else {
			toggleNewAddressDialog();
		}
	};

	const onSubmit: SubmitHandler<AddressFormData> = async (data) => {
		try {
			if (!data.party_id && !isEditMode) {
				showAlert('Please select a party', 'error');
				return;
			}

			if (isEditMode && address) {
				// Update existing address
				await updateAddress({
					id: +address.id,
					params: {
						name: data.name || undefined,
						street_address: data.street_address || null,
						city: data.city || null,
						state: data.state || null,
						postal_code: data.postal_code || null,
						country: (data.country as CountryCode) || null,
						address_type: data.address_type as 'home' | 'business',
						address_status: data.address_status as 'valid' | 'mailing' | 'undeliverable' | 'unknown',
					},
				});
				showAlert('Address updated successfully', 'success');
			} else {
				// Create new address
				const createdAddress = await createAddress({
					party_id: data.party_id!,
					name: data.name || undefined,
					street_address: data.street_address || null,
					city: data.city || null,
					state: data.state || null,
					postal_code: data.postal_code || null,
					country: (data.country as CountryCode) || null,
					address_type: data.address_type as 'home' | 'business',
					address_status: data.address_status as 'valid' | 'mailing' | 'undeliverable' | 'unknown',
				});
				showAlert('Address created successfully', 'success');
				handleClose(createdAddress as unknown as PartyAddress);
				return;
			}
			handleClose();
		} catch (error: any) {
			showAlert(error?.message || 'Failed to save address', 'error');
		}
	};

	const debouncedPartySearch = useDebounce((search: string) => {
		setPartySearchTerm(search);
	}, 500);

	return (
		<BasicDialog
			title={isEditMode ? `Edit Address${address?.party_name ? ` - ${address.party_name}` : ''}` : `New Address${address?.party_name ? ` - ${address.party_name}` : ''}`}
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
				{/* Party Selection - Only shown when creating new address without a pre-selected party */}
				{!isEditMode && !address?.party_id && (
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
											<span  style={{ fontWeight: 'bold' }}>
												{party.name}
											</span>
											{party.organization && (
												<span  style={{ color: 'var(--text-secondary)' }}>
													{party.organization}
												</span>
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

				{/* Address Name (Label) */}
				<Controller
					name="name"
					control={control}
					render={({ field }) => (
						<Input
							{...field}
							label="Address Label"
							fullWidth
							placeholder="e.g., Home, Work, Headquarters"
						/>
					)}
				/>

				{/* Address Fields */}
				<div  style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
					<AddressFields
						control={control}
						errors={errors}
						setValue={setValue}
						disabled={isSubmitting}
						width={552}
					/>
				</div>

				{/* Address Type & Status Row */}
				<div  style={{ display: 'flex', gap: 16 }}>
					<Controller
						name="address_type"
						control={control}
						render={({ field }) => (
							<Dropdown
								value={field.value}
								onChange={(val) => field.onChange(String(val))}
								label="Address Type"
								fullWidth
								options={[
									{ value: AddressType.HOME, label: 'Home' },
									{ value: AddressType.BUSINESS, label: 'Business' },
								]}
							/>
						)}
					/>

					<Controller
						name="address_status"
						control={control}
						render={({ field }) => (
							<Dropdown
								value={field.value}
								onChange={(val) => field.onChange(String(val))}
								label="Address Status"
								fullWidth
								options={[
									{ value: AddressStatus.VALID, label: 'Valid' },
									{ value: AddressStatus.MAILING, label: 'Mailing' },
									{ value: AddressStatus.UNDELIVERABLE, label: 'Undeliverable' },
									{ value: AddressStatus.UNKNOWN, label: 'Unknown' },
								]}
							/>
						)}
					/>
				</div>

				{!hasRequiredField && (
					<span  style={{  color: 'var(--status-error)' ,  fontStyle: 'italic'  }}>
						* At least one of: Address Label, City, or Street Address is required
					</span>
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
};
