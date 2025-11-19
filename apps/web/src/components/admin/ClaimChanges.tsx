'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import {
	Box,
	Button,
	InputAdornment,
	Paper,
	TextField,
	Typography,
	Divider,
	Select,
	MenuItem,
	FormControl,
	InputLabel,
	Autocomplete,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import Save from '@mui/icons-material/Save';
import Cancel from '@mui/icons-material/Cancel';
import dayjs, { Dayjs } from 'dayjs';
import { useClaimTrpc } from '@/hooks/trpc/useClaimTrpc';
import { usePartyTrpc } from '@/hooks/trpc/usePartyTrpc';
import { LineOfBusiness, LossType, RecoveryStatus, ClaimSubstatus } from '@/config/enums';
import { formatLabel, LOB_ICONS, LOSS_TYPE_ICONS, SUBSTATUS_ICONS } from '@/lib/utils/claimUtils';
import { formatRecoveryStatus, RECOVERY_STATUS_ICONS } from '@/lib/utils/recoveryUtils';
import PartyDialog from './PartyDialog';
import RepresentativeDialog from './RepresentativeDialog';
import type { Party, PartyRepresentative } from '@/api/database/types';

interface ClaimChangesProps {
	claimId?: number;
}

interface ClaimFormData {
	claim_number: string;
	client: string;
	client_adjuster: string;
	insured: string;
	claim_amount: string;
	total_incurred: string;
	expected_recovery: string;
	date_of_loss: Dayjs | null;
	loss_location: string;
	line_of_business: LineOfBusiness;
	loss_type: LossType;
	recovery_status: RecoveryStatus;
	substatus: ClaimSubstatus;
}

