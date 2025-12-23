'use client';

import { MenuItem, Stack, TextField, Typography, Box, FormControlLabel, Switch } from '@mui/material';
import Send from '@mui/icons-material/Send';
import Business from '@mui/icons-material/Business';
import Person from '@mui/icons-material/Person';
import SupportAgent from '@mui/icons-material/SupportAgent';
import BasicDialog from '../common/BasicDialog';
import AddressFields from '../common/AddressFields';
import { Controller, useForm } from 'react-hook-form';
import { usePartyTrpc } from '@/hooks/trpc/usePartyTrpc';
import { useAdminStore } from '@/stores/useAdminStore';
import { PartyType } from '@/config/enums';
import type { Party } from '@/api/database/types';
import type { CountryCode } from '@/config/addressConstants';
import { useEffect, useState, useMemo } from 'react';
import useDebounce from '@/lib/utils/useDebounce';
import { skipToken } from '@tanstack/react-query';
import { computePartyDisplayName } from '@/schemas/partySchemas';
import { useCrudAlerts } from '@/hooks/useCrudAlerts';

interface PartyFormInputs {
	party_type: PartyType;
	is_business: boolean;
	// Business name (used when is_business=true)
	name: string;
	// Individual name fields (used when is_business=false)
	first_name: string;
	middle_name: string;
	last_name: string;
	suffix: string;
	// Other party fields
	organization?: string;
	notes?: string;
	// Inline contact data (creates records in separate tables)
	contact_email?: string;
	contact_phone?: string;
	contact_street_address?: string | null;
	contact_city?: string | null;
	contact_state?: string | null;
	contact_postal_code?: string | null;
	contact_country?: string | null;
}

interface PartyDialogProps {
	party?: Party & {
		// Primary contact info from LEFT JOINs
		primary_email?: string | null;
		primary_phone?: string | null;
		primary_street_address?: string | null;
		primary_city?: string | null;
		primary_state?: string | null;
		primary_postal_code?: string | null;
		primary_country?: string | null;
	};
	lockedType?: 'entity' | 'facilitator';
	onClose?: (createdParty?: Party) => void;
}

