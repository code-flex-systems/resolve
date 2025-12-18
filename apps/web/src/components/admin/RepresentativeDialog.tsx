'use client';

import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import { Autocomplete, Switch, TextField, Typography } from '@mui/material';
import BasicDialog from '../common/BasicDialog';
import { usePartyTrpc } from '@/hooks/trpc/usePartyTrpc';
import { useAdminStore } from '@/stores/useAdminStore';
import { useAlertStore } from '@/stores/useAlertStore';
import { useState, useEffect } from 'react';
import { Party, PartyRepresentative, PartyOffice } from '@/api/database/types';
import useDebounce from '@/lib/utils/useDebounce';

interface RepresentativeFormData {
	party_id: number | null;
	office_id: number | null;
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
	representative?: PartyRepresentative & { party_name?: string; office_name?: string };
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

	const isEditMode = !!representative;
	const [partySearchTerm, setPartySearchTerm] = useState('');
	const [selectedParty, setSelectedParty] = useState<Party | null>(null);
	const [selectedOffice, setSelectedOffice] = useState<PartyOffice | null>(null);

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

	// Get offices for the selected party (no search, just list all offices for this party)
	const effectivePartyId = (selectedParty?.id || representative?.party_id || partyId || 0) as number;
	const { data: partyOffices = [] } = partyTrpc.listOffices(
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
			office_id: representative?.office_id || null,
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
						office_id: data.office_id || undefined,
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
					office_id: data.office_id || undefined,
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

	return (
		<BasicDialog
			title={
				isEditMode
					? `Edit Representative${representative?.party_name ? ` - ${representative.party_name}` : ''}`
					: 'New Representative'
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
				{/* Party Selection - Only shown when creating new representative */}
				{!isEditMode && (
					<Controller
						name="party_id"
						control={control}
						rules={{ required: 'Party is required' }}
						render={({ field }) => (
							<Autocomplete
								options={partyMatches as any}
								getOptionLabel={(party: any) => party.name}
								onChange={(_, value: any) => {
									setSelectedParty(value);
									field.onChange(value?.id || null);
								}}
								onInputChange={(_, value: string) => {
									debouncedPartySearch(value);
								}}
								value={selectedParty}
								disabled={lockParty}
								renderOption={(props, party: any) => (
									<li {...props} key={String(party.id)}>
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
										helperText={
											lockParty && selectedParty
												? `Locked to: ${selectedParty.name}`
												: errors.party_id?.message
										}
										placeholder={lockParty ? 'Party is locked' : 'Search for party...'}
									/>
								)}
							/>
						)}
					/>
				)}

				{/* Office Selection - Optional, requires party selection first */}
				<Controller
					name="office_id"
					control={control}
					render={({ field }) => {
						const hasParty = !!(selectedParty?.id || representative?.party_id);
						return (
							<Autocomplete
								options={partyOffices as any}
								getOptionLabel={(office: any) =>
									`${office.office_name || 'Unnamed'} - ${office.address || 'No address'}`
								}
								onChange={(_, value: any) => {
									setSelectedOffice(value);
									field.onChange(value?.id || null);
								}}
								value={selectedOffice}
								disabled={!hasParty}
								renderOption={(props, office: any) => (
									<li {...props} key={String(office.id)}>
										<div>
											<Typography variant="body2" fontWeight="bold">
												{office.office_name || 'Unnamed office'}
											</Typography>
											{office.address && (
												<Typography variant="caption" color="text.secondary">
													{office.address}
												</Typography>
											)}
										</div>
									</li>
								)}
								renderInput={(params) => (
									<TextField
										{...params}
										label="Office (Optional)"
										
										placeholder={hasParty ? 'Select an office...' : 'Select a party first'}
									/>
								)}
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
						<TextField
							{...field}
							label="First Name"
							
							fullWidth
							required
							error={!!errors.first_name}
							helperText={errors.first_name?.message}
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
						<TextField
							{...field}
							label="Last Name"
							
							fullWidth
							required
							error={!!errors.last_name}
							helperText={errors.last_name?.message}
							placeholder="Doe"
						/>
					)}
				/>

				{/* Title */}
				<Controller
					name="title"
					control={control}
					render={({ field }) => (
						<TextField
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
						<TextField
							{...field}
							label="Email"
							
							fullWidth
							error={!!errors.email}
							helperText={errors.email?.message}
							placeholder="john.doe@example.com"
						/>
					)}
				/>

				{/* Phone */}
				<Controller
					name="phone"
					control={control}
					render={({ field }) => <TextField {...field} label="Phone" fullWidth placeholder="(555) 123-4567" />}
				/>

				{/* Mobile Phone */}
				<Controller
					name="mobile_phone"
					control={control}
					render={({ field }) => (
						<TextField {...field} label="Mobile Phone" fullWidth placeholder="(555) 987-6543" />
					)}
				/>

				{/* Fax */}
				<Controller
					name="fax"
					control={control}
					render={({ field }) => <TextField {...field} label="Fax" fullWidth placeholder="(555) 123-4567" />}
				/>

				{/* Primary Representative */}
				<div style={styles.switchContainer}>
					<Typography variant="body2">Primary Representative</Typography>
					<Controller
						name="is_primary"
						control={control}
						render={({ field }) => <Switch checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />}
					/>
				</div>

				{!hasRequiredFields && (
					<Typography variant="caption" color="error" fontStyle="italic">
						* First Name and Last Name are required
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
