'use client';

import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import { Autocomplete, MenuItem, Stack, TextField, Typography } from '@mui/material';
import BasicDialog from '../common/BasicDialog';
import { usePartyTrpc } from '@/hooks/trpc/usePartyTrpc';
import { useAlertStore } from '@/stores/useAlertStore';
import { useState } from 'react';
import { PartyEmail } from '@/api/database/types';
import useDebounce from '@/lib/utils/useDebounce';
import { EmailType } from '@/schemas/partySchemas';

/** Type for party search results from tRPC */
interface PartySearchResult {
	id: number;
	name: string;
	organization: string | null;
}

interface EmailFormData {
	party_id: number | null;
	email_address: string;
	email_type: string;
}

interface EmailDialogProps {
	email?: PartyEmail & { party_name?: string };
	partyId?: number;
	onClose?: () => void;
}

export default function EmailDialog({ email, partyId, onClose }: EmailDialogProps) {
	const showAlert = useAlertStore((state) => state.showAlert);
	const partyTrpc = usePartyTrpc();
	const { mutateAsync: createEmail, isPending: creating } = partyTrpc.createEmail;
	const { mutateAsync: updateEmail, isPending: updating } = partyTrpc.updateEmail;

	const isEditMode = !!email;
	const [partySearchTerm, setPartySearchTerm] = useState('');
	const [selectedParty, setSelectedParty] = useState<PartySearchResult | null>(null);

	// Party search with debounce (only for creating without partyId)
	const { data: partyMatches = [] } = partyTrpc.search(
		{ searchTerm: partySearchTerm },
		{
			enabled: partySearchTerm.length > 0 && !isEditMode && !partyId,
		}
	);

	const {
		control,
		handleSubmit,
		watch,
		formState: { errors, isSubmitting, isDirty },
	} = useForm<EmailFormData>({
		defaultValues: {
			party_id: email?.party_id || partyId || null,
			email_address: email?.email_address || '',
			email_type: String(email?.email_type ?? EmailType.BUSINESS),
		},
		mode: 'onChange',
	});

	const emailAddress = watch('email_address');

	const handleClose = () => {
		if (onClose) {
			onClose();
		}
	};

	const onSubmit: SubmitHandler<EmailFormData> = async (data) => {
		try {
			const effectivePartyId = data.party_id || partyId;
			if (!effectivePartyId && !isEditMode) {
				showAlert('Please select a party', 'error');
				return;
			}

			if (isEditMode && email) {
				await updateEmail({
					id: +email.id,
					params: {
						email_address: data.email_address,
						email_type: data.email_type as 'personal' | 'business',
					},
				});
				showAlert('Email updated successfully', 'success');
			} else {
				await createEmail({
					party_id: effectivePartyId!,
					email_address: data.email_address,
					email_type: data.email_type as 'personal' | 'business',
				});
				showAlert('Email created successfully', 'success');
			}
			handleClose();
		} catch (error: any) {
			showAlert(error?.message || 'Failed to save email', 'error');
		}
	};

	const debouncedPartySearch = useDebounce((search: string) => {
		setPartySearchTerm(search);
	}, 500);

	return (
		<BasicDialog
			title={isEditMode ? `Edit Email${email?.party_name ? ` - ${email.party_name}` : ''}` : 'New Email'}
			primaryAction={{
				label: isEditMode ? 'Update' : 'Create',
				onClick: handleSubmit(onSubmit),
				disabled: !emailAddress || isSubmitting || creating || updating || (isEditMode && !isDirty),
			}}
			secondaryActions={[
				{
					label: 'Cancel',
					onClick: handleClose,
				},
			]}
			onClose={handleClose}
			width={450}
		>
			<form style={styles.form}>
				{/* Party Selection - Only shown when creating without partyId */}
				{!isEditMode && !partyId && (
					<Controller
						name="party_id"
						control={control}
						rules={{ required: 'Party is required' }}
						render={({ field }) => (
							<Autocomplete<PartySearchResult>
								options={partyMatches as PartySearchResult[]}
								getOptionLabel={(party) => party.name}
								onChange={(_, value) => {
									setSelectedParty(value);
									field.onChange(value?.id || null);
								}}
								onInputChange={(_, value: string) => {
									debouncedPartySearch(value);
								}}
								value={selectedParty}
								renderOption={(props, party) => (
									<li {...props} key={party.id}>
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
										helperText={errors.party_id?.message}
										placeholder="Search for party..."
									/>
								)}
							/>
						)}
					/>
				)}

				{/* Email Address */}
				<Controller
					name="email_address"
					control={control}
					rules={{
						required: 'Email address is required',
						pattern: {
							value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
							message: 'Invalid email address',
						},
					}}
					render={({ field }) => (
						<TextField
							{...field}
							label="Email Address"
							placeholder="email@example.com"
							type="email"
							fullWidth
							error={!!errors.email_address}
							helperText={errors.email_address?.message}
						/>
					)}
				/>

				{/* Email Type */}
				<Controller
					name="email_type"
					control={control}
					render={({ field }) => (
						<TextField
							{...field}
							select
							label="Email Type"
							fullWidth
						>
							<MenuItem value={EmailType.PERSONAL}>Personal</MenuItem>
							<MenuItem value={EmailType.BUSINESS}>Business</MenuItem>
						</TextField>
					)}
				/>
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
};
