'use client';

import { MenuItem, Stack, TextField, Typography, Box } from '@mui/material';
import Send from '@mui/icons-material/Send';
import Business from '@mui/icons-material/Business';
import SupportAgent from '@mui/icons-material/SupportAgent';
import Person from '@mui/icons-material/Person';
import AccountBalance from '@mui/icons-material/AccountBalance';
import Gavel from '@mui/icons-material/Gavel';
import Science from '@mui/icons-material/Science';
import Shield from '@mui/icons-material/Shield';
import Store from '@mui/icons-material/Store';
import Visibility from '@mui/icons-material/Visibility';
import Home from '@mui/icons-material/Home';
import BasicDialog from '../common/BasicDialog';
import { Controller, useForm } from 'react-hook-form';
import { usePartyTrpc } from '@/hooks/trpc/usePartyTrpc';
import { useAdminStore } from '@/stores/useAdminStore';
import { PartyType, FacilitatorCategory, EntityCategory } from '@/config/enums';
import type { Party } from '@/api/database/types';
import { useEffect, useState, useMemo } from 'react';
import useDebounce from '@/lib/utils/useDebounce';
import { skipToken } from '@tanstack/react-query';

interface PartyFormInputs {
	party_type: PartyType;
	party_category: string;
	name: string;
	organization?: string;
	email?: string;
	phone?: string;
	address?: string;
	notes?: string;
}

interface PartyDialogProps {
	party?: Party;
	onClose?: () => void;
}

