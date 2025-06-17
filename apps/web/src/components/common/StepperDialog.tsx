'use client';
import { useState } from 'react';
import { MenuItem, Select, TextField, TextFieldProps, Typography } from '@mui/material';
import { Controller, Form, SubmitHandler, useForm } from 'react-hook-form';

import BasicDialog from './BasicDialog';

interface Step {
	key: string;
	label: string;
	options?: string[];
	placeholder?: string;
	required?: boolean;
	type?: TextFieldProps['type'] | 'select';
}

const getDefaultValues = (steps: Step[]) => {
	const defaultValues: Record<string, string> = {};
	steps
		.filter((s) => s.type === 'select')
		.forEach((s) => {
			defaultValues[s.key] = s.options?.[0] ?? '';
		});
	return defaultValues;
};

export default function StepperDialog(props: {
	title?: string;
	steps: Step[];
	submitDisabled?: boolean;
	onSubmit: SubmitHandler<any>;
	onClose: () => void;
}) {
	const { title, steps, submitDisabled, onSubmit, onClose } = props;
	const { control, handleSubmit, register, watch } = useForm({
		defaultValues: {
			...getDefaultValues(steps),
		},
	});
	const [currentStep, setCurrentStep] = useState<number>(0);
	const [faded, setFaded] = useState(false);

	if (steps[currentStep] == null) return <></>;

	const { key, label, options, placeholder, required = true, type } = steps[currentStep];
	const currentValue = watch(key);
	const isLastStep = currentStep === steps.length - 1;
	const forwardDisabled = !currentValue;
	const backDisabled = currentStep === 0;

	const flash = (direction: number) => {
		setFaded(true);
		setTimeout(() => {
			setCurrentStep((prev) => prev + direction);
		}, 100);
		setTimeout(() => {
			setFaded(false);
		}, 200);
	};

	const onSubmitForm = handleSubmit(onSubmit);

	return (
		<BasicDialog
			title={title}
			onClose={onClose}
			primaryAction={{
				label: isLastStep ? 'Add' : 'Next',
				onClick: isLastStep ? onSubmitForm : () => flash(1),
				disabled: isLastStep ? forwardDisabled || submitDisabled : forwardDisabled,
			}}
			secondaryActions={[
				{
					label: 'Back',
					onClick: () => flash(-1),
					hidden: backDisabled,
				},
			]}
			width={400}
			maxHeight={500}
		>
			<Form control={control} style={{ opacity: faded ? 0 : 1, transition: 'opacity 100ms ease' }}>
				<Typography marginBottom="10px">{label}</Typography>
				{type === 'select' ? (
					<Controller
						name={key}
						control={control}
						rules={{ required }}
						render={({ field }) => (
							<Select
								key={key}
								required={required}
								autoFocus
								variant="standard"
								sx={{ width: '100%' }}
								{...field}
							>
								{(options ?? []).map((o) => (
									<MenuItem key={o} value={o}>
										{o}
									</MenuItem>
								))}
							</Select>
						)}
					/>
				) : (
					<TextField
						key={key}
						placeholder={placeholder}
						type={type}
						required={required}
						autoFocus
						onKeyDown={(e) => {
							if (e.key === 'Enter') {
								isLastStep ? onSubmitForm() : flash(1);
							}
						}}
						sx={{ width: '100%' }}
						{...register(key)}
					/>
				)}
			</Form>
		</BasicDialog>
	);
}

