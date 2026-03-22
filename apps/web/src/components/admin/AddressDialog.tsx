'use client';
import Combobox, { type ComboboxOption } from '@/components/ui/Combobox';
import Input from '@/components/ui/Input';
import Dropdown from '@/components/ui/Dropdown';
import { Textarea } from '@/components/ui/Input';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import Dialog from '@/components/ui/Dialog';
import StepperFlow from '@/components/ui/StepperFlow';
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
	id: string;
	name: string;
	organization: string | null;
}

interface AddressFormData {
	party_id: string | null;
	name: string;
	street_address: string | null;
	city: string | null;
	state: string | null;
	postal_code: string | null;
	country: string | null;
	address_type: string;
	address_status: string;
	notes: string;
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
	const [activeStep, setActiveStep] = useState(0);

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
			notes: '',
		},
		mode: 'onChange',
	});

	const nameVal = watch('name');
	const streetAddress = watch('street_address');
	const city = watch('city');
	const state = watch('state');
	const postalCode = watch('postal_code');
	const country = watch('country');
	const addressType = watch('address_type');
	const addressStatus = watch('address_status');

	// At least one of name, street_address, or city is required
	const hasRequiredField = nameVal || streetAddress || city;

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
					id: String(address.id),
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

	// Map party matches to ComboboxOption
	const partyOptions: ComboboxOption[] = (partyMatches as PartySearchResult[]).map((p) => ({
		value: p.id,
		label: p.name,
		description: p.organization ?? undefined,
	}));

	// Find selected party option
	const selectedPartyOption = selectedParty
		? { value: selectedParty.id, label: selectedParty.name, description: selectedParty.organization ?? undefined }
		: null;

	/* =========================================================================
	   STEP CONTENT
	   ========================================================================= */

	const stepDetailsContent = (
		<div style={styles.form}>
			<p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0 }}>
				Provide the address details including label, location, type, and status.
			</p>

			{/* Party Selection - Only shown when creating new address without a pre-selected party */}
			{!isEditMode && !address?.party_id && (
				<Controller
					name="party_id"
					control={control}
					rules={{ required: 'Party is required' }}
					render={({ field }) => (
						<Combobox
							options={partyOptions}
							value={selectedPartyOption}
							onChange={(opt) => {
								const party = opt ? (partyMatches as PartySearchResult[]).find((p) => p.id === opt.value) ?? null : null;
								setSelectedParty(party);
								field.onChange(party?.id || null);
							}}
							onInputChange={(value) => {
								debouncedPartySearch(value);
							}}
							filterDisabled
							label="Party"
							placeholder="Search for party..."
							error={!!errors.party_id}
							errorText={errors.party_id?.message}
							renderOption={(option) => (
								<div>
									<span style={{ fontWeight: 'bold' }}>{option.label}</span>
									{option.description && (
										<span style={{ color: 'var(--text-secondary)' }}>{option.description}</span>
									)}
								</div>
							)}
							fullWidth
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
			<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
				<AddressFields
					control={control}
					errors={errors}
					setValue={setValue}
					disabled={isSubmitting}
					width={552}
				/>
			</div>

			{/* Address Type & Status Row */}
			<div style={{ display: 'flex', gap: 16 }}>
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
				<span style={{ color: 'var(--status-error)', fontStyle: 'italic' }}>
					* At least one of: Address Label, City, or Street Address is required
				</span>
			)}
		</div>
	);

	const addressTypeLabel = addressType === AddressType.HOME ? 'Home' : 'Business';
	const addressStatusLabel =
		addressStatus === AddressStatus.VALID ? 'Valid'
		: addressStatus === AddressStatus.MAILING ? 'Mailing'
		: addressStatus === AddressStatus.UNDELIVERABLE ? 'Undeliverable'
		: 'Unknown';

	const stepReviewContent = (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 520 }}>
			<p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0 }}>
				Review the address details below, then add any notes before submitting.
			</p>

			<div style={reviewStyles.section}>
				<span style={reviewStyles.sectionTitle}>Address Details</span>
				<div style={reviewStyles.grid}>
					{nameVal && (
						<div style={reviewStyles.field}>
							<span style={reviewStyles.label}>Label</span>
							<span style={reviewStyles.value}>{nameVal}</span>
						</div>
					)}
					{(streetAddress || city || state || postalCode) && (
						<div style={reviewStyles.field}>
							<span style={reviewStyles.label}>Address</span>
							<span style={reviewStyles.value}>
								{[streetAddress, city, state, postalCode, country].filter(Boolean).join(', ') || '--'}
							</span>
						</div>
					)}
					<div style={reviewStyles.field}>
						<span style={reviewStyles.label}>Type</span>
						<span style={reviewStyles.value}>{addressTypeLabel}</span>
					</div>
					<div style={reviewStyles.field}>
						<span style={reviewStyles.label}>Status</span>
						<span style={reviewStyles.value}>{addressStatusLabel}</span>
					</div>
					{selectedParty && (
						<div style={reviewStyles.field}>
							<span style={reviewStyles.label}>Party</span>
							<span style={reviewStyles.value}>{selectedParty.name}</span>
						</div>
					)}
				</div>
			</div>

			{/* Notes */}
			<Controller
				name="notes"
				control={control}
				render={({ field }) => (
					<Textarea
						label="Notes (optional)"
						placeholder="Additional notes about this address"
						rows={3}
						{...field}
						disabled={isSubmitting}
						style={{ width: '100%' }}
					/>
				)}
			/>
		</div>
	);

	const steps = [
		{
			key: 'details',
			label: 'Address Details',
			description: 'Name, location, type',
			content: stepDetailsContent,
			isValid: !!hasRequiredField,
		},
		{
			key: 'review',
			label: 'Review',
			description: 'Confirm and submit',
			content: stepReviewContent,
			isValid: true,
		},
	];

	return (
		<Dialog open={true} onClose={() => handleClose()} size="lg">
			<StepperFlow
				steps={steps}
				activeStep={activeStep}
				onStepChange={setActiveStep}
				onComplete={handleSubmit(onSubmit)}
				onCancel={() => handleClose()}
				completeLabel={isEditMode ? 'Update' : 'Create'}
				loading={creating || updating}
			/>
		</Dialog>
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

const reviewStyles = {
	section: {
		display: 'flex' as const,
		flexDirection: 'column' as const,
		gap: 8,
		padding: '12px 0',
		borderBottom: '1px solid var(--border-color)',
	},
	sectionTitle: {
		fontSize: 13,
		fontWeight: 600,
		color: 'var(--text-primary)',
		textTransform: 'uppercase' as const,
		letterSpacing: '0.5px',
	},
	grid: {
		display: 'flex' as const,
		flexDirection: 'column' as const,
		gap: 8,
	},
	field: {
		display: 'flex' as const,
		flexDirection: 'column' as const,
		gap: 2,
	},
	label: {
		fontSize: 12,
		color: 'var(--text-secondary)',
	},
	value: {
		fontSize: 14,
		color: 'var(--text-primary)',
	},
};
