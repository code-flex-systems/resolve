'use client';
import Input, { Textarea } from '@/components/ui/Input';
import Combobox, { type ComboboxOption } from '@/components/ui/Combobox';
import Chip from '@/components/ui/Chip';
import Button from '@/components/ui/Button';
import Dropdown from '@/components/ui/Dropdown';
import Switch from '@/components/ui/Switch';
import { useState, useEffect, useMemo, useCallback } from 'react';
import Dialog from '@/components/ui/Dialog';
import StepperFlow, { type Step } from '@/components/ui/StepperFlow';
import { LossTypeSelect } from '@/components/common/ReferenceDataSelect';
import { usePartyTrpc } from '@/hooks/trpc/usePartyTrpc';
import { PartyType } from '@/config/enums';
import AddressDialog from '@/components/admin/AddressDialog';
import RepresentativeDialog from '@/components/admin/RepresentativeDialog';
import type { Party } from '@/api/database/types';
import { trpc } from '@/lib/trpc';

interface PartyLinkingFormData {
	role: string[]; // Array of selected roles
	party_id: number | null;
	// Structured representative (facilitators)
	representative_id: number | null;
	address_id: number | null;
	// Free-form representative (entities)
	representative_name: string;
	// Other fields
	liability_percentage: string;
	notes: string;
	parent_claim_party_id: number | null;
	// Facilitator-specific fields
	loss_type: string | null;
	policy_limit: string;
}

interface PartyLinkingDialogProps {
	open: boolean;
	onClose: () => void;
	onSubmit: (data: {
		role: string[]; // Array of roles
		party_id: number;
		// Structured representative (facilitators)
		representative_id?: number | null;
		address_id?: number | null;
		// Free-form representative (entities)
		representative_name?: string | null;
		// Other fields
		liability_percentage?: number | null;
		notes?: string | null;
		parent_claim_party_id?: number | null;
		// Facilitator-specific fields
		loss_type?: string | null;
		policy_limit?: number | null;
	}) => Promise<void>;
	editingClaimParty?: any | null;
	currentClaimParties?: any[];
	isSubmitting?: boolean;
	/** Reference entity for role selection ('claimant_party_role' or 'adverse_party_role') */
	roleListEntity?: 'claimant_party_role' | 'adverse_party_role';
	/** Parent claim_party ID when adding a facilitator under an entity */
	parentClaimPartyId?: number | null;
	/** Whether this dialog is for adding/editing a facilitator (requires parent entity) */
	isFacilitatorMode?: boolean;
	/** Available parent entities for facilitator selection (only used when isFacilitatorMode=true and no parentClaimPartyId) */
	availableParentEntities?: any[];
}