export default function PartyDialog({ party, onClose }: PartyDialogProps) {
	const toggleNewPartyDialog = useAdminStore((state) => state.toggleNewPartyDialog);
	const partyTrpc = usePartyTrpc();
	const { mutateAsync: createParty, isPending: creating } = partyTrpc.create;
	const { mutateAsync: updateParty, isPending: updating } = partyTrpc.update;
	const [searchTerm, setSearchTerm] = useState('');
	const [duplicateMatches, setDuplicateMatches] = useState<any[]>([]);

	const isEditMode = !!party;
	const isPending = creating || updating;

	// Search for duplicates (only when searchTerm is at least 2 chars)
	const { data: searchResults } = partyTrpc.search(searchTerm.length >= 2 ? { searchTerm } : skipToken);

	const {
		control,
		handleSubmit,
		watch,
		formState: { errors, isSubmitting, isValid, isDirty, dirtyFields },
	} = useForm<PartyFormInputs>({
		defaultValues: party
			? {
					party_type: party.party_type as PartyType,
					party_category: party.party_category,
					name: party.name,
					organization: party.organization ?? '',
					email: party.email ?? '',
					phone: party.phone ?? '',
					address: party.address ?? '',
					notes: party.notes ?? '',
				}
			: {
					party_type: PartyType.ENTITY,
					party_category: EntityCategory.CLAIMANT,
					name: '',
					organization: '',
					email: '',
					phone: '',
					address: '',
					notes: '',
				},
		mode: 'onChange',
	});

	const partyType = watch('party_type');
	const name = watch('name');

	// Get available categories based on party type
	const availableCategories =
		partyType === PartyType.FACILITATOR ? Object.values(FacilitatorCategory) : Object.values(EntityCategory);

	// Icon mapping for party types
	const getPartyTypeIcon = (type: PartyType) => {
		switch (type) {
			case PartyType.ENTITY:
				return <Business sx={{ fontSize: 18 }} />;
			case PartyType.FACILITATOR:
				return <SupportAgent sx={{ fontSize: 18 }} />;
		}
	};

	// Icon mapping for party categories
	const getCategoryIcon = (category: string) => {
		switch (category) {
			case EntityCategory.CLAIMANT:
				return <Person sx={{ fontSize: 18 }} />;
			case EntityCategory.RESPONSIBLE_PARTY:
				return <AccountBalance sx={{ fontSize: 18 }} />;
			case EntityCategory.WITNESS:
				return <Visibility sx={{ fontSize: 18 }} />;
			case EntityCategory.PROPERTY_OWNER:
				return <Home sx={{ fontSize: 18 }} />;
			case FacilitatorCategory.ATTORNEY:
				return <Gavel sx={{ fontSize: 18 }} />;
			case FacilitatorCategory.EXPERT:
				return <Science sx={{ fontSize: 18 }} />;
			case FacilitatorCategory.ADVERSE_CARRIER:
				return <Shield sx={{ fontSize: 18 }} />;
			case FacilitatorCategory.VENDOR:
				return <Store sx={{ fontSize: 18 }} />;
			default:
				return null;
		}
	};

	// Memoize current party ID to prevent reference changes
	const currentPartyId = useMemo(() => (party ? (party.id as unknown as number) : null), [party]);

	// Create stable debounced function
	const debouncedSetSearchTerm = useDebounce((value: string) => {
		setSearchTerm(value);
	}, 500);

	// Update search term when name changes
	useEffect(() => {
		if (name && name.length >= 2) {
			debouncedSetSearchTerm(name);
		} else {
			setSearchTerm('');
			setDuplicateMatches([]);
		}
	}, [name]); // Only depend on name, not the debounced function

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
	}, [searchResults, searchTerm, isEditMode, currentPartyId]); // Use memoized party ID

	const handleClose = () => {
		if (onClose) {
			onClose();
		} else {
			toggleNewPartyDialog();
		}
	};

	const onSubmit = handleSubmit(async (data) => {
		try {
			if (isEditMode) {
				// Build update object using only dirty fields
				const updates: any = {};

				if (dirtyFields.party_type) updates.party_type = data.party_type;
				if (dirtyFields.party_category) updates.party_category = data.party_category;
				if (dirtyFields.name) updates.name = data.name;
				if (dirtyFields.organization) updates.organization = data.organization || undefined;
				if (dirtyFields.email) updates.email = data.email || undefined;
				if (dirtyFields.phone) updates.phone = data.phone || undefined;
				if (dirtyFields.address) updates.address = data.address || undefined;
				if (dirtyFields.notes) updates.notes = data.notes || undefined;

				await updateParty({
					id: party.id as unknown as number,
					params: updates,
				});
			} else {
				// Create new party
				await createParty({
					party_type: data.party_type,
					party_category: data.party_category,
					name: data.name,
					organization: data.organization || undefined,
					email: data.email || undefined,
					phone: data.phone || undefined,
					address: data.address || undefined,
					notes: data.notes || undefined,
				});
			}
			handleClose();
		} catch (e) {
			console.error(e);
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
					!name ||
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
							variant="standard"
							select
							error={!!errors.party_type}
							{...field}
							disabled={isSubmitting}
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

				<Controller
					name="party_category"
					control={control}
					rules={{ required: true }}
					render={({ field }) => (
						<TextField
							label="Role"
							variant="standard"
							select
							error={!!errors.party_category}
							{...field}
							disabled={isSubmitting}
							sx={styles.textFieldOverrides}
						>
							{availableCategories.map((category) => (
								<MenuItem key={category} value={category}>
									<Box display="flex" alignItems="center" gap={1}>
										{getCategoryIcon(category)}
										<Typography fontSize={13}>
											{category.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
										</Typography>
									</Box>
								</MenuItem>
							))}
						</TextField>
					)}
				/>

				<Controller
					name="name"
					control={control}
					rules={{ required: 'Name is required', minLength: 2, maxLength: 255 }}
					render={({ field }) => (
						<TextField
							label="Name"
							variant="standard"
							placeholder="Party name"
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

				<Controller
					name="organization"
					control={control}
					rules={{ maxLength: 255 }}
					render={({ field }) => (
						<TextField
							label="Organization (optional)"
							variant="standard"
							placeholder="Organization name"
							error={!!errors.organization}
							{...field}
							disabled={isSubmitting}
							sx={styles.textFieldOverrides}
						/>
					)}
				/>

				<Controller
					name="email"
					control={control}
					rules={{
						pattern: {
							value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
							message: 'Invalid email address',
						},
					}}
					render={({ field }) => (
						<TextField
							label="Email (optional)"
							variant="standard"
							placeholder="email@example.com"
							type="email"
							error={!!errors.email}
							helperText={errors.email?.message}
							{...field}
							disabled={isSubmitting}
							sx={styles.textFieldOverrides}
						/>
					)}
				/>

				<Controller
					name="phone"
					control={control}
					rules={{ maxLength: 50 }}
					render={({ field }) => (
						<TextField
							label="Phone (optional)"
							variant="standard"
							placeholder="Phone number"
							error={!!errors.phone}
							{...field}
							disabled={isSubmitting}
							sx={styles.textFieldOverrides}
						/>
					)}
				/>

				<Controller
					name="address"
					control={control}
					rules={{ maxLength: 500 }}
					render={({ field }) => (
						<TextField
							label="Address (optional)"
							variant="standard"
							placeholder="Street address"
							error={!!errors.address}
							multiline
							rows={2}
							{...field}
							disabled={isSubmitting}
							sx={styles.textFieldOverrides}
						/>
					)}
				/>

				<Controller
					name="notes"
					control={control}
					rules={{ maxLength: 2000 }}
					render={({ field }) => (
						<TextField
							label="Notes (optional)"
							variant="standard"
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
