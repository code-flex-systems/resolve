'use client';

import { MenuItem, Stack, TextField, Typography } from '@mui/material';
import { Control, Controller, FieldErrors, useWatch, UseFormSetValue } from 'react-hook-form';
import { useMemo, useEffect, useRef } from 'react';
import {
	COUNTRIES,
	getStatesForCountry,
	type CountryCode,
} from '@/config/addressConstants';

interface AddressFieldsProps {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	control: Control<any>;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	errors: FieldErrors<any>;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	setValue?: UseFormSetValue<any>;
	disabled?: boolean;
	/**
	 * Field name mapping for the form.
	 * Use 'standard' for party addresses, 'loss' for claim loss location.
	 */
	variant?: 'standard' | 'loss';
	/**
	 * Width for text fields. Defaults to 400.
	 */
	width?: number;
	/**
	 * Optional prefix for field names.
	 * e.g., prefix="contact_" results in field names like "contact_street_address"
	 */
	prefix?: string;
}

/**
 * Reusable address form fields component.
 * Renders street address, city, state/province dropdown, postal code, and country dropdown.
 * Supports both standard addresses (party) and loss addresses (claim loss location).
 */
export default function AddressFields({
	control,
	errors,
	setValue,
	disabled = false,
	variant = 'standard',
	width = 400,
	prefix = '',
}: AddressFieldsProps) {
	// Determine field names based on variant and prefix
	const fieldNames = useMemo(() => {
		if (variant === 'loss') {
			return {
				street_address: 'loss_street_address',
				city: 'loss_city',
				state: 'loss_state',
				postal_code: 'loss_postal_code',
				country: 'loss_country',
			};
		}
		return {
			street_address: `${prefix}street_address`,
			city: `${prefix}city`,
			state: `${prefix}state`,
			postal_code: `${prefix}postal_code`,
			country: `${prefix}country`,
		};
	}, [variant, prefix]);

	// Watch country and state to filter state options and clear invalid selections
	const countryValue = useWatch({ control, name: fieldNames.country });
	const stateValue = useWatch({ control, name: fieldNames.state });

	// Get states/provinces filtered by country
	const stateOptions = useMemo(() => {
		return getStatesForCountry(countryValue as CountryCode | null | undefined);
	}, [countryValue]);

	// Track previous country to detect changes
	const prevCountryRef = useRef(countryValue);

	// Clear state if country changes and current state is not valid for new country
	useEffect(() => {
		// Only run when country actually changes (not on initial render) and setValue is provided
		if (setValue && prevCountryRef.current !== countryValue) {
			prevCountryRef.current = countryValue;

			// If there's a state value, check if it's valid for the new country
			if (stateValue) {
				const isValidState = stateOptions.some((s) => s.code === stateValue);
				if (!isValidState) {
					setValue(fieldNames.state, '', { shouldDirty: true });
				}
			}
		}
	}, [countryValue, stateValue, stateOptions, setValue, fieldNames.state]);

	// Get error helper based on field name
	const getError = (fieldName: string) => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		return (errors as any)[fieldName];
	};

	const textFieldSx = {
		width,
		margin: '5px 0px',
		'& .MuiInputBase-root': {
			fontSize: 14,
			padding: '2px 5px',
		},
		'& .MuiOutlinedInput-input': {
			fontSize: 14,
			padding: '5px',
		},
	};

	return (
		<>
			{/* Street Address */}
			<Controller
				name={fieldNames.street_address}
				control={control}
				render={({ field }) => (
					<TextField
						label="Street Address (optional)"
						
						placeholder="123 Main St"
						error={!!getError(fieldNames.street_address)}
						{...field}
						value={field.value ?? ''}
						disabled={disabled}
						sx={textFieldSx}
					/>
				)}
			/>

			{/* City and State on same row */}
			<Stack direction="row" spacing={2} sx={{ width }}>
				<Controller
					name={fieldNames.city}
					control={control}
					render={({ field }) => (
						<TextField
							label="City (optional)"
							
							placeholder="City"
							error={!!getError(fieldNames.city)}
							{...field}
							value={field.value ?? ''}
							disabled={disabled}
							sx={{ ...textFieldSx, width: (width - 16) / 2, flex: 1 }}
						/>
					)}
				/>

				<Controller
					name={fieldNames.state}
					control={control}
					render={({ field }) => (
						<TextField
							label="State/Province (optional)"
							
							select
							error={!!getError(fieldNames.state)}
							{...field}
							value={field.value ?? ''}
							disabled={disabled}
							sx={{ ...textFieldSx, width: (width - 16) / 2, flex: 1 }}
							SelectProps={{
								displayEmpty: true,
								renderValue: (value) => {
									if (!value) return <Typography color="text.secondary" fontSize={14}>Select...</Typography>;
									const state = stateOptions.find((s) => s.code === value);
									return state ? state.code : String(value);
								},
							}}
						>
							<MenuItem value="">
								<Typography color="text.secondary" fontSize={13}>
									None
								</Typography>
							</MenuItem>
							{stateOptions.map((state) => (
								<MenuItem key={state.code} value={state.code}>
									<Typography fontSize={13}>
										{state.name} ({state.code})
									</Typography>
								</MenuItem>
							))}
						</TextField>
					)}
				/>
			</Stack>

			{/* Postal Code and Country on same row */}
			<Stack direction="row" spacing={2} sx={{ width }}>
				<Controller
					name={fieldNames.postal_code}
					control={control}
					render={({ field }) => (
						<TextField
							label="Postal Code (optional)"
							
							placeholder="12345"
							error={!!getError(fieldNames.postal_code)}
							{...field}
							value={field.value ?? ''}
							disabled={disabled}
							sx={{ ...textFieldSx, width: (width - 16) / 2, flex: 1 }}
						/>
					)}
				/>

				<Controller
					name={fieldNames.country}
					control={control}
					render={({ field }) => (
						<TextField
							label="Country (optional)"
							
							select
							error={!!getError(fieldNames.country)}
							{...field}
							value={field.value ?? ''}
							disabled={disabled}
							sx={{ ...textFieldSx, width: (width - 16) / 2, flex: 1 }}
							SelectProps={{
								displayEmpty: true,
								renderValue: (value) => {
									if (!value) return <Typography color="text.secondary" fontSize={14}>Select...</Typography>;
									const country = COUNTRIES.find((c) => c.code === value);
									return country ? country.name : String(value);
								},
							}}
						>
							<MenuItem value="">
								<Typography color="text.secondary" fontSize={13}>
									None
								</Typography>
							</MenuItem>
							{COUNTRIES.map((country) => (
								<MenuItem key={country.code} value={country.code}>
									<Typography fontSize={13}>{country.name}</Typography>
								</MenuItem>
							))}
						</TextField>
					)}
				/>
			</Stack>
		</>
	);
}
