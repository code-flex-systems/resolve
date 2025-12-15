'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Box, TextField, Autocomplete, Typography, InputAdornment } from '@mui/material';
import BasicDialog from '@/components/common/BasicDialog';
import { ClaimPartyRoleSelect } from '@/components/common/ReferenceDataSelect';
import { usePartyTrpc } from '@/hooks/trpc/usePartyTrpc';
import { PartyType } from '@/config/enums';

interface PartyLiabilityFormData {
	role: string | null;
	party_id: number | null;
	representative_id: number | null;
	liability_percentage: string;
	notes: string;
}

interface PartyLiabilityFormDialogProps {
	open: boolean;
	onClose: () => void;
	onSubmit: (data: {
		role: string;
		party_id: number;
		representative_id?: number | null;
		liability_percentage?: number | null;
		notes?: string | null;
	}) => Promise<void>;
	editingClaimParty?: any | null;
	currentClaimParties?: any[];
	isSubmitting?: boolean;
	/** Filter party search results to a specific party type */
	partyTypeFilter?: PartyType;
}

export default function PartyLiabilityFormDialog({
	open,
	onClose,
	onSubmit,
	editingClaimParty,
	currentClaimParties = [],
	isSubmitting = false,
	partyTypeFilter,
}: PartyLiabilityFormDialogProps) {
	const [formData, setFormData] = useState<PartyLiabilityFormData>({
		role: null,
		party_id: null,
		representative_id: null,
		liability_percentage: '',
		notes: '',
	});

	const [partySearchTerm, setPartySearchTerm] = useState('');
	const [selectedParty, setSelectedParty] = useState<any | null>(null);
	const [selectedRepresentative, setSelectedRepresentative] = useState<any | null>(null);

	const partyTrpc = usePartyTrpc();

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

	// Update form when editingClaimParty changes
	useEffect(() => {
		if (editingClaimParty) {
			setFormData({
				role: editingClaimParty.role,
				party_id: editingClaimParty.party_id,
				representative_id: editingClaimParty.representative_id,
				liability_percentage: editingClaimParty.liability_percentage?.toString() || '',
				notes: editingClaimParty.notes || '',
			});
			// Set selected party and representative for autocompletes
			if (editingClaimParty.party) {
				setSelectedParty(editingClaimParty.party);
			}
			if (editingClaimParty.representative) {
				setSelectedRepresentative(editingClaimParty.representative);
			}
		} else {
			// Reset form for new entry
			setFormData({
				role: null,
				party_id: null,
				representative_id: null,
				liability_percentage: '',
				notes: '',
			});
			setSelectedParty(null);
			setSelectedRepresentative(null);
			setPartySearchTerm('');
		}
	}, [editingClaimParty, open]);

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

	const handleSubmit = async () => {
		if (!formData.party_id || !formData.role) return;

		await onSubmit({
			role: formData.role,
			party_id: formData.party_id,
			representative_id: formData.representative_id || null,
			liability_percentage: formData.liability_percentage ? parseFloat(formData.liability_percentage) : null,
			notes: formData.notes || null,
		});
	};

	const isValidLiabilityPercentage =
		!formData.liability_percentage ||
		(!isNaN(parseFloat(formData.liability_percentage)) &&
			parseFloat(formData.liability_percentage) >= 0 &&
			parseFloat(formData.liability_percentage) <= 100);

	if (!open) return null;

	return (
		<BasicDialog
			title={editingClaimParty ? 'Edit Party' : 'Add Party'}
			primaryAction={{
				label: editingClaimParty ? 'Update' : 'Add',
				onClick: handleSubmit,
				disabled: !formData.party_id || !formData.role || !isValidLiabilityPercentage || isSubmitting,
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
				{/* Role Selection */}
				<ClaimPartyRoleSelect
					role={formData.role}
					setRole={(role) => setFormData({ ...formData, role })}
					clearable={false}
					isFilter={false}
					label="Party Role *"
				/>

				{/* Party Selection */}
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
						<TextField {...params} label="Party *" placeholder="Search parties..." required />
					)}
				/>

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
							placeholder={selectedParty ? 'Search representatives...' : 'Select party first'}
						/>
					)}
				/>

				{/* Liability Percentage - only show for Facilitator parties */}
				{partyTypeFilter !== PartyType.ENTITY && (
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

				{/* Notes */}
				<TextField
					label="Notes"
					value={formData.notes}
					onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
					fullWidth
					multiline
					rows={3}
					placeholder={
						partyTypeFilter === PartyType.ENTITY
							? "Notes about this party's coverage(s)..."
							: "Additional notes about this party's liability..."
					}
				/>
			</Box>
		</BasicDialog>
	);
}