export default function PartyLinkingDialog({
	open,
	onClose,
	onSubmit,
	editingClaimParty,
	currentClaimParties = [],
	isSubmitting = false,
	roleListEntity = 'claimant_party_role',
	parentClaimPartyId,
	isFacilitatorMode = false,
	availableParentEntities = [],
}: PartyLinkingDialogProps) {
	const [activeStep, setActiveStep] = useState(0);
	const [formData, setFormData] = useState<PartyLinkingFormData>({
		role: [],
		party_id: null,
		// Structured representative (facilitators)
		representative_id: null,
		address_id: null,
		// Free-form representative (entities)
		representative_name: '',
		// Other fields
		liability_percentage: '',
		notes: '',
		parent_claim_party_id: parentClaimPartyId || null,
		loss_type: null,
		policy_limit: '',
	});

	const [partySearchTerm, setPartySearchTerm] = useState('');
	const [repSearchTerm, setRepSearchTerm] = useState('');
	const [selectedParty, setSelectedParty] = useState<any | null>(null);
	const [selectedAddress, setSelectedAddress] = useState<any | null>(null);
	const [selectedRepresentative, setSelectedRepresentative] = useState<any | null>(null);
	const [selectedParentEntity, setSelectedParentEntity] = useState<any | null>(null);
	// Inline creation dialogs (kept for address/rep which are simple)
	const [showCreateAddressDialog, setShowCreateAddressDialog] = useState(false);
	const [showCreateRepDialog, setShowCreateRepDialog] = useState(false);

	// Inline party creation (replaces the nested PartyDialog)
	const [creatingNewParty, setCreatingNewParty] = useState(false);
	const [newPartyData, setNewPartyData] = useState({
		party_type: isFacilitatorMode ? PartyType.FACILITATOR : PartyType.ENTITY,
		is_business: true,
		name: '',
		first_name: '',
		last_name: '',
		organization: '',
		contact_email: '',
		contact_phone: '',
		notes: '',
	});

	const partyTrpc = usePartyTrpc();

	// Fetch role options based on roleListEntity
	const { data: roleOptions = [] } = trpc.referenceData.getReferenceOptions.useQuery(
		{ entity: roleListEntity },
		{ staleTime: 5 * 60 * 1000 }
	);

	// Determine party type filter based on mode
	const partyTypeFilter = isFacilitatorMode ? PartyType.FACILITATOR : PartyType.ENTITY;

	// Fetch parties based on search term
	const { data: partySearchResults = [] } = partyTrpc.search(
		{ searchTerm: partySearchTerm, partyType: partyTypeFilter },
		{ enabled: partySearchTerm.length >= 2 }
	);

	// Fetch addresses for selected party (facilitators only)
	const { data: addresses = [] } = partyTrpc.listAddresses(
		{ partyId: selectedParty?.id! },
		{ enabled: !!selectedParty && isFacilitatorMode }
	);

	// Fetch representatives for selected party
	// For facilitators: filter by selected address
	// For entities: show all representatives (though we'll use free-form instead)
	const { data: representatives = [] } = partyTrpc.listRepresentatives(
		{
			partyId: selectedParty?.id!,
			addressId: isFacilitatorMode ? selectedAddress?.id : undefined
		},
		{ enabled: !!selectedParty && (isFacilitatorMode ? !!selectedAddress : true) }
	);

	// Global representative search (for rep-first selection flow in facilitator mode)
	const { data: globalRepSearchResults } = partyTrpc.listAllRepresentatives(
		{ searchTerm: repSearchTerm, limit: 20 },
		{ enabled: isFacilitatorMode && repSearchTerm.length >= 2 && !selectedParty }
	);

	// Prepare party autocomplete options
	const partyAutocompleteOptions = useMemo(
		() => [
			...(partySearchTerm.length >= 2
				? partySearchResults
				: [{ id: -2, name: 'Start typing to search...' } as any]),
		],
		[partySearchTerm, partySearchResults]
	);

	// Prepare representative autocomplete options
	// Use global search results when no party selected, otherwise use filtered list
	const representativeAutocompleteOptions = useMemo((): any[] => {
		if (!selectedParty) {
			// Global search mode
			if (repSearchTerm.length < 2) {
				// Return empty array - placeholder will guide user
				return [];
			}
			return globalRepSearchResults?.rows || [];
		}
		// Filtered mode - party (and address for facilitators) already selected
		return representatives;
	}, [selectedParty, globalRepSearchResults, representatives, repSearchTerm]);

	// Prepare parent entity options for facilitator mode
	const parentEntityOptions = useMemo(() => {
		if (!isFacilitatorMode || parentClaimPartyId) return [];
		return availableParentEntities.filter((cp) => cp.party?.party_type === 'entity');
	}, [isFacilitatorMode, parentClaimPartyId, availableParentEntities]);

	// Update form when editingClaimParty changes
	useEffect(() => {
		if (editingClaimParty) {
			// role is now an array - handle both array and legacy string formats
			const roleArray = Array.isArray(editingClaimParty.role)
				? editingClaimParty.role
				: editingClaimParty.role
					? [editingClaimParty.role]
					: [];
			setFormData({
				role: roleArray,
				party_id: editingClaimParty.party_id,
				// Structured representative (facilitators)
				representative_id: editingClaimParty.representative_id || null,
				address_id: editingClaimParty.address_id || null,
				// Free-form representative (entities)
				representative_name: editingClaimParty.representative_name || '',
				// Other fields
				liability_percentage: editingClaimParty.liability_percentage?.toString() || '',
				notes: editingClaimParty.notes || '',
				parent_claim_party_id: editingClaimParty.parent_claim_party_id || null,
				loss_type: editingClaimParty.loss_type || null,
				policy_limit: editingClaimParty.policy_limit?.toString() || '',
			});
			// Set selected party, address, and representative for autocompletes
			if (editingClaimParty.party) {
				setSelectedParty(editingClaimParty.party);
			}
			if (editingClaimParty.address) {
				setSelectedAddress(editingClaimParty.address);
			}
			if (editingClaimParty.representative) {
				setSelectedRepresentative(editingClaimParty.representative);
			}
			// Set parent entity if editing a facilitator
			if (editingClaimParty.parent_claim_party_id && availableParentEntities.length > 0) {
				const parent = availableParentEntities.find((p) => p.id === editingClaimParty.parent_claim_party_id);
				setSelectedParentEntity(parent || null);
			}
		} else {
			// Reset form for new entry
			setFormData({
				role: [],
				party_id: null,
				// Structured representative (facilitators)
				representative_id: null,
				address_id: null,
				// Free-form representative (entities)
				representative_name: '',
				// Other fields
				liability_percentage: '',
				notes: '',
				parent_claim_party_id: parentClaimPartyId || null,
				loss_type: null,
				policy_limit: '',
			});
			setSelectedParty(null);
			setSelectedAddress(null);
			setSelectedRepresentative(null);
			setSelectedParentEntity(null);
			setPartySearchTerm('');
			setRepSearchTerm('');
		}
	}, [editingClaimParty, open, parentClaimPartyId, availableParentEntities]);

	// Handle party selection (cascades to clear address and representative)
	const handlePartySelect = useCallback((party: any) => {
		setSelectedParty(party);
		setSelectedAddress(null);
		setSelectedRepresentative(null);
		setRepSearchTerm('');
		// If user selects an existing party while in creation mode, exit creation mode
		if (party) setCreatingNewParty(false);
		setFormData((prev) => ({
			...prev,
			party_id: party?.id || null,
			address_id: null,
			representative_id: null,
		}));
	}, []);

	// Handle address selection (cascades to clear representative)
	const handleAddressSelect = useCallback((address: any) => {
		setSelectedAddress(address);
		setSelectedRepresentative(null);
		setFormData((prev) => ({
			...prev,
			address_id: address?.id || null,
			representative_id: null,
		}));
	}, []);

	// Handle representative selection
	// If selected from global search (has party_name), auto-populate party and address
	const handleRepresentativeSelect = useCallback((rep: any) => {
		if (!rep) {
			setSelectedRepresentative(null);
			setFormData((prev) => ({
				...prev,
				representative_id: null,
			}));
			return;
		}

		setSelectedRepresentative(rep);
		setRepSearchTerm(''); // Clear search term after selection

		// If this rep came from global search (has party_name), auto-populate party and address
		if (rep.party_name && !selectedParty) {
			// Build party object from rep data
			const partyFromRep = {
				id: rep.party_id,
				name: rep.party_name,
				organization: rep.party_organization,
			};
			setSelectedParty(partyFromRep);
			setPartySearchTerm(rep.party_name);

			// Build address object from rep data if available
			if (rep.address_id) {
				const addressFromRep = {
					id: rep.address_id,
					name: rep.address_name,
					city: rep.address_city,
					state: rep.address_state,
					street_address: rep.address_street_address,
					postal_code: rep.address_postal_code,
					country: rep.address_country,
				};
				setSelectedAddress(addressFromRep);
			}

			setFormData((prev) => ({
				...prev,
				party_id: rep.party_id,
				address_id: rep.address_id || null,
				representative_id: rep.id,
			}));
		} else {
			setFormData((prev) => ({
				...prev,
				representative_id: rep.id,
			}));
		}
	}, [selectedParty]);

	// Handle parent entity selection (for facilitator mode)
	const handleParentEntitySelect = useCallback((parentEntity: any) => {
		setSelectedParentEntity(parentEntity);
		setFormData((prev) => ({
			...prev,
			parent_claim_party_id: parentEntity?.id || null,
		}));
	}, []);

	// Handle inline party creation — creates party via API, auto-selects, and returns to linking flow
	const handleInlinePartyCreate = useCallback(async () => {
		try {
			const name = newPartyData.is_business
				? newPartyData.name
				: `${newPartyData.first_name} ${newPartyData.last_name}`.trim();

			const createdParty = await partyTrpc.create.mutateAsync({
				party_type: newPartyData.party_type,
				is_business: newPartyData.is_business,
				name,
				first_name: !newPartyData.is_business ? newPartyData.first_name : undefined,
				last_name: !newPartyData.is_business ? newPartyData.last_name : undefined,
				organization: newPartyData.organization || undefined,
				notes: newPartyData.notes || undefined,
				...(newPartyData.contact_email || newPartyData.contact_phone ? {
					contact: {
						email: newPartyData.contact_email || undefined,
						phone: newPartyData.contact_phone || undefined,
					},
				} : {}),
			});

			// Auto-select the created party and return to main flow
			handlePartySelect(createdParty);
			setPartySearchTerm(createdParty.name);
			setCreatingNewParty(false);
			// Jump to Role & Details (index 1 in the base flow without creation steps)
			setActiveStep(1);
		} catch (error) {
			console.error('Failed to create party:', error);
		}
	}, [newPartyData, partyTrpc.create, handlePartySelect]);

	// Handle address creation from nested dialog
	const handleAddressCreated = useCallback(
		(createdAddress?: any) => {
			setShowCreateAddressDialog(false);
			if (createdAddress) {
				// Auto-select the newly created address
				handleAddressSelect(createdAddress);
			}
		},
		[handleAddressSelect]
	);

	// Handle representative creation from nested dialog
	const handleRepCreated = useCallback(
		(createdRep?: any) => {
			setShowCreateRepDialog(false);
			if (createdRep) {
				// Auto-select the newly created representative
				handleRepresentativeSelect(createdRep);
			}
		},
		[handleRepresentativeSelect]
	);

	const handleSubmit = async () => {
		if (!formData.party_id || formData.role.length === 0) return;

		// For facilitator mode, parent is required and all three levels (party, address, rep) required
		if (isFacilitatorMode && !formData.parent_claim_party_id && !parentClaimPartyId) return;
		if (isFacilitatorMode && (!formData.address_id || !formData.representative_id)) return;

		await onSubmit({
			role: formData.role,
			party_id: formData.party_id,
			// Structured representative (facilitators)
			representative_id: isFacilitatorMode ? formData.representative_id : null,
			address_id: isFacilitatorMode ? formData.address_id : null,
			// Free-form representative (entities)
			representative_name: !isFacilitatorMode && formData.representative_name ? formData.representative_name : null,
			// Other fields
			liability_percentage: formData.liability_percentage ? parseFloat(formData.liability_percentage) : null,
			notes: formData.notes || null,
			parent_claim_party_id: formData.parent_claim_party_id || parentClaimPartyId || null,
			// Facilitator-specific fields
			loss_type: isFacilitatorMode ? formData.loss_type : null,
			policy_limit: isFacilitatorMode && formData.policy_limit ? parseFloat(formData.policy_limit) : null,
		});
	};

	// Calculate current total liability from other parties (excluding the one being edited)
	const currentTotalLiability = useMemo(() => {
		return currentClaimParties
			.filter((cp) => {
				// Exclude the party being edited
				if (editingClaimParty && cp.id === editingClaimParty.id) return false;
				// Only count entities (not facilitators) with liability
				return cp.party?.party_type === 'entity' && cp.liability_percentage;
			})
			.reduce((sum, cp) => sum + (parseFloat(cp.liability_percentage) || 0), 0);
	}, [currentClaimParties, editingClaimParty]);

	// Calculate what the new total would be with current input
	const newLiabilityValue = formData.liability_percentage ? parseFloat(formData.liability_percentage) : 0;
	const projectedTotalLiability = currentTotalLiability + newLiabilityValue;

	const isValidLiabilityPercentage =
		!formData.liability_percentage ||
		(!isNaN(parseFloat(formData.liability_percentage)) &&
			parseFloat(formData.liability_percentage) >= 0 &&
			parseFloat(formData.liability_percentage) <= 100);

	// Combined liability cannot exceed 100%
	const wouldExceedTotalLiability = projectedTotalLiability > 100;

	// Determine if form is valid
	const isFormValid =
		formData.party_id &&
		formData.role.length > 0 &&
		isValidLiabilityPercentage &&
		!wouldExceedTotalLiability &&
		(!isFacilitatorMode || formData.parent_claim_party_id || parentClaimPartyId) &&
		// For facilitators: require address and representative
		(!isFacilitatorMode || (formData.address_id && formData.representative_id));

	// Determine dialog title based on mode
	const getDialogTitle = () => {
		if (editingClaimParty) {
			return isFacilitatorMode ? 'Edit Facilitator' : 'Edit Entity';
		}
		return isFacilitatorMode ? 'Add Facilitator' : 'Add Entity';
	};

	// --- ComboboxOption mappings ---

	// Parent entity options
	const parentEntityComboboxOptions: ComboboxOption[] = parentEntityOptions.map((cp: any) => ({
		value: cp.id,
		label: cp.party?.name || '',
		description: cp.role ?? undefined,
	}));
	const selectedParentEntityOption: ComboboxOption | null = selectedParentEntity
		? { value: selectedParentEntity.id, label: selectedParentEntity.party?.name || '', description: selectedParentEntity.role ?? undefined }
		: null;

	// Role options (multi-select)
	const roleComboboxOptions: ComboboxOption[] = roleOptions.map((opt) => ({
		value: opt.value,
		label: opt.display_label,
	}));
	const selectedRoleOptions: ComboboxOption[] = roleOptions
		.filter((opt) => formData.role.includes(opt.value))
		.map((opt) => ({ value: opt.value, label: opt.display_label }));

	// Party options
	const partyComboboxOptions: ComboboxOption[] = partyAutocompleteOptions.map((p: any) => ({
		value: p.id,
		label: p.name || '',
		description: p.id === -2 ? undefined : `${p.organization || 'No organization'} • ${p.address_city ? (p.address_state ? `${p.address_city}, ${p.address_state}` : p.address_city) : 'No address'}`,
		disabled: p.id === -2,
	}));
	const selectedPartyOption: ComboboxOption | null = selectedParty
		? { value: selectedParty.id, label: selectedParty.name || '' }
		: null;

	// Address options (facilitators)
	const addressComboboxOptions: ComboboxOption[] = (addresses as any[]).map((addr: any) => ({
		value: addr.id,
		label: addr.name || 'Unnamed Address',
	}));
	const selectedAddressOption: ComboboxOption | null = selectedAddress
		? { value: selectedAddress.id, label: selectedAddress.name || 'Unnamed Address' }
		: null;

	// Representative options (facilitators)
	const repComboboxOptions: ComboboxOption[] = representativeAutocompleteOptions.map((rep: any) => ({
		value: rep.id,
		label: `${rep.first_name} ${rep.last_name || ''}`.trim(),
		description: !selectedParty && rep.party_name
			? `${rep.party_name}${rep.address_city ? ` • ${rep.address_city}, ${rep.address_state}` : ''}`
			: rep.title ? `(${rep.title})` : undefined,
	}));
	const selectedRepOption: ComboboxOption | null = selectedRepresentative
		? { value: selectedRepresentative.id, label: `${selectedRepresentative.first_name} ${selectedRepresentative.last_name || ''}`.trim() }
		: null;

	if (!open) return null;

	const step1Valid = creatingNewParty
		? false // If creating, party selection isn't valid yet — user must complete creation steps
		: !!formData.party_id && (!isFacilitatorMode || !!formData.parent_claim_party_id || !!parentClaimPartyId);
	const newPartyNameValid = newPartyData.is_business ? !!newPartyData.name.trim() : !!(newPartyData.first_name.trim() && newPartyData.last_name.trim());
	const step2Valid = formData.role.length > 0 && isValidLiabilityPercentage && !wouldExceedTotalLiability;
	const step3Valid = !isFacilitatorMode || (!!formData.address_id && !!formData.representative_id);

	// Build dynamic steps — inject party creation steps when creatingNewParty is true
	const partyCreationSteps: Step[] = creatingNewParty ? [
		{
			key: 'new-party-info',
			label: 'Party Details',
			description: 'Name and type',
			isValid: newPartyNameValid,
			content: (
				<div style={{ display: 'flex', flexDirection: 'column' as const, gap: 16 }}>
					<p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: 0 }}>
						Enter the details for the new {isFacilitatorMode ? 'facilitator' : 'entity'}.
					</p>
					<Switch
						checked={newPartyData.is_business}
						onChange={(checked) => setNewPartyData({ ...newPartyData, is_business: checked, name: '', first_name: '', last_name: '' })}
						label={newPartyData.is_business ? 'Business / Organization' : 'Individual'}
					/>
					{newPartyData.is_business ? (
						<Input
							label="Business Name *"
							value={newPartyData.name}
							onChange={(e) => setNewPartyData({ ...newPartyData, name: e.target.value })}
							fullWidth
							placeholder="Enter business or organization name"
						/>
					) : (
						<div style={{ display: 'flex', gap: 12 }}>
							<Input
								label="First Name *"
								value={newPartyData.first_name}
								onChange={(e) => setNewPartyData({ ...newPartyData, first_name: e.target.value })}
								fullWidth
								placeholder="First"
							/>
							<Input
								label="Last Name *"
								value={newPartyData.last_name}
								onChange={(e) => setNewPartyData({ ...newPartyData, last_name: e.target.value })}
								fullWidth
								placeholder="Last"
							/>
						</div>
					)}
					<Input
						label="Organization"
						value={newPartyData.organization}
						onChange={(e) => setNewPartyData({ ...newPartyData, organization: e.target.value })}
						fullWidth
						placeholder="Parent organization (optional)"
					/>
				</div>
			),
		},
		{
			key: 'new-party-contact',
			label: 'Contact Info',
			description: 'Email and phone',
			isOptional: true,
			isValid: true,
			content: (
				<div style={{ display: 'flex', flexDirection: 'column' as const, gap: 16 }}>
					<p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: 0 }}>
						Optionally add contact information. You can also add this later.
					</p>
					<Input
						label="Email"
						type="email"
						value={newPartyData.contact_email}
						onChange={(e) => setNewPartyData({ ...newPartyData, contact_email: e.target.value })}
						fullWidth
						placeholder="contact@example.com"
					/>
					<Input
						label="Phone"
						type="tel"
						value={newPartyData.contact_phone}
						onChange={(e) => setNewPartyData({ ...newPartyData, contact_phone: e.target.value })}
						fullWidth
						placeholder="(555) 555-5555"
					/>
					<Textarea
						label="Notes"
						value={newPartyData.notes}
						onChange={(e) => setNewPartyData({ ...newPartyData, notes: e.target.value })}
						fullWidth
						rows={2}
						placeholder="Any notes about this party..."
					/>
				</div>
			),
		},
	] : [];

	const dynamicSteps: Step[] = [
					{
						key: 'party',
						label: isFacilitatorMode ? 'Facilitator' : 'Entity',
						description: 'Search or create',
						isValid: step1Valid,
						content: (
							<div style={{ display: 'flex', flexDirection: 'column' as const, gap: 16 }}>
								<p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: 0 }}>
									{isFacilitatorMode
										? 'Search for an existing facilitator or create a new one.'
										: 'Search for an existing entity or create a new one to link to this claim.'}
								</p>
								{isFacilitatorMode && !parentClaimPartyId && (
									<Combobox
										options={parentEntityComboboxOptions}
										value={selectedParentEntityOption}
										onChange={(opt) => {
											const entity = opt ? parentEntityOptions.find((pe: any) => pe.id === opt.value) : null;
											handleParentEntitySelect(entity);
										}}
										isOptionEqual={(a, b) => a.value === b.value}
										label="Parent Entity *"
										placeholder="Select parent entity..."
										required
										fullWidth
									/>
								)}
								<Combobox
									options={partyComboboxOptions}
									value={selectedPartyOption}
									onChange={(opt) => {
										const party = opt ? partyAutocompleteOptions.find((p: any) => p.id === opt.value) : null;
										handlePartySelect(party);
									}}
									onInputChange={(value) => setPartySearchTerm(value)}
									isOptionEqual={(a, b) => a.value === b.value}
									filterDisabled
									label={isFacilitatorMode ? 'Facilitator *' : 'Entity *'}
									placeholder={isFacilitatorMode ? 'Search facilitators...' : 'Search entities...'}
									required
									fullWidth
								/>
								<div style={{ marginTop: 12 }}>
									<Button
										variant="outlined"
										size="sm"
										onClick={() => {
										handlePartySelect(null);
										setCreatingNewParty(true);
										setActiveStep(1);
									}}
									>
										+ Create new {isFacilitatorMode ? 'facilitator' : 'entity'}
									</Button>
								</div>
							</div>
						),
					},
					{
						key: 'details',
						label: 'Role & Details',
						description: 'Role, liability, type',
						isValid: step2Valid,
						content: (
							<div style={{ display: 'flex', flexDirection: 'column' as const, gap: 16 }}>
								<p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: 0 }}>
									Select the role(s) for this party and configure additional details.
								</p>
								<Combobox
									multiple
									options={roleComboboxOptions}
									values={selectedRoleOptions}
									onChangeMultiple={(opts) => setFormData({ ...formData, role: opts.map((o) => String(o.value)) })}
									isOptionEqual={(a, b) => a.value === b.value}
									label="Roles *"
									placeholder={formData.role.length === 0 ? 'Select one or more roles...' : ''}
									required
									fullWidth
								/>
								{roleListEntity === 'adverse_party_role' && !isFacilitatorMode && (
									<Input
										label="Liability Percentage"
										type="number"
										value={formData.liability_percentage}
										onChange={(e) => setFormData({ ...formData, liability_percentage: e.target.value })}
										fullWidth
										placeholder="Enter percentage (0-100)"
										endAdornment={<span style={{ color: 'var(--text-muted)' }}>%</span>}
										error={!isValidLiabilityPercentage || wouldExceedTotalLiability}
										errorText={
											!isValidLiabilityPercentage ? 'Must be between 0 and 100'
												: wouldExceedTotalLiability ? `Combined liability cannot exceed 100% (currently ${currentTotalLiability.toFixed(1)}% allocated)`
												: undefined
										}
										helperText={
											isValidLiabilityPercentage && !wouldExceedTotalLiability
												? (currentTotalLiability > 0 ? `Current total: ${currentTotalLiability.toFixed(1)}% • Available: ${(100 - currentTotalLiability).toFixed(1)}%` : "This party's percentage of liability")
												: undefined
										}
									/>
								)}
								{isFacilitatorMode && (
									<LossTypeSelect lossType={formData.loss_type} setLossType={(lt) => setFormData({ ...formData, loss_type: lt })} clearable isFilter={false} label="Loss Type" />
								)}
								{isFacilitatorMode && roleListEntity === 'adverse_party_role' && (
									<Input
										label="Policy Limit"
										type="number"
										value={formData.policy_limit}
										onChange={(e) => setFormData({ ...formData, policy_limit: e.target.value })}
										fullWidth
										placeholder="Maximum policy payout amount"
										startAdornment={<span style={{ color: 'var(--text-muted)' }}>$</span>}
										helperText="Maximum amount this carrier will pay"
									/>
								)}
							</div>
						),
					},
					{
						key: 'representative',
						label: 'Representative',
						description: isFacilitatorMode ? 'Office & contact' : 'Contact info',
						isValid: step3Valid,
						content: (
							<div style={{ display: 'flex', flexDirection: 'column' as const, gap: 16 }}>
								<p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: 0 }}>
									{isFacilitatorMode
										? 'Select the office and representative contact for this facilitator.'
										: 'Optionally provide a representative name or contact for this entity.'}
								</p>
								{isFacilitatorMode && (
									<>
										<div>
											<Combobox
												options={addressComboboxOptions}
												value={selectedAddressOption}
												onChange={(opt) => {
													const addr = opt ? (addresses as any[]).find((a: any) => a.id === opt.value) : null;
													handleAddressSelect(addr);
												}}
												isOptionEqual={(a, b) => a.value === b.value}
												disabled={!selectedParty}
												label="Office/Address *"
												placeholder={selectedParty ? 'Select office...' : 'Select facilitator first'}
												required
												fullWidth
											/>
											{selectedParty && (
												<span style={{ color: 'var(--text-accent)', cursor: 'pointer', marginTop: 4, fontSize: 13 }} onClick={() => setShowCreateAddressDialog(true)}>
													+ Add new office
												</span>
											)}
										</div>
										<div>
											<Combobox
												options={repComboboxOptions}
												value={selectedRepOption}
												onChange={(opt) => {
													if (!opt) { handleRepresentativeSelect(null); return; }
													const rep = representativeAutocompleteOptions.find((r: any) => r.id === opt.value);
													if (rep?._isHint) return;
													handleRepresentativeSelect(rep);
												}}
												onInputChange={(value) => { if (!selectedParty) setRepSearchTerm(value); }}
												isOptionEqual={(a, b) => a.value === b.value}
												filterDisabled
												label="Representative *"
												placeholder={selectedAddress ? 'Select representative...' : selectedParty ? 'Select office first' : 'Search by name...'}
												required
												fullWidth
											/>
											{selectedAddress && (
												<span style={{ color: 'var(--text-accent)', cursor: 'pointer', marginTop: 4, fontSize: 13 }} onClick={() => setShowCreateRepDialog(true)}>
													+ Add new representative
												</span>
											)}
										</div>
									</>
								)}
								{!isFacilitatorMode && (
									<Input
										label="Representative"
										value={formData.representative_name}
										onChange={(e) => setFormData({ ...formData, representative_name: e.target.value })}
										fullWidth
										placeholder="Enter representative name or contact info..."
									/>
								)}
								<Textarea
									label="Notes"
									value={formData.notes}
									onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
									fullWidth
									rows={3}
									placeholder={isFacilitatorMode ? 'Notes about this facilitator...' : roleListEntity === 'claimant_party_role' ? "Notes about this entity's coverage(s)..." : "Notes about this entity's liability..."}
								/>
							</div>
						),
					},
					{
						key: 'review',
						label: 'Review',
						description: 'Confirm & save',
						isValid: true,
						content: (
							<div style={{ display: 'flex', flexDirection: 'column' as const, gap: 12 }}>
								<p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: 0 }}>Review the details before saving.</p>
								<div>
									<span style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>{isFacilitatorMode ? 'Facilitator' : 'Entity'}</span>
									<div style={{ fontSize: 14, fontWeight: 500, marginTop: 2 }}>{selectedParty?.name ?? '—'}</div>
								</div>
								<div>
									<span style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>Roles</span>
									<div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' as const }}>
										{selectedRoleOptions.map((r) => <Chip key={String(r.value)} size="sm" color="info">{r.label}</Chip>)}
										{selectedRoleOptions.length === 0 && <span style={{ color: 'var(--text-muted)' }}>—</span>}
									</div>
								</div>
								{formData.liability_percentage && (
									<div>
										<span style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>Liability</span>
										<div style={{ fontSize: 14, marginTop: 2 }}>{formData.liability_percentage}%</div>
									</div>
								)}
								{isFacilitatorMode && (
									<>
										<div>
											<span style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>Office</span>
											<div style={{ fontSize: 14, marginTop: 2 }}>{selectedAddress?.name ?? '—'}</div>
										</div>
										<div>
											<span style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>Representative</span>
											<div style={{ fontSize: 14, marginTop: 2 }}>{selectedRepresentative ? `${selectedRepresentative.first_name} ${selectedRepresentative.last_name ?? ''}` : '—'}</div>
										</div>
									</>
								)}
								{!isFacilitatorMode && formData.representative_name && (
									<div>
										<span style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>Representative</span>
										<div style={{ fontSize: 14, marginTop: 2 }}>{formData.representative_name}</div>
									</div>
								)}
								{formData.notes && (
									<div>
										<span style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>Notes</span>
										<div style={{ fontSize: 14, marginTop: 2 }}>{formData.notes}</div>
									</div>
								)}
							</div>
						),
					},
	];

	// Inject party creation steps after the 'party' step when creating inline
	const allSteps: Step[] = [
		dynamicSteps[0],
		...partyCreationSteps,
		...dynamicSteps.slice(1),
	];

	return (
		<Dialog open={open} onClose={onClose} size="lg">
			<StepperFlow
				steps={allSteps}
				activeStep={activeStep}
				onStepChange={setActiveStep}
				onComplete={creatingNewParty ? handleInlinePartyCreate : handleSubmit}
				onCancel={onClose}
				completeLabel={creatingNewParty ? 'Create & Continue' : (editingClaimParty ? 'Update' : 'Add')}
				loading={isSubmitting || partyTrpc.create.isPending}
			/>

			{showCreateAddressDialog && selectedParty && (
				<AddressDialog address={{ party_id: selectedParty.id, party_name: selectedParty.name } as any} onClose={handleAddressCreated} />
			)}
			{showCreateRepDialog && selectedParty && selectedAddress && (
				<RepresentativeDialog representative={{ party_id: selectedParty.id, address_id: selectedAddress.id, party_name: selectedParty.name, address_name: selectedAddress.name } as any} onClose={handleRepCreated} />
			)}
		</Dialog>
	);
}
