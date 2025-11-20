'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Box, TextField, Autocomplete, Typography, InputAdornment } from '@mui/material';
import BasicDialog from '@/components/common/BasicDialog';
import ClaimPartyRoleSelect from '@/components/common/ClaimPartyRoleSelect';
import { usePartyTrpc } from '@/hooks/trpc/usePartyTrpc';
import { ClaimPartyRole } from '@/config/enums';

interface PartyLiabilityFormData {
	role: ClaimPartyRole;
	party_id: number | null;
	representative_id: number | null;
	liability_percentage: string;
	coverage_amount: string;
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
		coverage_amount?: string | null;
		notes?: string | null;
	}) => Promise<void>;
	editingClaimParty?: any | null;
	currentClaimParties?: any[];
	isSubmitting?: boolean;
}

export default function PartyLiabilityFormDialog({
	open,
	onClose,
	onSubmit,
	editingClaimParty,
	currentClaimParties = [],
	isSubmitting = false,
}: PartyLiabilityFormDialogProps) {
	const [formData, setFormData] = useState<PartyLiabilityFormData>({
		role: ClaimPartyRole.ADVERSE_CARRIER,
		party_id: null,
		representative_id: null,
		liability_percentage: '',
		coverage_amount: '',
		notes: '',
	});

	const [partySearchTerm, setPartySearchTerm] = useState('');
	const [selectedParty, setSelectedParty] = useState<any | null>(null);
	const [selectedRepresentative, setSelectedRepresentative] = useState<any | null>(null);

	const partyTrpc = usePartyTrpc();

	// Fetch parties based on search term
	const { data: partySearchResults = [] } = partyTrpc.search(
		{ searchTerm: partySearchTerm },
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
				role: editingClaimParty.role as ClaimPartyRole,
				party_id: editingClaimParty.party_id,
				representative_id: editingClaimParty.representative_id,
				liability_percentage: editingClaimParty.liability_percentage?.toString() || '',
				coverage_amount: editingClaimParty.coverage_amount?.toString() || '',
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
				role: ClaimPartyRole.ADVERSE_CARRIER,
				party_id: null,
				representative_id: null,
				liability_percentage: '',
				coverage_amount: '',
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
		if (!formData.party_id) return;

		await onSubmit({
			role: formData.role,
			party_id: formData.party_id,
			representative_id: formData.representative_id || null,
			liability_percentage: formData.liability_percentage ? parseFloat(formData.liability_percentage) : null,
			coverage_amount: formData.coverage_amount || null,
			notes: formData.notes || null,
		});
	};

	// Calculate total liability excluding the one being edited
	const otherPartiesLiability = useMemo(() => {
		return currentClaimParties
			.filter((cp) => !editingClaimParty || cp.id !== editingClaimParty.id)
			.reduce((sum, cp) => sum + (cp.liability_percentage ? parseFloat(cp.liability_percentage.toString()) : 0), 0);
	}, [currentClaimParties, editingClaimParty]);

	const maxAllowedLiability = 100 - otherPartiesLiability;
	const enteredLiability = formData.liability_percentage ? parseFloat(formData.liability_percentage) : 0;

	const isValidLiability =
		!formData.liability_percentage ||
		(!isNaN(parseFloat(formData.liability_percentage)) &&
			parseFloat(formData.liability_percentage) >= 0 &&
			parseFloat(formData.liability_percentage) <= 100);

	const exceedsTotalLiability = enteredLiability > maxAllowedLiability;

	const isValidCoverage =
		!formData.coverage_amount ||
		(!isNaN(parseFloat(formData.coverage_amount)) && parseFloat(formData.coverage_amount) > 0);

	if (!open) return null;

	return (
		<BasicDialog
			title={editingClaimParty ? 'Edit Party Liability' : 'Add Party Liability'}
			primaryAction={{
				label: editingClaimParty ? 'Update' : 'Add',
				onClick: handleSubmit,
				disabled:
					!formData.party_id ||
					!isValidLiability ||
					exceedsTotalLiability ||
					!isValidCoverage ||
					isSubmitting,
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
				<Box>
					<Typography fontSize={12} color="text.secondary" marginBottom={0.5}>
						Party Role *
					</Typography>
					<ClaimPartyRoleSelect
						role={formData.role}
						setRole={(role) => setFormData({ ...formData, role: role as ClaimPartyRole })}
						clearable={false}
						text="Select role"
					/>
				</Box>

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

				{/* Liability Percentage */}
				<TextField
					label="Liability Percentage"
					type="number"
					value={formData.liability_percentage}
					onChange={(e) => setFormData({ ...formData, liability_percentage: e.target.value })}
					fullWidth
					placeholder="0-100"
					inputProps={{ step: '0.01', min: '0', max: maxAllowedLiability }}
					slotProps={{
						input: {
							endAdornment: <InputAdornment position="end">%</InputAdornment>,
						},
					}}
					error={!isValidLiability || exceedsTotalLiability}
					helperText={
						!isValidLiability
							? 'Must be between 0 and 100'
							: exceedsTotalLiability
								? `Total liability would exceed 100%. Maximum allowed: ${maxAllowedLiability.toFixed(2)}%`
								: maxAllowedLiability < 100
									? `Maximum allowed: ${maxAllowedLiability.toFixed(2)}% (${otherPartiesLiability.toFixed(2)}% already allocated)`
									: ''
					}
				/>

				{/* Coverage Amount */}
				<TextField
					label="Coverage Amount"
					type="number"
					value={formData.coverage_amount}
					onChange={(e) => setFormData({ ...formData, coverage_amount: e.target.value })}
					fullWidth
					placeholder="Enter amount"
					inputProps={{ step: '0.01', min: '0' }}
					slotProps={{
						input: {
							startAdornment: <InputAdornment position="start">$</InputAdornment>,
						},
					}}
					error={!isValidCoverage}
					helperText={!isValidCoverage ? 'Must be greater than 0' : ''}
				/>

				{/* Notes */}
				<TextField
					label="Notes"
					value={formData.notes}
					onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
					fullWidth
					multiline
					rows={3}
					placeholder="Additional notes about this party's liability..."
				/>
			</Box>
		</BasicDialog>
	);
}