export default function ClaimChanges({ claimId }: ClaimChangesProps) {
	const router = useRouter();
	const isEditMode = !!claimId;

	// Party and representative state
	const [selectedParty, setSelectedParty] = useState<Party | null>(null);
	const [selectedRepresentative, setSelectedRepresentative] = useState<PartyRepresentative | null>(null);
	const [partySearchTerm, setPartySearchTerm] = useState('');
	const [showPartyDialog, setShowPartyDialog] = useState(false);
	const [showRepresentativeDialog, setShowRepresentativeDialog] = useState(false);

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting, isValid },
		setValue,
		watch,
		control,
		reset,
	} = useForm<ClaimFormData>({
		mode: 'onChange',
		defaultValues: {
			claim_number: '',
			client: '',
			client_adjuster: '',
			insured: '',
			claim_amount: '',
			total_incurred: '',
			expected_recovery: '',
			date_of_loss: null,
			loss_location: '',
			line_of_business: LineOfBusiness.AUTO,
			loss_type: LossType.COLLISION,
			recovery_status: RecoveryStatus.PENDING,
			substatus: ClaimSubstatus.INVESTIGATION,
		},
	});

	const { data: existingClaim, isLoading } = useClaimTrpc().get({ claimId: claimId! }, { enabled: isEditMode });

	const { mutateAsync: createClaims, isPending: isCreating } = useClaimTrpc().createMany;
	const { mutateAsync: updateClaim, isPending: isUpdating } = useClaimTrpc().update;

	// Party tRPC hooks
	const partyTrpc = usePartyTrpc();
	const { data: partySearchResults = [] } = partyTrpc.search(
		{ searchTerm: partySearchTerm },
		{ enabled: partySearchTerm.length >= 2 }
	);
	const { data: existingClaimParties = [] } = partyTrpc.listClaimParties(
		{ claimId: claimId! },
		{ enabled: isEditMode }
	);
	const { data: representatives = [] } = partyTrpc.listRepresentatives(
		{ partyId: selectedParty?.id! as any },
		{ enabled: !!selectedParty }
	);

	// Populate form when editing existing claim
	useEffect(() => {
		if (existingClaim && isEditMode) {
			reset({
				claim_number: existingClaim.claim_number || '',
				client: existingClaim.client || '',
				client_adjuster: existingClaim.client_adjuster || '',
				insured: existingClaim.insured || '',
				claim_amount: existingClaim.claim_amount?.toString() || '',
				total_incurred: existingClaim.total_incurred?.toString() || '',
				expected_recovery: existingClaim.expected_recovery?.toString() || '',
				date_of_loss: existingClaim.date_of_loss ? dayjs(existingClaim.date_of_loss) : null,
				loss_location: existingClaim.loss_location || '',
				line_of_business: (existingClaim.line_of_business as LineOfBusiness) || LineOfBusiness.AUTO,
				loss_type: (existingClaim.loss_type as LossType) || LossType.COLLISION,
				recovery_status: (existingClaim.recovery_status as RecoveryStatus) || RecoveryStatus.PENDING,
				substatus: (existingClaim.substatus as ClaimSubstatus) || ClaimSubstatus.INVESTIGATION,
			});
		}
	}, [existingClaim, isEditMode, reset]);

	// Load existing party linkage in edit mode
	useEffect(() => {
		if (existingClaimParties.length > 0 && isEditMode) {
			const linkedParty = existingClaimParties[0]; // Get first linked party
			if (linkedParty.party) {
				setSelectedParty(linkedParty.party as any);
			}
			// Also set the representative if one was saved
			if (linkedParty.representative) {
				setSelectedRepresentative(linkedParty.representative as any);
			}
		}
	}, [existingClaimParties, isEditMode]);

	// Pre-select saved representative when representatives load for selected party
	useEffect(() => {
		if (selectedRepresentative && representatives.length > 0 && isEditMode) {
			// Check if the saved representative still exists in the party's rep list
			const repStillExists = representatives.find((r) => Number(r.id) === Number(selectedRepresentative.id));
			if (!repStillExists) {
				// Representative no longer exists or was reassigned - clear selection
				setSelectedRepresentative(null);
			}
		}
	}, [representatives, selectedRepresentative, isEditMode]);

	// Handle party selection
	const handlePartySelect = useCallback(
		async (party: any) => {
			setSelectedParty(party);
			setSelectedRepresentative(null);

			if (party) {
				// Update client text field with party name
				setValue('client', party.name);
			} else {
				// Party was cleared - clear the client field
				setValue('client', '');
				// Also clear client_adjuster since rep is being cleared
				setValue('client_adjuster', '');
			}
		},
		[setValue]
	);

	// Handle representative selection
	const handleRepresentativeSelect = useCallback(
		(rep: any) => {
			setSelectedRepresentative(rep);
			if (rep) {
				// Update client_adjuster text field with representative's full name
				setValue('client_adjuster', `${rep.first_name} ${rep.last_name}`);
			}
		},
		[setValue]
	);

	// Handle party dialog close
	const handlePartyDialogClose = useCallback(
		(createdParty?: any) => {
			setShowPartyDialog(false);
			// If a party was created, select it automatically
			if (createdParty) {
				handlePartySelect(createdParty);
			}
		},
		[handlePartySelect]
	);

	// Handle representative dialog close
	const handleRepresentativeDialogClose = useCallback(
		(createdRep?: any) => {
			setShowRepresentativeDialog(false);
			// If a representative was created, select it automatically
			if (createdRep) {
				handleRepresentativeSelect(createdRep);
			}
		},
		[handleRepresentativeSelect]
	);

	const onSubmit = handleSubmit(async (data) => {
		try {
			if (isEditMode) {
				// Update the claim
				await updateClaim({
					claimId: claimId!,
					claim_number: data.claim_number || null,
					client: data.client || null,
					client_adjuster: data.client_adjuster || null,
					insured: data.insured || null,
					claim_amount: data.claim_amount ? parseFloat(data.claim_amount) : null,
					total_incurred: data.total_incurred ? parseFloat(data.total_incurred) : null,
					expected_recovery: data.expected_recovery ? parseFloat(data.expected_recovery) : null,
					date_of_loss: data.date_of_loss ? data.date_of_loss.format('YYYY-MM-DD') : null,
					loss_location: data.loss_location || null,
					line_of_business: data.line_of_business,
					loss_type: data.loss_type,
					recovery_status: data.recovery_status,
					substatus: data.substatus,
					party_id: selectedParty?.id ? Number(selectedParty.id) : null,
					representative_id: selectedRepresentative?.id ? Number(selectedRepresentative.id) : null,
				});

				router.push('/admin/claims');
			} else {
				// Create the claim
				await createClaims({
					claims: [
						{
							claim_number: data.claim_number || null,
							client: data.client || null,
							client_adjuster: data.client_adjuster || null,
							insured: data.insured || null,
							claim_amount: data.claim_amount ? parseFloat(data.claim_amount) : null,
							total_incurred: data.total_incurred ? parseFloat(data.total_incurred) : null,
							expected_recovery: data.expected_recovery ? parseFloat(data.expected_recovery) : null,
							date_of_loss: data.date_of_loss ? data.date_of_loss.format('YYYY-MM-DD') : null,
							loss_location: data.loss_location || null,
							line_of_business: data.line_of_business,
							loss_type: data.loss_type,
							last_updated_by: null,
							last_update: null,
						},
					],
					party_id: selectedParty?.id ? Number(selectedParty.id) : null,
					representative_id: selectedRepresentative?.id ? Number(selectedRepresentative.id) : null,
				});

				router.push('/admin/claims');
			}
		} catch (e) {
			console.error(e);
		}
	});

	const handleCancel = useCallback(() => {
		router.back();
	}, [router]);

	const lineOfBusiness = watch('line_of_business');
	const lossType = watch('loss_type');
	const recoveryStatus = watch('recovery_status');
	const substatus = watch('substatus');

	// Memoize party autocomplete options
	const partyAutocompleteOptions = useMemo(
		() => [
			{ id: -1, name: 'Create New Party' } as any,
			...(partySearchTerm.length >= 2 ? partySearchResults : [{ id: -2, name: 'Start typing to search...' } as any]),
		],
		[partySearchTerm, partySearchResults]
	);

	// Memoize party autocomplete onChange handler
	const handlePartyAutocompleteChange = useCallback(
		(_: any, newValue: any) => {
			if (newValue && newValue.id === -1) {
				setShowPartyDialog(true);
			} else if (newValue && newValue.id !== -2) {
				handlePartySelect(newValue);
			} else if (newValue === null) {
				// User cleared the selection
				handlePartySelect(null);
			}
		},
		[handlePartySelect]
	);

	// Memoize representative autocomplete options
	const representativeAutocompleteOptions = useMemo(
		() => [
			{ id: -1 } as any,
			...(selectedParty && representatives.length > 0
				? representatives
				: [{ id: -2, first_name: '', last_name: 'Link party first' } as any]),
		],
		[selectedParty, representatives]
	);

	// Memoize representative autocomplete onChange handler
	const handleRepresentativeAutocompleteChange = useCallback(
		(_: any, newValue: any) => {
			if (newValue && newValue.id === -1) {
				setShowRepresentativeDialog(true);
			} else {
				handleRepresentativeSelect(newValue);
			}
		},
		[handleRepresentativeSelect]
	);

	if (isEditMode && isLoading) {
		return (
			<Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
				<Typography>Loading claim data...</Typography>
			</Box>
		);
	}

	return (
		<Box sx={styles.container}>
			<Paper sx={styles.paper}>
				<Box sx={styles.header}>
					<Typography variant="h5">{isEditMode ? 'Edit Claim' : 'New Claim'}</Typography>
					<Box display="flex" gap={2}>
						<Button variant="outlined" startIcon={<Cancel />} onClick={handleCancel}>
							Cancel
						</Button>
						<Button
							variant="contained"
							startIcon={<Save />}
							onClick={onSubmit}
							disabled={!isValid || isSubmitting || isCreating || isUpdating}
						>
							{isEditMode ? 'Save Changes' : 'Create Claim'}
						</Button>
					</Box>
				</Box>

				<Divider sx={{ mb: 2 }} />

				<form onSubmit={onSubmit}>
					<Box>
						{/* Basic Information Section */}
						<Typography variant="h6" sx={{ mb: 1.5 }}>
							Basic Information
						</Typography>

						<Box display="flex" flexWrap="wrap" gap={1.5} mb={2.5}>
							<TextField
								id="claim_number"
								label="Claim Number"
								placeholder="OPV63SASBX"
								error={!!errors.claim_number}
								size="small"
								sx={{ minWidth: 200, flex: 1, maxWidth: 300 }}
								{...register('claim_number', { required: true })}
							/>

							<TextField
								id="insured"
								label="Insured"
								placeholder="Rachel Anderson"
								error={!!errors.insured}
								size="small"
								sx={{ minWidth: 200, flex: 1, maxWidth: 300 }}
								{...register('insured', { required: true })}
							/>

							<TextField
								id="loss_location"
								label="Loss Location"
								placeholder="New York City, NY"
								error={!!errors.loss_location}
								size="small"
								sx={{ minWidth: 200, flex: 1, maxWidth: 300 }}
								{...register('loss_location', { required: true })}
							/>

							<Controller
								name="date_of_loss"
								control={control}
								rules={{ required: true }}
								render={({ field }) => (
									<DatePicker
										label="Date of Loss"
										value={field.value}
										onChange={(newValue) => field.onChange(newValue)}
										slotProps={{
											textField: {
												error: !!errors.date_of_loss,
												size: 'small',
												sx: { minWidth: 200, flex: 1, maxWidth: 300 },
											},
										}}
									/>
								)}
							/>
						</Box>
						<Box display="flex" flexWrap="wrap" gap={1.5} mb={2.5}>
							<TextField
								id="client"
								label="Client"
								placeholder="Liberty Mutual"
								error={!!errors.client}
								size="small"
								sx={{ minWidth: 200, flex: 1, maxWidth: 300 }}
								{...register('client', { required: true })}
							/>

							<Autocomplete
								options={partyAutocompleteOptions}
								value={selectedParty}
								onChange={handlePartyAutocompleteChange}
								inputValue={partySearchTerm}
								onInputChange={(_, newValue) => setPartySearchTerm(newValue)}
								getOptionLabel={(option: any) => option.name || ''}
								isOptionEqualToValue={(option: any, value: any) => option.id === value.id}
								getOptionDisabled={(option: any) => option.id === -2}
								renderOption={(props, option: any) => (
									<li {...props} key={option.id}>
										{option.id === -1 ? (
											<strong>{option.name}</strong>
										) : option.id === -2 ? (
											<em style={{ color: '#999' }}>{option.name}</em>
										) : (
											option.name
										)}
									</li>
								)}
								size="small"
								sx={{ minWidth: 200, flex: 1, maxWidth: 300 }}
								renderInput={(params) => (
									<TextField
										{...params}
										label="Link to Party (Optional)"
										placeholder="Search parties..."
									/>
								)}
							/>

							<TextField
								id="client_adjuster"
								label="Client Adjuster"
								placeholder="Matthew Howell"
								error={!!errors.client_adjuster}
								size="small"
								sx={{ minWidth: 200, flex: 1, maxWidth: 300 }}
								{...register('client_adjuster', { required: true })}
							/>

							<Autocomplete
								options={representativeAutocompleteOptions}
								value={selectedRepresentative}
								onChange={handleRepresentativeAutocompleteChange}
								getOptionLabel={(option: any) => {
									if (option.id === -1) return 'Create New Representative';
									return `${option.first_name} ${option.last_name}`;
								}}
								renderOption={(props, option: any) => (
									<li {...props} key={option.id}>
										{option.id === -1 ? (
											<strong>Create New Representative</strong>
										) : (
											`${option.first_name} ${option.last_name}`
										)}
									</li>
								)}
								disabled={!selectedParty}
								size="small"
								sx={{ minWidth: 200, flex: 1, maxWidth: 300 }}
								renderInput={(params) => (
									<TextField
										{...params}
										label="Link to Representative (Optional)"
										placeholder={selectedParty ? 'Search representatives...' : 'Link party first'}
									/>
								)}
							/>
						</Box>

						{/* Classification Section */}
						<Divider sx={{ my: 2.5 }} />
						<Typography variant="h6" sx={{ mb: 1.5 }}>
							Classification
						</Typography>

						<Box display="flex" flexWrap="wrap" gap={1.5} mb={2.5}>
							<FormControl size="small" sx={{ minWidth: 200, flex: 1, maxWidth: 300 }}>
								<InputLabel>Line of Business</InputLabel>
								<Select
									value={lineOfBusiness}
									label="Line of Business"
									onChange={(e) => setValue('line_of_business', e.target.value as LineOfBusiness)}
								>
									{Object.values(LineOfBusiness).map((lob) => (
										<MenuItem key={lob} value={lob}>
											<Box display="flex" alignItems="center" gap={1}>
												<Typography fontSize={14}>{LOB_ICONS[lob]}</Typography>
												<Typography fontSize={14}>{formatLabel(lob)}</Typography>
											</Box>
										</MenuItem>
									))}
								</Select>
							</FormControl>

							<FormControl size="small" sx={{ minWidth: 200, flex: 1, maxWidth: 300 }}>
								<InputLabel>Loss Type</InputLabel>
								<Select
									value={lossType}
									label="Loss Type"
									onChange={(e) => setValue('loss_type', e.target.value as LossType)}
								>
									{Object.values(LossType).map((type) => (
										<MenuItem key={type} value={type}>
											<Box display="flex" alignItems="center" gap={1}>
												<Typography fontSize={14}>{LOSS_TYPE_ICONS[type]}</Typography>
												<Typography fontSize={14}>{formatLabel(type)}</Typography>
											</Box>
										</MenuItem>
									))}
								</Select>
							</FormControl>

							<FormControl size="small" sx={{ minWidth: 200, flex: 1, maxWidth: 300 }}>
								<InputLabel>Recovery Status</InputLabel>
								<Select
									value={recoveryStatus}
									label="Recovery Status"
									onChange={(e) => setValue('recovery_status', e.target.value as RecoveryStatus)}
								>
									{Object.values(RecoveryStatus).map((status) => (
										<MenuItem key={status} value={status}>
											<Box display="flex" alignItems="center" gap={1}>
												<Typography fontSize={14}>{RECOVERY_STATUS_ICONS[status]}</Typography>
												<Typography fontSize={14}>{formatRecoveryStatus(status)}</Typography>
											</Box>
										</MenuItem>
									))}
								</Select>
							</FormControl>

							<FormControl size="small" sx={{ minWidth: 200, flex: 1, maxWidth: 300 }}>
								<InputLabel>Substatus</InputLabel>
								<Select
									value={substatus}
									label="Substatus"
									onChange={(e) => setValue('substatus', e.target.value as ClaimSubstatus)}
								>
									{Object.values(ClaimSubstatus).map((sub) => (
										<MenuItem key={sub} value={sub}>
											<Box display="flex" alignItems="center" gap={1}>
												<Typography fontSize={14}>{SUBSTATUS_ICONS[sub]}</Typography>
												<Typography fontSize={14}>{formatLabel(sub)}</Typography>
											</Box>
										</MenuItem>
									))}
								</Select>
							</FormControl>
						</Box>

						{/* Financial Information Section */}
						<Divider sx={{ my: 2.5 }} />
						<Typography variant="h6" sx={{ mb: 1.5 }}>
							Financial Information
						</Typography>

						<Box display="flex" flexWrap="wrap" gap={1.5} mb={2.5}>
							<TextField
								id="claim_amount"
								label="Claim Amount"
								placeholder="75496.66"
								error={!!errors.claim_amount}
								type="number"
								size="small"
								sx={{ minWidth: 200, flex: 1, maxWidth: 300 }}
								slotProps={{
									input: {
										startAdornment: <InputAdornment position="start">$</InputAdornment>,
									},
								}}
								{...register('claim_amount', { required: true })}
							/>

							<TextField
								id="total_incurred"
								label="Total Incurred"
								placeholder="94017.73"
								error={!!errors.total_incurred}
								type="number"
								size="small"
								sx={{ minWidth: 200, flex: 1, maxWidth: 300 }}
								slotProps={{
									input: {
										startAdornment: <InputAdornment position="start">$</InputAdornment>,
									},
								}}
								{...register('total_incurred', { required: true })}
							/>

							<TextField
								id="expected_recovery"
								label="Expected Recovery"
								placeholder="21521.43"
								error={!!errors.expected_recovery}
								type="number"
								size="small"
								sx={{ minWidth: 200, flex: 1, maxWidth: 300 }}
								slotProps={{
									input: {
										startAdornment: <InputAdornment position="start">$</InputAdornment>,
									},
								}}
								{...register('expected_recovery', { required: true })}
							/>
						</Box>
					</Box>
				</form>
			</Paper>

			{/* Party Dialog */}
			{showPartyDialog && (
				<PartyDialog lockedType="facilitator" lockedRole="adverse_carrier" onClose={handlePartyDialogClose} />
			)}

			{/* Representative Dialog */}
			{showRepresentativeDialog && (
				<RepresentativeDialog
					partyId={selectedParty?.id as any}
					lockParty={true}
					onClose={handleRepresentativeDialogClose}
				/>
			)}
		</Box>
	);
}

const styles = {
	container: {
		padding: '20px',
		width: '100%',
		height: '100%',
		margin: '0 auto',
	},
	paper: {
		padding: '20px',
		border: 1,
		borderColor: 'divider',
		height: '100%',
		overflow: 'auto',
	},
	header: {
		display: 'flex',
		justifyContent: 'space-between',
		alignItems: 'center',
		mb: 2,
	},
};
