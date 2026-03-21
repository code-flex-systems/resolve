'use client';

import { IconBuilding, IconHeadset, IconSend, IconUser } from '@tabler/icons-react';
import Input, { Textarea } from '@/components/ui/Input';
import Dropdown from '@/components/ui/Dropdown';
import Switch from '@/components/ui/Switch';
import Dialog from '@/components/ui/Dialog';
import StepperFlow from '@/components/ui/StepperFlow';
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
	contact_phone_type?: string;
	contact_street_address?: string | null;
	contact_city?: string | null;
	contact_state?: string | null;
	contact_postal_code?: string | null;
	contact_country?: string | null;
	contact_address_type?: string;
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
	const [activeStep, setActiveStep] = useState(0);
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
					contact_phone_type: 'work',
					contact_street_address: '',
					contact_city: '',
					contact_state: '',
					contact_postal_code: '',
					contact_country: '',
					contact_address_type: 'business',
				},
		mode: 'onChange',
	});

	const partyType = watch('party_type');
	const isBusiness = watch('is_business');
	const name = watch('name');
	const firstName = watch('first_name');
	const lastName = watch('last_name');
	const organization = watch('organization');
	const contactEmail = watch('contact_email');
	const contactPhone = watch('contact_phone');
	const contactPhoneType = watch('contact_phone_type');
	const contactStreetAddress = watch('contact_street_address');
	const contactCity = watch('contact_city');
	const contactState = watch('contact_state');
	const contactPostalCode = watch('contact_postal_code');
	const contactCountry = watch('contact_country');
	const contactAddressType = watch('contact_address_type');
	const notes = watch('notes');

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
				return <IconBuilding size={18} />;
			case PartyType.FACILITATOR:
				return <IconHeadset size={18} />;
		}
	};

	const currentPartyId = party ? (party.id as unknown as number) : null;

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
						phone_type: data.contact_phone ? (data.contact_phone_type as 'mobile' | 'home' | 'work' | 'fax') : undefined,
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
						address_type: (data.contact_street_address || data.contact_city || data.contact_state || data.contact_postal_code)
							? (data.contact_address_type as 'home' | 'business')
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

	/* =========================================================================
	   STEP CONTENT
	   ========================================================================= */

	const stepIdentityContent = (
		<div style={{ width: '100%', display: 'flex', alignItems: 'center', flexDirection: 'column', gap: 16 }}>
			<p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0, width: 400 }}>
				Choose a party type and provide identity details.
			</p>

			<Controller
				name="party_type"
				control={control}
				rules={{ required: true }}
				render={({ field }) => (
					<div style={fieldStyles.textFieldOverrides}>
						<Dropdown
							label="Type"
							error={!!errors.party_type}
							value={field.value}
							onChange={(val) => field.onChange(String(val))}
							disabled={isSubmitting || !!lockedType}
							fullWidth
							options={[
								{ value: PartyType.ENTITY, label: 'Entity' },
								{ value: PartyType.FACILITATOR, label: 'Facilitator' },
							]}
						/>
					</div>
				)}
			/>

			{/* Business/Individual Toggle */}
			<Controller
				name="is_business"
				control={control}
				render={({ field }) => (
					<div
						style={{
							width: 400,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'space-between',
							paddingInline: 8,
						}}
					>
						<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
							{field.value ? (
								<IconBuilding size={18} style={{ color: 'var(--text-secondary)' }} />
							) : (
								<IconUser size={18} style={{ color: 'var(--text-secondary)' }} />
							)}
							<span style={{ color: 'var(--text-secondary)' }}>
								{field.value ? 'Business' : 'Individual'}
							</span>
						</div>
						<Switch
							checked={field.value}
							onChange={(checked) => field.onChange(checked)}
							disabled={isSubmitting}
						/>
					</div>
				)}
			/>

			{/* Conditional Name Fields */}
			{isBusiness ? (
				<Controller
					name="name"
					control={control}
					rules={{ required: 'Name is required', minLength: 2, maxLength: 255 }}
					render={({ field }) => (
						<Input
							label="Business Name"
							placeholder="Business or organization name"
							error={!!errors.name || duplicateMatches.length > 0}
							errorText={
								duplicateMatches.length > 0
									? `A party named "${duplicateMatches[0].name}" already exists`
									: errors.name?.message
							}
							{...field}
							disabled={isSubmitting}
							style={fieldStyles.textFieldOverrides}
						/>
					)}
				/>
			) : (
				<>
					<div style={{ flexDirection: 'column', display: 'flex', gap: 8, width: 400 }}>
						<Controller
							name="first_name"
							control={control}
							rules={{ required: 'First name is required', maxLength: 100 }}
							render={({ field }) => (
								<Input
									label="First Name"
									placeholder="First name"
									error={!!errors.first_name}
									errorText={errors.first_name?.message}
									{...field}
									disabled={isSubmitting}
									style={{ flex: 1 }}
								/>
							)}
						/>
						<Controller
							name="middle_name"
							control={control}
							rules={{ maxLength: 100 }}
							render={({ field }) => (
								<Input
									label="Middle"
									placeholder="Middle"
									error={!!errors.middle_name}
									{...field}
									disabled={isSubmitting}
									style={{ width: 100 }}
								/>
							)}
						/>
					</div>
					<div style={{ flexDirection: 'column', display: 'flex', gap: 8, width: 400 }}>
						<Controller
							name="last_name"
							control={control}
							rules={{ required: 'Last name is required', maxLength: 100 }}
							render={({ field }) => (
								<Input
									label="Last Name"
									placeholder="Last name"
									error={!!errors.last_name || duplicateMatches.length > 0}
									errorText={
										duplicateMatches.length > 0
											? `A party named "${duplicateMatches[0].name}" already exists`
											: errors.last_name?.message
									}
									{...field}
									disabled={isSubmitting}
									style={{ flex: 1 }}
								/>
							)}
						/>
						<Controller
							name="suffix"
							control={control}
							rules={{ maxLength: 20 }}
							render={({ field }) => (
								<Input
									label="Suffix"
									placeholder="Jr., Sr."
									error={!!errors.suffix}
									{...field}
									disabled={isSubmitting}
									style={{ width: 100 }}
								/>
							)}
						/>
					</div>
				</>
			)}

			<Controller
				name="organization"
				control={control}
				rules={{ maxLength: 255 }}
				render={({ field }) => (
					<Input
						label="Organization (optional)"
						placeholder="Organization name"
						error={!!errors.organization}
						{...field}
						disabled={isSubmitting}
						style={fieldStyles.textFieldOverrides}
					/>
				)}
			/>
		</div>
	);

	const stepContactContent = (
		<div style={{ width: '100%', display: 'flex', alignItems: 'center', flexDirection: 'column', gap: 16 }}>
			<p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0, width: 400 }}>
				Add contact information and address details. All fields are optional.
			</p>

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
					<Input
						label="Email"
						placeholder="email@example.com"
						type="email"
						error={!!errors.contact_email}
						errorText={errors.contact_email?.message}
						{...field}
						disabled={isSubmitting}
						style={fieldStyles.textFieldOverrides}
					/>
				)}
			/>

			<div style={{ flexDirection: 'column', display: 'flex', gap: 8, width: 400 }}>
				<Controller
					name="contact_phone"
					control={control}
					rules={{ maxLength: 50 }}
					render={({ field }) => (
						<Input
							label="Phone"
							placeholder="Phone number"
							error={!!errors.contact_phone}
							{...field}
							disabled={isSubmitting}
							style={{ flex: 1 }}
						/>
					)}
				/>
				<Controller
					name="contact_phone_type"
					control={control}
					render={({ field }) => (
						<div style={{ width: 120 }}>
							<Dropdown
								label="Type"
								value={field.value ?? ''}
								onChange={(val) => field.onChange(String(val))}
								disabled={isSubmitting}
								fullWidth
								options={[
									{ value: 'work', label: 'Work' },
									{ value: 'mobile', label: 'Mobile' },
									{ value: 'home', label: 'Home' },
									{ value: 'fax', label: 'Fax' },
								]}
							/>
						</div>
					)}
				/>
			</div>

			<AddressFields
				control={control}
				errors={errors}
				setValue={setValue}
				disabled={isSubmitting}
				width={400}
				prefix="contact_"
			/>

			<Controller
				name="contact_address_type"
				control={control}
				render={({ field }) => (
					<div style={fieldStyles.textFieldOverrides}>
						<Dropdown
							label="Address Type"
							value={field.value ?? ''}
							onChange={(val) => field.onChange(String(val))}
							disabled={isSubmitting}
							fullWidth
							options={[
								{ value: 'business', label: 'Business' },
								{ value: 'home', label: 'Home' },
							]}
						/>
					</div>
				)}
			/>
		</div>
	);

	const stepReviewContent = (
		<div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 480 }}>
			<p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0 }}>
				Review the party details below, then add any notes before submitting.
			</p>

			{/* Identity Summary */}
			<div style={fieldStyles.reviewSection}>
				<span style={fieldStyles.reviewSectionTitle}>Identity</span>
				<div style={fieldStyles.reviewGrid}>
					<div style={fieldStyles.reviewField}>
						<span style={fieldStyles.reviewLabel}>Type</span>
						<span style={fieldStyles.reviewValue}>{partyType === PartyType.ENTITY ? 'Entity' : 'Facilitator'}</span>
					</div>
					<div style={fieldStyles.reviewField}>
						<span style={fieldStyles.reviewLabel}>Classification</span>
						<span style={fieldStyles.reviewValue}>{isBusiness ? 'Business' : 'Individual'}</span>
					</div>
					{isBusiness ? (
						<div style={fieldStyles.reviewField}>
							<span style={fieldStyles.reviewLabel}>Business Name</span>
							<span style={fieldStyles.reviewValue}>{name || '--'}</span>
						</div>
					) : (
						<>
							<div style={fieldStyles.reviewField}>
								<span style={fieldStyles.reviewLabel}>Name</span>
								<span style={fieldStyles.reviewValue}>{[firstName, watch('middle_name'), lastName].filter(Boolean).join(' ') || '--'}</span>
							</div>
							{watch('suffix') && (
								<div style={fieldStyles.reviewField}>
									<span style={fieldStyles.reviewLabel}>Suffix</span>
									<span style={fieldStyles.reviewValue}>{watch('suffix')}</span>
								</div>
							)}
						</>
					)}
					{organization && (
						<div style={fieldStyles.reviewField}>
							<span style={fieldStyles.reviewLabel}>Organization</span>
							<span style={fieldStyles.reviewValue}>{organization}</span>
						</div>
					)}
				</div>
			</div>

			{/* Contact Summary */}
			{(contactEmail || contactPhone || contactStreetAddress || contactCity) && (
				<div style={fieldStyles.reviewSection}>
					<span style={fieldStyles.reviewSectionTitle}>Contact & Address</span>
					<div style={fieldStyles.reviewGrid}>
						{contactEmail && (
							<div style={fieldStyles.reviewField}>
								<span style={fieldStyles.reviewLabel}>Email</span>
								<span style={fieldStyles.reviewValue}>{contactEmail}</span>
							</div>
						)}
						{contactPhone && (
							<div style={fieldStyles.reviewField}>
								<span style={fieldStyles.reviewLabel}>Phone ({contactPhoneType || 'work'})</span>
								<span style={fieldStyles.reviewValue}>{contactPhone}</span>
							</div>
						)}
						{(contactStreetAddress || contactCity || contactState || contactPostalCode) && (
							<div style={fieldStyles.reviewField}>
								<span style={fieldStyles.reviewLabel}>Address ({contactAddressType || 'business'})</span>
								<span style={fieldStyles.reviewValue}>
									{[contactStreetAddress, contactCity, contactState, contactPostalCode, contactCountry]
										.filter(Boolean)
										.join(', ') || '--'}
								</span>
							</div>
						)}
					</div>
				</div>
			)}

			{/* Notes */}
			<Controller
				name="notes"
				control={control}
				rules={{ maxLength: 2000 }}
				render={({ field }) => (
					<Textarea
						label="Notes (optional)"
						placeholder="Additional notes"
						error={!!errors.notes}
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
			key: 'identity',
			label: 'Identity',
			description: 'Type and name',
			content: stepIdentityContent,
			isValid: !!hasRequiredName && !duplicateMatches.length,
		},
		{
			key: 'contact',
			label: 'Contact & Address',
			description: 'Email, phone, address',
			content: stepContactContent,
			isOptional: true,
			isValid: true,
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
		<Dialog open={true} onClose={handleClose} size="lg">
			<StepperFlow
				steps={steps}
				activeStep={activeStep}
				onStepChange={setActiveStep}
				onComplete={onSubmit}
				onCancel={handleClose}
				completeLabel={isEditMode ? 'Update' : 'Create'}
				loading={isPending}
			/>
		</Dialog>
	);
}

const fieldStyles = {
	textFieldOverrides: {
		width: 400,
		margin: '5px 0px',
	},
	reviewSection: {
		display: 'flex' as const,
		flexDirection: 'column' as const,
		gap: 8,
		padding: '12px 0',
		borderBottom: '1px solid var(--border-color)',
	},
	reviewSectionTitle: {
		fontSize: 13,
		fontWeight: 600,
		color: 'var(--text-primary)',
		textTransform: 'uppercase' as const,
		letterSpacing: '0.5px',
	},
	reviewGrid: {
		display: 'flex' as const,
		flexDirection: 'column' as const,
		gap: 8,
	},
	reviewField: {
		display: 'flex' as const,
		flexDirection: 'column' as const,
		gap: 2,
	},
	reviewLabel: {
		fontSize: 12,
		color: 'var(--text-secondary)',
	},
	reviewValue: {
		fontSize: 14,
		color: 'var(--text-primary)',
	},
};
