'use client';
import Combobox, { type ComboboxOption } from '@/components/ui/Combobox';
import Input from '@/components/ui/Input';
import Switch from '@/components/ui/Switch';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import BasicDialog from '../common/BasicDialog';
import { usePartyTrpc } from '@/hooks/trpc/usePartyTrpc';
import { useAdminStore } from '@/stores/useAdminStore';
import { useAlertStore } from '@/stores/useAlertStore';
import { useState, useEffect } from 'react';
import { Party, PartyRepresentative, PartyAddress } from '@/api/database/types';
import useDebounce from '@/lib/utils/useDebounce';
import { formatAddressInline } from '@/schemas/addressSchemas';

// Helper to format address for display in autocomplete
function formatAddressOption(address: PartyAddress): string {
	const inline = formatAddressInline({
		street_address: address.street_address ?? undefined,
		city: address.city ?? undefined,
		state: address.state ?? undefined,
		postal_code: address.postal_code ?? undefined,
		country: address.country ?? undefined,
	});
	if (address.name && inline) {
		return `${address.name} - ${inline}`;
	}
	return inline || address.name || 'Unnamed address';
}

interface RepresentativeFormData {
	party_id: number | null;
	address_id: number | null;
	first_name: string;
	last_name: string;
	title: string;
	email: string;
	phone: string;
	mobile_phone: string;
	fax: string;
	is_primary: boolean;
}

interface RepresentativeDialogProps {
	representative?: PartyRepresentative & { party_name?: string; address_name?: string };
	partyId?: number;
	lockParty?: boolean;
	onClose?: (createdRep?: PartyRepresentative) => void;
}

