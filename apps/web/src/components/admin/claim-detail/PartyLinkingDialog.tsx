'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Box, TextField, Autocomplete, Typography, InputAdornment, Chip } from '@mui/material';
import BasicDialog from '@/components/common/BasicDialog';
import { LossTypeSelect } from '@/components/common/ReferenceDataSelect';
import { usePartyTrpc } from '@/hooks/trpc/usePartyTrpc';
import { PartyType } from '@/config/enums';
import PartyDialog from '@/components/admin/PartyDialog';
import type { Party } from '@/api/database/types';
import { trpc } from '@/lib/trpc';

interface PartyLinkingFormData {
	role: string[]; // Array of selected roles
	party_id: number | null;
	representative_id: number | null;
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
		representative_id?: number | null;
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
		representative_id: null,
		liability_percentage: '',
		notes: '',
		parent_claim_party_id: parentClaimPartyId || null,
		loss_type: null,
		policy_limit: '',
	});

	const [partySearchTerm, setPartySearchTerm] = useState('');
	const [selectedParty, setSelectedParty] = useState<any | null>(null);
	const [selectedRepresentative, setSelectedRepresentative] = useState<any | null>(null);
	const [selectedParentEntity, setSelectedParentEntity] = useState<any | null>(null);
	const [showCreatePartyDialog, setShowCreatePartyDialog] = useState(false);

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

	// Fetch representatives for selected party
	const { data: representatives = [] } = partyTrpc.listRepresentatives(
		{ partyId: selectedParty?.id! },
		{ enabled: !!selectedParty }
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
				representative_id: editingClaimParty.representative_id,
				liability_percentage: editingClaimParty.liability_percentage?.toString() || '',
				notes: editingClaimParty.notes || '',
				parent_claim_party_id: editingClaimParty.parent_claim_party_id || null,
				loss_type: editingClaimParty.loss_type || null,
				policy_limit: editingClaimParty.policy_limit?.toString() || '',
			});
			// Set selected party and representative for autocompletes
			if (editingClaimParty.party) {
				setSelectedParty(editingClaimParty.party);
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
				representative_id: null,
				liability_percentage: '',
				notes: '',
				parent_claim_party_id: parentClaimPartyId || null,
				loss_type: null,
				policy_limit: '',
			});
			setSelectedParty(null);
			setSelectedRepresentative(null);
			setSelectedParentEntity(null);
			setPartySearchTerm('');
		}
	}, [editingClaimParty, open, parentClaimPartyId, availableParentEntities]);

	// Handle party selection
	const handlePartySelect = useCallback((party: any) => {
		setSelectedParty(party);
		setSelectedRepresentative(null); // Clear representative when party changes
		setFormData((prev) => ({
			...prev,
			party_id: party?.id || null,
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

	const handleSubmit = async () => {
		if (!formData.party_id || formData.role.length === 0) return;

		// For facilitator mode, parent is required
		if (isFacilitatorMode && !formData.parent_claim_party_id && !parentClaimPartyId) return;

		await onSubmit({
			role: formData.role,
			party_id: formData.party_id,
			representative_id: formData.representative_id || null,
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
		(!isFacilitatorMode || formData.parent_claim_party_id || parentClaimPartyId);

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

				{/* Representative Selection */}
				<Autocomplete
					options={representativeAutocompleteOptions}
					value={selectedRepresentative}
					onChange={(_, newValue) => handleRepresentativeSelect(newValue)}
					getOptionLabel={(option: any) => {
						return `${option.first_name} ${option.last_name}`;
					}}
					renderOption={(props, option: any) => (
						<li {...props} key={option.id}>
							{`${option.first_name} ${option.last_name}`}
						</li>
					)}
					disabled={!selectedParty}
					fullWidth
					renderInput={(params) => (
						<TextField
							{...params}
							label="Representative (Optional)"
							placeholder={selectedParty ? 'Search representatives...' : 'Select entity/facilitator first'}
						/>
					)}
				/>

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
		</BasicDialog>
	);
}