export default function PartyDialog({ party, lockedType, onClose }: PartyDialogProps) {
	const toggleNewPartyDialog = useAdminStore((state) => state.toggleNewPartyDialog);
	const partyTrpc = usePartyTrpc();
	const { mutateAsync: createParty, isPending: creating } = partyTrpc.create;
	const { mutateAsync: updateParty, isPending: updating } = partyTrpc.update;
	const [searchTerm, setSearchTerm] = useState('');
	const [duplicateMatches, setDuplicateMatches] = useState<any[]>([]);
	const { showSuccess, showError } = useCrudAlerts('party');

	const isEditMode = !!party;
	const isPending = creating || updating;

	// Search for duplicates (only when searchTerm is at least 2 chars)
	const { data: searchResults } = partyTrpc.search(searchTerm.length >= 2 ? { searchTerm } : skipToken);

	const {
		control,
		handleSubmit,
		watch,
		setValue,
		formState: { errors, isSubmitting, isValid, isDirty, dirtyFields },
	} = useForm<PartyFormInputs>({
		defaultValues: party
			? {
					party_type: party.party_type as PartyType,
					is_business: Boolean(party.is_business ?? true),
					name: party.name ?? '',
					first_name: party.first_name ?? '',
					middle_name: party.middle_name ?? '',
					last_name: party.last_name ?? '',
					suffix: party.suffix ?? '',
					organization: party.organization ?? '',
					notes: party.notes ?? '',
					// Contact info from LEFT JOINs
					contact_email: party.primary_email ?? '',
					contact_phone: party.primary_phone ?? '',
					contact_street_address: party.primary_street_address ?? '',
					contact_city: party.primary_city ?? '',
					contact_state: party.primary_state ?? '',
					contact_postal_code: party.primary_postal_code ?? '',
					contact_country: party.primary_country ?? '',
				}
			: {
					party_type: lockedType === 'facilitator' ? PartyType.FACILITATOR : PartyType.ENTITY,
					is_business: true,
					name: '',
					first_name: '',
					middle_name: '',
					last_name: '',
					suffix: '',
					organization: '',
					notes: '',
					contact_email: '',
					contact_phone: '',
					contact_street_address: '',
					contact_city: '',
					contact_state: '',
					contact_postal_code: '',
					contact_country: '',
				},
		mode: 'onChange',
	});

	const partyType = watch('party_type');
	const isBusiness = watch('is_business');
	const name = watch('name');
	const firstName = watch('first_name');
	const lastName = watch('last_name');

	// Compute display name for duplicate checking
	const displayName = useMemo(() => {
		if (isBusiness) {
			return name;
		}
		return computePartyDisplayName({
			is_business: false,
			first_name: firstName,
			last_name: lastName,
		});
	}, [isBusiness, name, firstName, lastName]);

	// Check if name requirement is met
	const hasRequiredName = isBusiness ? name && name.length >= 2 : firstName && lastName;

	// Icon mapping for party types
	const getPartyTypeIcon = (type: PartyType) => {
		switch (type) {
			case PartyType.ENTITY:
				return <Business sx={{ fontSize: 18 }} />;
			case PartyType.FACILITATOR:
				return <SupportAgent sx={{ fontSize: 18 }} />;
		}
	};

	// Memoize current party ID to prevent reference changes
	const currentPartyId = useMemo(() => (party ? (party.id as unknown as number) : null), [party]);

	// Create stable debounced function
	const debouncedSetSearchTerm = useDebounce((value: string) => {
		setSearchTerm(value);
	}, 500);

	// Update search term when display name changes
	useEffect(() => {
		if (displayName && displayName.length >= 2) {
			debouncedSetSearchTerm(displayName);
		} else {
			setSearchTerm('');
			setDuplicateMatches([]);
		}
	}, [displayName]);

	// Filter search results to find exact matches
	useEffect(() => {
		if (!searchTerm || searchTerm.length < 2) {
			setDuplicateMatches([]);
			return;
		}

		if (searchResults && searchResults.length > 0) {
			const matches = searchResults.filter((result: any) => {
				// Exclude current party when editing
				if (isEditMode && currentPartyId && result.id === currentPartyId) return false;
				// Case-insensitive exact match
				return result.name.toLowerCase() === searchTerm.toLowerCase();
			});
			setDuplicateMatches(matches);
		} else {
			setDuplicateMatches([]);
		}
	}, [searchResults, searchTerm, isEditMode, currentPartyId]);

	const handleClose = () => {
		if (onClose) {
			onClose();
		} else {
			toggleNewPartyDialog();
		}
	};

	const onSubmit = handleSubmit(async (data) => {
		try {
			let createdParty: Party | undefined;

			// Build contact object if any contact data is provided
			const hasContactData =
				data.contact_email ||
				data.contact_phone ||
				data.contact_street_address ||
				data.contact_city ||
				data.contact_state ||
				data.contact_postal_code;

			const contact = hasContactData
				? {
						email: data.contact_email || undefined,
						phone: data.contact_phone || undefined,
						address:
							data.contact_street_address ||
							data.contact_city ||
							data.contact_state ||
							data.contact_postal_code
								? {
										street_address: data.contact_street_address || null,
										city: data.contact_city || null,
										state: data.contact_state || null,
										postal_code: data.contact_postal_code || null,
										country: (data.contact_country as CountryCode) || null,
									}
								: undefined,
					}
				: undefined;

			if (isEditMode) {
				// Build update object using only dirty fields
				const updates: any = {};

				if (dirtyFields.party_type) updates.party_type = data.party_type;
				if (dirtyFields.is_business) updates.is_business = data.is_business;
				if (dirtyFields.name) updates.name = data.name;
				if (dirtyFields.first_name) updates.first_name = data.first_name;
				if (dirtyFields.middle_name) updates.middle_name = data.middle_name;
				if (dirtyFields.last_name) updates.last_name = data.last_name;
				if (dirtyFields.suffix) updates.suffix = data.suffix;
				if (dirtyFields.organization) updates.organization = data.organization || undefined;
				if (dirtyFields.notes) updates.notes = data.notes || undefined;

				// Include contact if any contact fields changed
				if (
					dirtyFields.contact_email ||
					dirtyFields.contact_phone ||
					dirtyFields.contact_street_address ||
					dirtyFields.contact_city ||
					dirtyFields.contact_state ||
					dirtyFields.contact_postal_code ||
					dirtyFields.contact_country
				) {
					updates.contact = contact;
				}

				await updateParty({
					id: party.id as unknown as number,
					params: updates,
				});
				showSuccess('update', 'Party updated');
			} else {
				// Create new party with contact data
				createdParty = (await createParty({
					party_type: data.party_type,
					is_business: data.is_business,
					name: data.is_business ? data.name : undefined,
					first_name: data.is_business ? undefined : data.first_name,
					middle_name: data.is_business ? undefined : data.middle_name || undefined,
					last_name: data.is_business ? undefined : data.last_name,
					suffix: data.is_business ? undefined : data.suffix || undefined,
					organization: data.organization || undefined,
					notes: data.notes || undefined,
					contact,
				})) as any;
				showSuccess('create', 'Party created');
			}

			// Pass created party back to caller
			if (onClose) {
				onClose(createdParty as any);
			} else {
				toggleNewPartyDialog();
			}
		} catch (e) {
			showError(isEditMode ? 'update' : 'create', e, 'Failed to save party');
		}
	});

	return (
		<BasicDialog
			title={isEditMode ? 'Edit Party' : 'New Party'}
			primaryAction={{
				label: isEditMode ? 'Update' : 'Create',
				onClick: onSubmit,
				icon: isEditMode ? undefined : <Send />,
				disabled:
					!hasRequiredName ||
					isSubmitting ||
					isPending ||
					!isValid ||
					(isEditMode && !isDirty) ||
					duplicateMatches.length > 0,
			}}
			onClose={handleClose}
			width={500}
		>
			<Stack width="100%" display="flex" alignItems="center" spacing={2}>
				<Controller
					name="party_type"
					control={control}
					rules={{ required: true }}
					render={({ field }) => (
						<TextField
							label="Type"
							select
							error={!!errors.party_type}
							{...field}
							disabled={isSubmitting || !!lockedType}
							sx={styles.textFieldOverrides}
						>
							<MenuItem value={PartyType.ENTITY}>
								<Box display="flex" alignItems="center" gap={1}>
									{getPartyTypeIcon(PartyType.ENTITY)}
									<Typography fontSize={13}>Entity</Typography>
								</Box>
							</MenuItem>
							<MenuItem value={PartyType.FACILITATOR}>
								<Box display="flex" alignItems="center" gap={1}>
									{getPartyTypeIcon(PartyType.FACILITATOR)}
									<Typography fontSize={13}>Facilitator</Typography>
								</Box>
							</MenuItem>
						</TextField>
					)}
				/>

				{/* Business/Individual Toggle */}
				<Controller
					name="is_business"
					control={control}
					render={({ field }) => (
						<Box
							sx={{
								width: 400,
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'space-between',
								px: 1,
							}}
						>
							<Box display="flex" alignItems="center" gap={1}>
								{field.value ? (
									<Business sx={{ fontSize: 18, color: 'text.secondary' }} />
								) : (
									<Person sx={{ fontSize: 18, color: 'text.secondary' }} />
								)}
								<Typography variant="body2" color="text.secondary">
									{field.value ? 'Business' : 'Individual'}
								</Typography>
							</Box>
							<FormControlLabel
								control={
									<Switch
										checked={field.value}
										onChange={(e) => field.onChange(e.target.checked)}
										disabled={isSubmitting}
									/>
								}
								label=""
							/>
						</Box>
					)}
				/>

				{/* Conditional Name Fields */}
				{isBusiness ? (
					<Controller
						name="name"
						control={control}
						rules={{ required: 'Name is required', minLength: 2, maxLength: 255 }}
						render={({ field }) => (
							<TextField
								label="Business Name"
								placeholder="Business or organization name"
								error={!!errors.name || duplicateMatches.length > 0}
								helperText={
									duplicateMatches.length > 0
										? `A party named "${duplicateMatches[0].name}" already exists`
										: errors.name?.message
								}
								{...field}
								disabled={isSubmitting}
								sx={styles.textFieldOverrides}
							/>
						)}
					/>
				) : (
					<>
						<Stack direction="row" spacing={1} width={400}>
							<Controller
								name="first_name"
								control={control}
								rules={{ required: 'First name is required', maxLength: 100 }}
								render={({ field }) => (
									<TextField
										label="First Name"
										placeholder="First name"
										error={!!errors.first_name}
										helperText={errors.first_name?.message}
										{...field}
										disabled={isSubmitting}
										sx={{ flex: 1 }}
									/>
								)}
							/>
							<Controller
								name="middle_name"
								control={control}
								rules={{ maxLength: 100 }}
								render={({ field }) => (
									<TextField
										label="Middle"
										placeholder="Middle"
										error={!!errors.middle_name}
										{...field}
										disabled={isSubmitting}
										sx={{ width: 100 }}
									/>
								)}
							/>
						</Stack>
						<Stack direction="row" spacing={1} width={400}>
							<Controller
								name="last_name"
								control={control}
								rules={{ required: 'Last name is required', maxLength: 100 }}
								render={({ field }) => (
									<TextField
										label="Last Name"
										placeholder="Last name"
										error={!!errors.last_name || duplicateMatches.length > 0}
										helperText={
											duplicateMatches.length > 0
												? `A party named "${duplicateMatches[0].name}" already exists`
												: errors.last_name?.message
										}
										{...field}
										disabled={isSubmitting}
										sx={{ flex: 1 }}
									/>
								)}
							/>
							<Controller
								name="suffix"
								control={control}
								rules={{ maxLength: 20 }}
								render={({ field }) => (
									<TextField
										label="Suffix"
										placeholder="Jr., Sr."
										error={!!errors.suffix}
										{...field}
										disabled={isSubmitting}
										sx={{ width: 100 }}
									/>
								)}
							/>
						</Stack>
					</>
				)}

				<Controller
					name="organization"
					control={control}
					rules={{ maxLength: 255 }}
					render={({ field }) => (
						<TextField
							label="Organization (optional)"
							placeholder="Organization name"
							error={!!errors.organization}
							{...field}
							disabled={isSubmitting}
							sx={styles.textFieldOverrides}
						/>
					)}
				/>

				{/* Contact Information Section */}
				<Typography variant="caption" color="text.secondary" sx={{ width: 400, pt: 1 }}>
					Contact Information (optional)
				</Typography>

				<Controller
					name="contact_email"
					control={control}
					rules={{
						pattern: {
							value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
							message: 'Invalid email address',
						},
					}}
					render={({ field }) => (
						<TextField
							label="Email"
							placeholder="email@example.com"
							type="email"
							error={!!errors.contact_email}
							helperText={errors.contact_email?.message}
							{...field}
							disabled={isSubmitting}
							sx={styles.textFieldOverrides}
						/>
					)}
				/>

				<Controller
					name="contact_phone"
					control={control}
					rules={{ maxLength: 50 }}
					render={({ field }) => (
						<TextField
							label="Phone"
							placeholder="Phone number"
							error={!!errors.contact_phone}
							{...field}
							disabled={isSubmitting}
							sx={styles.textFieldOverrides}
						/>
					)}
				/>

				<AddressFields
					control={control}
					errors={errors}
					setValue={setValue}
					disabled={isSubmitting}
					width={400}
					prefix="contact_"
				/>

				<Controller
					name="notes"
					control={control}
					rules={{ maxLength: 2000 }}
					render={({ field }) => (
						<TextField
							label="Notes (optional)"
							placeholder="Additional notes"
							error={!!errors.notes}
							multiline
							rows={3}
							{...field}
							disabled={isSubmitting}
							sx={styles.textFieldOverrides}
						/>
					)}
				/>
			</Stack>
		</BasicDialog>
	);
}

const styles = {
	textFieldOverrides: {
		width: 400,
		margin: '5px 0px',
		'& .MuiInputBase-root': {
			fontSize: 14,
			padding: '2px 5px',
		},
		'& .MuiOutlinedInput-input': {
			fontSize: 14,
			padding: '5px',
		},
	},
};
