'use client';

import React, { forwardRef, useEffect, useImperativeHandle } from 'react';
import { useForm, Controller } from 'react-hook-form';
import Dropdown from '@/components/ui/Dropdown';

type MappingField = {
	key: string;
	label: string;
	required?: boolean;
};

type Props = {
	headers: string[];
	fields: MappingField[];
	onMapped: (mapping: Record<string, string | null>) => void;
	setContinueEnabled?: (enabled: boolean) => void;
};

export type Step2RefHandle = {
	onNext: () => void;
};

export const CSVStep2ColumnMapping = forwardRef<Step2RefHandle, Props>(
	({ headers, fields, onMapped, setContinueEnabled }: Props, ref) => {
		const {
			control,
			handleSubmit,
			formState: { errors },
			watch,
		} = useForm<Record<string, string | ''>>({
			defaultValues: Object.fromEntries(
				fields.map((field) => {
					const match = headers.find(
						(h) => h.toLowerCase() === field.key || h.toLowerCase() === field.label.toLowerCase()
					);
					return [field.key, match || 'Unassigned'];
				})
			),
		});
		const watchedValues = watch();
		const allRequiredFieldsAssigned = fields.every(
			(field) =>
				!field.required || (!!watchedValues[field.key] && watchedValues[field.key] !== 'Unassigned')
		);

		useEffect(() => {
			setContinueEnabled?.(allRequiredFieldsAssigned);
		}, [allRequiredFieldsAssigned]);

		useImperativeHandle(ref, () => ({
			onNext: () =>
				handleSubmit((data) => {
					const mapping = Object.fromEntries(
						Object.entries(data).map(([key, value]) => [key, value === 'Unassigned' ? null : value])
					);
					onMapped(mapping);
				})(),
		}));

		return (
			<>
				{fields.map((field) => (
					<Controller
						key={field.key}
						name={field.key}
						control={control}
						rules={{
							required: field.required ? 'This field is required' : false,
						}}
						render={({ field: controllerField }) => (
							<div style={{ marginBottom: 15 }}>
								<Dropdown
									label={field.label}
									options={[
										{ value: 'Unassigned', label: 'Unassigned' },
										...headers.map((header) => ({
											value: header,
											label: header,
										})),
									]}
									value={controllerField.value || 'Unassigned'}
									onChange={(v) => controllerField.onChange(String(v))}
									error={!!errors[field.key]}
									name={controllerField.name}
								/>
							</div>
						)}
					/>
				))}
			</>
		);
	}
);