export default function RepresentativeDialog({
	representative,
	partyId,
	lockParty,
	onClose,
}: RepresentativeDialogProps) {
	const toggleNewRepresentativeDialog = useAdminStore((state) => state.toggleNewRepresentativeDialog);
	const showAlert = useAlertStore((state) => state.showAlert);
	const partyTrpc = usePartyTrpc();
	const { mutateAsync: createRepresentative, isPending: creating } = partyTrpc.createRepresentative;
	const { mutateAsync: updateRepresentative, isPending: updating } = partyTrpc.updateRepresentative;

	const isEditMode = !!representative?.id;
	const [partySearchTerm, setPartySearchTerm] = useState('');
	const [selectedParty, setSelectedParty] = useState<Party | null>(null);
	const [selectedAddress, setSelectedAddress] = useState<PartyAddress | null>(null);

	// Load party data if partyId is provided
	const { data: initialParty } = partyTrpc.get(
		{ id: partyId! },
		{
			enabled: !!partyId && !isEditMode,
		}
	);

	// Party search with debounce
	const { data: partyMatches = [] } = partyTrpc.search(
		{ searchTerm: partySearchTerm },
		{
			enabled: partySearchTerm.length > 0 && !isEditMode,
		}
	);

	// Get addresses for the selected party (no search, just list all addresses for this party)
	const effectivePartyId = (selectedParty?.id || representative?.party_id || partyId || 0) as number;
	const { data: partyAddresses = [] } = partyTrpc.listAddresses(
		{
			partyId: effectivePartyId,
			showArchived: false,
		},
		{
			enabled: effectivePartyId > 0,
		}
	);

	const {
		control,
		handleSubmit,
		watch,
		formState: { errors, isSubmitting, isDirty },
	} = useForm<RepresentativeFormData>({
		defaultValues: {
			party_id: representative?.party_id || partyId || null,
			address_id: representative?.address_id || null,
			first_name: representative?.first_name || '',
			last_name: representative?.last_name || '',
			title: representative?.title || '',
			email: representative?.email || '',
			phone: representative?.phone || '',
			mobile_phone: representative?.mobile_phone || '',
			fax: representative?.fax || '',
			is_primary: Boolean(representative?.is_primary),
		},
		mode: 'onChange',
	});

	const first_name = watch('first_name');
	const last_name = watch('last_name');

	// Both first and last name are required
	const hasRequiredFields = first_name && last_name;

	// Set selectedParty when initialParty loads (when partyId prop is provided)
	useEffect(() => {
		if (initialParty && !selectedParty) {
			setSelectedParty(initialParty as any);
		}
	}, [initialParty, selectedParty]);

	// Initialize selectedAddress when editing and addresses are loaded
	useEffect(() => {
		if (representative?.address_id && partyAddresses.length > 0 && !selectedAddress) {
			const existingAddress = partyAddresses.find((addr) => addr.id === representative.address_id);
			if (existingAddress) {
				setSelectedAddress(existingAddress as any);
			}
		}
	}, [representative?.address_id, partyAddresses, selectedAddress]);

	const handleClose = (createdRep?: PartyRepresentative) => {
		if (onClose) {
			onClose(createdRep);
		} else {
			toggleNewRepresentativeDialog();
		}
	};

	const onSubmit: SubmitHandler<RepresentativeFormData> = async (data) => {
		try {
			if (!data.party_id && !isEditMode) {
				showAlert('Please select a party', 'error');
				return;
			}

			let createdRep: PartyRepresentative | undefined;

			if (isEditMode && representative) {
				// Update existing representative
				await updateRepresentative({
					id: +representative.id,
					params: {
						address_id: data.address_id || undefined,
						first_name: data.first_name,
						last_name: data.last_name,
						title: data.title || undefined,
						email: data.email || undefined,
						phone: data.phone || undefined,
						mobile_phone: data.mobile_phone || undefined,
						fax: data.fax || undefined,
						is_primary: data.is_primary,
					},
				});
				showAlert('Representative updated successfully', 'success');
			} else {
				// Create new representative
				createdRep = (await createRepresentative({
					party_id: data.party_id!,
					address_id: data.address_id || undefined,
					first_name: data.first_name,
					last_name: data.last_name,
					title: data.title || undefined,
					email: data.email || undefined,
					phone: data.phone || undefined,
					mobile_phone: data.mobile_phone || undefined,
					fax: data.fax || undefined,
					is_primary: data.is_primary,
				})) as any;
				showAlert('Representative created successfully', 'success');
			}
			handleClose(createdRep as any);
		} catch (error: any) {
			showAlert(error?.message || 'Failed to save representative', 'error');
		}
	};

	const debouncedPartySearch = useDebounce((search: string) => {
		setPartySearchTerm(search);
	}, 500);

	// Map party matches to ComboboxOption
	const partyOptions: ComboboxOption[] = (partyMatches as any[]).map((p: any) => ({
		value: p.id,
		label: p.name,
		description: p.organization ?? undefined,
	}));

	const selectedPartyOption: ComboboxOption | null = selectedParty
		? { value: Number(selectedParty.id), label: (selectedParty as any).name, description: (selectedParty as any).organization ?? undefined }
		: null;

	// Map addresses to ComboboxOption
	const addressOptions: ComboboxOption[] = (partyAddresses as any[]).map((addr: any) => ({
		value: addr.id,
		label: formatAddressOption(addr),
	}));

	const selectedAddressOption: ComboboxOption | null = selectedAddress
		? { value: Number(selectedAddress.id), label: formatAddressOption(selectedAddress) }
		: null;

	return (
		<BasicDialog
			title={
				isEditMode
					? `Edit Representative${representative?.party_name ? ` - ${representative.party_name}` : ''}`
					: `New Representative${representative?.party_name ? ` - ${representative.party_name}` : ''}`
			}
			primaryAction={{
				label: isEditMode ? 'Update' : 'Create',
				onClick: handleSubmit(onSubmit),
				disabled: !hasRequiredFields || isSubmitting || creating || updating || (isEditMode && !isDirty),
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
				{/* Party Selection - Only shown when creating new representative without a pre-selected party */}
				{!isEditMode && !representative?.party_id && !partyId && (
					<Controller
						name="party_id"
						control={control}
						rules={{ required: 'Party is required' }}
						render={({ field }) => (
							<Combobox
								options={partyOptions}
								value={selectedPartyOption}
								onChange={(opt) => {
									const party = opt ? (partyMatches as any[]).find((p: any) => p.id === opt.value) ?? null : null;
									setSelectedParty(party);
									field.onChange(party?.id || null);
								}}
								onInputChange={(value) => {
									debouncedPartySearch(value);
								}}
								filterDisabled
								disabled={lockParty}
								label="Party"
								placeholder={lockParty ? 'Party is locked' : 'Search for party...'}
								error={!!errors.party_id}
								errorText={
									lockParty && selectedParty
										? `Locked to: ${(selectedParty as any).name}`
										: errors.party_id?.message
								}
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

				{/* Address Selection - Optional, requires party selection first */}
				<Controller
					name="address_id"
					control={control}
					render={({ field }) => {
						const hasParty = !!(selectedParty?.id || representative?.party_id);
						return (
							<Combobox
								options={addressOptions}
								value={selectedAddressOption}
								onChange={(opt) => {
									const addr = opt ? (partyAddresses as any[]).find((a: any) => a.id === opt.value) ?? null : null;
									setSelectedAddress(addr);
									field.onChange(addr?.id || null);
								}}
								disabled={!hasParty}
								isOptionEqual={(a, b) => a.value === b.value}
								label="Address (Optional)"
								placeholder={hasParty ? 'Select an address...' : 'Select a party first'}
								renderOption={(option) => {
									const addr = (partyAddresses as any[]).find((a: any) => a.id === option.value);
									const addressLine = addr ? formatAddressInline({
										street_address: addr.street_address ?? undefined,
										city: addr.city ?? undefined,
										state: addr.state ?? undefined,
										postal_code: addr.postal_code ?? undefined,
										country: addr.country ?? undefined,
									}) : '';
									return (
										<div>
											<span style={{ fontWeight: 'bold' }}>
												{addr?.name || 'Unnamed address'}
											</span>
											{addressLine && (
												<span style={{ color: 'var(--text-secondary)' }}>
													{addressLine}
												</span>
											)}
										</div>
									);
								}}
								fullWidth
							/>
						);
					}}
				/>

				{/* First Name */}
				<Controller
					name="first_name"
					control={control}
					rules={{ required: 'First name is required' }}
					render={({ field }) => (
						<Input
							{...field}
							label="First Name"
							fullWidth
							required
							error={!!errors.first_name}
							errorText={errors.first_name?.message}
							placeholder="John"
						/>
					)}
				/>

				{/* Last Name */}
				<Controller
					name="last_name"
					control={control}
					rules={{ required: 'Last name is required' }}
					render={({ field }) => (
						<Input
							{...field}
							label="Last Name"
							fullWidth
							required
							error={!!errors.last_name}
							errorText={errors.last_name?.message}
							placeholder="Doe"
						/>
					)}
				/>

				{/* Title */}
				<Controller
					name="title"
					control={control}
					render={({ field }) => (
						<Input
							{...field}
							label="Title"
							fullWidth
							placeholder="e.g., Claims Adjuster, Attorney"
						/>
					)}
				/>

				{/* Email */}
				<Controller
					name="email"
					control={control}
					rules={{
						pattern: {
							value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
							message: 'Invalid email format',
						},
					}}
					render={({ field }) => (
						<Input
							{...field}
							label="Email"
							fullWidth
							error={!!errors.email}
							errorText={errors.email?.message}
							placeholder="john.doe@example.com"
						/>
					)}
				/>

				{/* Phone */}
				<Controller
					name="phone"
					control={control}
					render={({ field }) => <Input {...field} label="Phone" fullWidth placeholder="(555) 123-4567" />}
				/>

				{/* Mobile Phone */}
				<Controller
					name="mobile_phone"
					control={control}
					render={({ field }) => (
						<Input {...field} label="Mobile Phone" fullWidth placeholder="(555) 987-6543" />
					)}
				/>

				{/* Fax */}
				<Controller
					name="fax"
					control={control}
					render={({ field }) => <Input {...field} label="Fax" fullWidth placeholder="(555) 123-4567" />}
				/>

				{/* Primary Representative */}
				<div style={styles.switchContainer}>
					<span>Primary Representative</span>
					<Controller
						name="is_primary"
						control={control}
						render={({ field }) => <Switch checked={field.value} onChange={(checked) => field.onChange(checked)} />}
					/>
				</div>

				{!hasRequiredFields && (
					<span style={{  color: 'var(--status-error)' ,  fontStyle: 'italic'  }}>
						* First Name and Last Name are required
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
	switchContainer: {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
};
