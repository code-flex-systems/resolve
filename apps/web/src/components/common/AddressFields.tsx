'use client';

import Input from '@/components/ui/Input';
import { Control, Controller, FieldErrors, useWatch, UseFormSetValue } from 'react-hook-form';
import { useMemo, useEffect, useRef } from 'react';
import Dropdown from '@/components/ui/Dropdown';
import { COUNTRIES, getStatesForCountry, type CountryCode } from '@/config/addressConstants';

interface AddressFieldsProps {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	control: Control<any>;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	errors: FieldErrors<any>;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	setValue?: UseFormSetValue<any>;
	disabled?: boolean;
	variant?: 'standard' | 'loss';
	width?: number;
	prefix?: string;
}

export default function AddressFields({
	control,
	errors,
	setValue,
	disabled = false,
	variant = 'standard',
	width = 400,
	prefix = '',
}: AddressFieldsProps) {
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

	const countryValue = useWatch({ control, name: fieldNames.country });
	const stateValue = useWatch({ control, name: fieldNames.state });

	const stateOptions = useMemo(() => {
		return getStatesForCountry(countryValue as CountryCode | null | undefined);
	}, [countryValue]);

	const prevCountryRef = useRef(countryValue);

	useEffect(() => {
		if (setValue && prevCountryRef.current !== countryValue) {
			prevCountryRef.current = countryValue;
			if (stateValue) {
				const isValidState = stateOptions.some((s) => s.code === stateValue);
				if (!isValidState) {
					setValue(fieldNames.state, '', { shouldDirty: true });
				}
			}
		}
	}, [countryValue, stateValue, stateOptions, setValue, fieldNames.state]);

	const getError = (fieldName: string) => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		return (errors as any)[fieldName];
	};

	return (
		<>
			{/* Street Address */}
			<Controller
				name={fieldNames.street_address}
				control={control}
				render={({ field }) => (
					<Input
						label="Street Address"
						placeholder="123 Main St"
						error={!!getError(fieldNames.street_address)}
						{...field}
						value={field.value ?? ''}
						disabled={disabled}
						style={{ width, margin: '5px 0px' }}
					/>
				)}
			/>

			{/* City and State on same row */}
			<div style={{ display: 'flex', flexDirection: 'row', gap: 16, width }}>
				<Controller
					name={fieldNames.city}
					control={control}
					render={({ field }) => (
						<Input
							label="City"
							placeholder="City"
							error={!!getError(fieldNames.city)}
							{...field}
							value={field.value ?? ''}
							disabled={disabled}
							style={{ width: (width - 16) / 2, flex: 1, margin: '5px 0px' }}
						/>
					)}
				/>

				<Controller
					name={fieldNames.state}
					control={control}
					render={({ field }) => (
						<div style={{ flex: 1 }}>
							<Dropdown
								label="State/Province"
								options={[
									{ value: '', label: 'None' },
									...stateOptions.map((state) => ({
										value: state.code,
										label: `${state.name} (${state.code})`,
									})),
								]}
								value={field.value ?? ''}
								onChange={(v) => field.onChange(v === '' ? '' : String(v))}
								disabled={disabled}
								error={!!getError(fieldNames.state)}
								placeholder="Select..."
								fullWidth
							/>
						</div>
					)}
				/>
			</div>

			{/* Postal Code and Country on same row */}
			<div style={{ display: 'flex', flexDirection: 'row', gap: 16, width }}>
				<Controller
					name={fieldNames.postal_code}
					control={control}
					render={({ field }) => (
						<Input
							label="Postal Code"
							placeholder="12345"
							error={!!getError(fieldNames.postal_code)}
							{...field}
							value={field.value ?? ''}
							disabled={disabled}
							style={{ width: (width - 16) / 2, flex: 1, margin: '5px 0px' }}
						/>
					)}
				/>

				<Controller
					name={fieldNames.country}
					control={control}
					render={({ field }) => (
						<div style={{ flex: 1 }}>
							<Dropdown
								label="Country"
								options={[
									{ value: '', label: 'None' },
									...COUNTRIES.map((country) => ({
										value: country.code,
										label: country.name,
									})),
								]}
								value={field.value ?? ''}
								onChange={(v) => field.onChange(v === '' ? '' : String(v))}
								disabled={disabled}
								error={!!getError(fieldNames.country)}
								placeholder="Select..."
								fullWidth
							/>
						</div>
					)}
				/>
			</div>
		</>
	);
}
