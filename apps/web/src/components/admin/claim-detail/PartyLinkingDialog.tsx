'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Box, TextField, Autocomplete, Typography, InputAdornment, Chip } from '@mui/material';
import BasicDialog from '@/components/common/BasicDialog';
import { LossTypeSelect } from '@/components/common/ReferenceDataSelect';
import { usePartyTrpc } from '@/hooks/trpc/usePartyTrpc';
import { PartyType } from '@/config/enums';
import PartyDialog from '@/components/admin/PartyDialog';
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
	representative_title: string;
	representative_email: string;
	representative_phone: string;
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
		representative_title?: string | null;
		representative_email?: string | null;
		representative_phone?: string | null;
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
	const [formData, setFormData] = useState<PartyLinkingFormData>({
		role: [],
		party_id: null,
		// Structured representative (facilitators)
		representative_id: null,
		address_id: null,
		// Free-form representative (entities)
		representative_name: '',
		representative_title: '',
		representative_email: '',
		representative_phone: '',
		// Other fields
		liability_percentage: '',
		notes: '',
		parent_claim_party_id: parentClaimPartyId || null,
		loss_type: null,
		policy_limit: '',
	});

	const [partySearchTerm, setPartySearchTerm] = useState('');
	const [selectedParty, setSelectedParty] = useState<any | null>(null);
	const [selectedAddress, setSelectedAddress] = useState<any | null>(null);
	const [selectedRepresentative, setSelectedRepresentative] = useState<any | null>(null);
	const [selectedParentEntity, setSelectedParentEntity] = useState<any | null>(null);
	// Inline creation dialogs
	const [showCreatePartyDialog, setShowCreatePartyDialog] = useState(false);
	const [showCreateAddressDialog, setShowCreateAddressDialog] = useState(false);
	const [showCreateRepDialog, setShowCreateRepDialog] = useState(false);

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
	const representativeAutocompleteOptions = useMemo(() => [...representatives], [representatives]);

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
				representative_title: editingClaimParty.representative_title || '',
				representative_email: editingClaimParty.representative_email || '',
				representative_phone: editingClaimParty.representative_phone || '',
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
				representative_title: '',
				representative_email: '',
				representative_phone: '',
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
		}
	}, [editingClaimParty, open, parentClaimPartyId, availableParentEntities]);

	// Handle party selection (cascades to clear address and representative)
	const handlePartySelect = useCallback((party: any) => {
		setSelectedParty(party);
		setSelectedAddress(null);
		setSelectedRepresentative(null);
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
	const handleRepresentativeSelect = useCallback((rep: any) => {
		setSelectedRepresentative(rep);
		setFormData((prev) => ({
			...prev,
			representative_id: rep?.id || null,
		}));
	}, []);

	// Handle parent entity selection (for facilitator mode)
	const handleParentEntitySelect = useCallback((parentEntity: any) => {
		setSelectedParentEntity(parentEntity);
		setFormData((prev) => ({
			...prev,
			parent_claim_party_id: parentEntity?.id || null,
		}));
	}, []);

	// Handle party creation from nested dialog
	const handlePartyCreated = useCallback(
		(createdParty?: Party) => {
			setShowCreatePartyDialog(false);
			if (createdParty) {
				// Auto-select the newly created party
				handlePartySelect(createdParty);
				setPartySearchTerm(createdParty.name);
			}
		},
		[handlePartySelect]
	);

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
			representative_title: !isFacilitatorMode && formData.representative_title ? formData.representative_title : null,
			representative_email: !isFacilitatorMode && formData.representative_email ? formData.representative_email : null,
			representative_phone: !isFacilitatorMode && formData.representative_phone ? formData.representative_phone : null,
			// Other fields
			liability_percentage: formData.liability_percentage ? parseFloat(formData.liability_percentage) : null,
			notes: formData.notes || null,
			parent_claim_party_id: formData.parent_claim_party_id || parentClaimPartyId || null,
			// Facilitator-specific fields
			loss_type: isFacilitatorMode ? formData.loss_type : null,
			policy_limit: isFacilitatorMode && formData.policy_limit ? parseFloat(formData.policy_limit) : null,
		});
	};

	const isValidLiabilityPercentage =
		!formData.liability_percentage ||
		(!isNaN(parseFloat(formData.liability_percentage)) &&
			parseFloat(formData.liability_percentage) >= 0 &&
			parseFloat(formData.liability_percentage) <= 100);

	// Determine if form is valid
	const isFormValid =
		formData.party_id &&
		formData.role.length > 0 &&
		isValidLiabilityPercentage &&
		(!isFacilitatorMode || formData.parent_claim_party_id || parentClaimPartyId) &&
		// For facilitators: require address and representative
		(!isFacilitatorMode || (formData.address_id && formData.representative_id));

	if (!open) return null;

	// Determine dialog title based on mode
	const getDialogTitle = () => {
		if (editingClaimParty) {
			return isFacilitatorMode ? 'Edit Facilitator' : 'Edit Entity';
		}
		return isFacilitatorMode ? 'Add Facilitator' : 'Add Entity';
	};

	return (
		<BasicDialog
			title={getDialogTitle()}
			primaryAction={{
				label: editingClaimParty ? 'Update' : 'Add',
				onClick: handleSubmit,
				disabled: !isFormValid || isSubmitting,
			}}
			secondaryActions={[
				{
					label: 'Cancel',
					onClick: onClose,
				},
			]}
			onClose={onClose}
			width={600}
		>
			<Box display="flex" flexDirection="column" gap={2} paddingTop={1}>
				{/* Parent Entity Selection - only for facilitator mode when no fixed parent */}
				{isFacilitatorMode && !parentClaimPartyId && (
					<Autocomplete
						options={parentEntityOptions}
						value={selectedParentEntity}
						onChange={(_, newValue) => handleParentEntitySelect(newValue)}
						getOptionLabel={(option: any) => option.party?.name || ''}
						isOptionEqualToValue={(option: any, value: any) => option.id === value.id}
						renderOption={(props, option: any) => (
							<li {...props} key={option.id}>
								<Box>
									<Typography>{option.party?.name}</Typography>
									{option.role && (
										<Typography variant="caption" color="text.secondary">
											{option.role}
										</Typography>
									)}
								</Box>
							</li>
						)}
						fullWidth
						renderInput={(params) => (
							<TextField {...params} label="Parent Entity *" placeholder="Select parent entity..." required />
						)}
					/>
				)}

				{/* Role Selection - multiselect for roles */}
				<Autocomplete
					multiple
					options={roleOptions}
					value={roleOptions.filter((opt) => formData.role.includes(opt.value))}
					onChange={(_, newValue) => setFormData({ ...formData, role: newValue.map((v) => v.value) })}
					getOptionLabel={(option) => option.display_label}
					isOptionEqualToValue={(option, value) => option.value === value.value}
					renderTags={(value, getTagProps) =>
						value.map((option, index) => {
							const { key, ...tagProps } = getTagProps({ index });
							return (
								<Chip
									key={key}
									label={option.display_label}
									size="small"
									{...tagProps}
								/>
							);
						})
					}
					renderInput={(params) => (
						<TextField
							{...params}
							label="Roles *"
							placeholder={formData.role.length === 0 ? 'Select one or more roles...' : ''}
							required
						/>
					)}
					fullWidth
				/>

				{/* Party Selection */}
				<Box>
					<Autocomplete
						options={partyAutocompleteOptions}
						value={selectedParty}
						onChange={(_, newValue) => handlePartySelect(newValue)}
						inputValue={partySearchTerm}
						onInputChange={(_, newValue) => setPartySearchTerm(newValue)}
						getOptionLabel={(option: any) => option.name || ''}
						isOptionEqualToValue={(option: any, value: any) => option.id === value.id}
						getOptionDisabled={(option: any) => option.id === -2}
						renderOption={(props, option: any) => (
							<li {...props} key={option.id}>
								{option.id === -2 ? <em style={{ color: '#999' }}>{option.name}</em> : option.name}
							</li>
						)}
						fullWidth
						renderInput={(params) => (
							<TextField
								{...params}
								label={isFacilitatorMode ? 'Facilitator *' : 'Entity *'}
								placeholder={isFacilitatorMode ? 'Search facilitators...' : 'Search entities...'}
								required
							/>
						)}
					/>
					{/* Add New Party Link */}
					<Typography
						variant="body2"
						sx={{
							color: 'primary.main',
							cursor: 'pointer',
							'&:hover': { textDecoration: 'underline' },
							mt: 0.5,
						}}
						onClick={() => setShowCreatePartyDialog(true)}
					>
						+ Add new {isFacilitatorMode ? 'facilitator' : 'entity'}
					</Typography>
				</Box>

				{/* Facilitator: Address Selection (Office) */}
				{isFacilitatorMode && (
					<Box>
						<Autocomplete
							options={addresses}
							value={selectedAddress}
							onChange={(_, newValue) => handleAddressSelect(newValue)}
							getOptionLabel={(option: any) => option.name || 'Unnamed Address'}
							isOptionEqualToValue={(option: any, value: any) => option.id === value.id}
							disabled={!selectedParty}
							fullWidth
							renderInput={(params) => (
								<TextField
									{...params}
									label="Office/Address *"
									placeholder={selectedParty ? 'Select office...' : 'Select facilitator first'}
									required
								/>
							)}
						/>
						{/* Add New Address Link */}
						{selectedParty && (
							<Typography
								variant="body2"
								sx={{
									color: 'primary.main',
									cursor: 'pointer',
									'&:hover': { textDecoration: 'underline' },
									mt: 0.5,
								}}
								onClick={() => setShowCreateAddressDialog(true)}
							>
								+ Add new office
							</Typography>
						)}
					</Box>
				)}

				{/* Facilitator: Representative Selection (filtered by address) */}
				{isFacilitatorMode && (
					<Box>
						<Autocomplete
							options={representativeAutocompleteOptions}
							value={selectedRepresentative}
							onChange={(_, newValue) => handleRepresentativeSelect(newValue)}
							getOptionLabel={(option: any) => `${option.first_name} ${option.last_name}`}
							renderOption={(props, option: any) => (
								<li {...props} key={option.id}>
									{`${option.first_name} ${option.last_name}`}
									{option.title && (
										<Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
											({option.title})
										</Typography>
									)}
								</li>
							)}
							disabled={!selectedAddress}
							fullWidth
							renderInput={(params) => (
								<TextField
									{...params}
									label="Representative *"
									placeholder={selectedAddress ? 'Select representative...' : 'Select office first'}
									required
								/>
							)}
						/>
						{/* Add New Representative Link */}
						{selectedAddress && (
							<Typography
								variant="body2"
								sx={{
									color: 'primary.main',
									cursor: 'pointer',
									'&:hover': { textDecoration: 'underline' },
									mt: 0.5,
								}}
								onClick={() => setShowCreateRepDialog(true)}
							>
								+ Add new representative
							</Typography>
						)}
					</Box>
				)}

				{/* Entity: Free-form Representative Fields */}
				{!isFacilitatorMode && (
					<>
						<TextField
							label="Representative Name"
							value={formData.representative_name}
							onChange={(e) => setFormData({ ...formData, representative_name: e.target.value })}
							fullWidth
							placeholder="Enter representative name..."
						/>
						<TextField
							label="Representative Title"
							value={formData.representative_title}
							onChange={(e) => setFormData({ ...formData, representative_title: e.target.value })}
							fullWidth
							placeholder="Enter representative title..."
						/>
						<TextField
							label="Representative Email"
							type="email"
							value={formData.representative_email}
							onChange={(e) => setFormData({ ...formData, representative_email: e.target.value })}
							fullWidth
							placeholder="Enter representative email..."
						/>
						<TextField
							label="Representative Phone"
							value={formData.representative_phone}
							onChange={(e) => setFormData({ ...formData, representative_phone: e.target.value })}
							fullWidth
							placeholder="Enter representative phone..."
						/>
					</>
				)}

				{/* Liability Percentage - only show on adverse parties tab for entities */}
				{roleListEntity === 'adverse_party_role' && !isFacilitatorMode && (
					<TextField
						label="Liability Percentage"
						type="number"
						value={formData.liability_percentage}
						onChange={(e) => setFormData({ ...formData, liability_percentage: e.target.value })}
						fullWidth
						placeholder="Enter percentage (0-100)"
						inputProps={{ step: '0.01', min: '0', max: '100' }}
						slotProps={{
							input: {
								endAdornment: <InputAdornment position="end">%</InputAdornment>,
							},
						}}
						error={!isValidLiabilityPercentage}
						helperText={
							!isValidLiabilityPercentage
								? 'Must be between 0 and 100'
								: "This party's percentage of liability for the claim"
						}
					/>
				)}

				{/* Loss Type - only show for facilitators */}
				{isFacilitatorMode && (
					<LossTypeSelect
						lossType={formData.loss_type}
						setLossType={(lossType) => setFormData({ ...formData, loss_type: lossType })}
						clearable={true}
						isFilter={false}
						label="Loss Type"
					/>
				)}

				{/* Policy Limit - only show for facilitators */}
				{isFacilitatorMode && (
					<TextField
						label="Policy Limit"
						type="number"
						value={formData.policy_limit}
						onChange={(e) => setFormData({ ...formData, policy_limit: e.target.value })}
						fullWidth
						placeholder="Enter maximum policy payout amount"
						inputProps={{ step: '0.01', min: '0' }}
						slotProps={{
							input: {
								startAdornment: <InputAdornment position="start">$</InputAdornment>,
							},
						}}
						helperText="Maximum amount this carrier will pay (their policy limit)"
					/>
				)}

				{/* Notes */}
				<TextField
					label="Notes"
					value={formData.notes}
					onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
					fullWidth
					multiline
					rows={3}
					placeholder={
						isFacilitatorMode
							? 'Notes about this facilitator...'
							: roleListEntity === 'claimant_party_role'
								? "Notes about this entity's coverage(s)..."
								: "Additional notes about this entity's liability..."
					}
				/>
			</Box>

			{/* Nested Party Creation Dialog */}
			{showCreatePartyDialog && (
				<PartyDialog lockedType={isFacilitatorMode ? 'facilitator' : 'entity'} onClose={handlePartyCreated} />
			)}

			{/* Nested Address Creation Dialog */}
			{showCreateAddressDialog && selectedParty && (
				<AddressDialog
					address={{
						party_id: selectedParty.id,
						party_name: selectedParty.name,
					} as any}
					onClose={handleAddressCreated}
				/>
			)}

			{/* Nested Representative Creation Dialog */}
			{showCreateRepDialog && selectedParty && selectedAddress && (
				<RepresentativeDialog
					representative={{
						party_id: selectedParty.id,
						address_id: selectedAddress.id,
						party_name: selectedParty.name,
						address_name: selectedAddress.name,
					} as any}
					onClose={handleRepCreated}
				/>
			)}
		</BasicDialog>
	);
}
