'use client';

import Input, { Textarea } from '@/components/ui/Input';
import Dropdown from '@/components/ui/Dropdown';
import BasicDialog from '../common/BasicDialog';
import { Controller, useForm } from 'react-hook-form';
import { ActionType } from '@/config/enums';
import { JSX, useEffect } from 'react';
import { capitalize } from '@/lib/utils/utils';
import config from '@/config/config';
import { GetUserOutput } from '@/hooks/trpc/useUserTrpc';
import { trpc } from '@/lib/trpc';
import BasicAutocomplete from '../common/BasicAutocomplete';
import { useActionTrpc } from '@/hooks/trpc/useActionTrpc';
import { useChecklistStore } from '@/stores/useChecklistStore';
import { ActionInput } from '@/schemas/actionSchemas';
import { useCrudAlerts } from '@/hooks/useCrudAlerts';
import { IconCalendar, IconClipboardCheck, IconMail, IconMailbox } from '@tabler/icons-react';

const actionTypeOptions: { icon: JSX.Element; value: ActionType }[] = [
	{
		icon: <IconMail size={20} />,
		value: ActionType.EMAIL,
	},
	{
		icon: <IconCalendar size={20} />,
		value: ActionType.EVENT,
	},
	{
		icon: <IconMailbox size={20} />,
		value: ActionType.LETTER,
	},
	{
		icon: <IconClipboardCheck size={20} />,
		value: ActionType.TASK,
	},
];

function getDefaultAction(action: any | undefined) {
	if (action) {
		const formattedDefinition = { ...action.definition };
		if (formattedDefinition.recipients) delete formattedDefinition.recipients;
		return {
			type: action.type,
			recipients: action.definition?.recipients
				? action.definition.recipients.map((e: string) => ({ email: e, first: '', last: '' }))
				: [],
			definition: formattedDefinition,
		};
	} else {
		return {
			recipients: [],
			type: ActionType.EMAIL,
			definition: {},
		};
	}
}

export default function UserActionsDialog() {
	const trpcUtils = trpc.useUtils();
	const selectedAnswer = useChecklistStore((state) => state.selectedAnswer)!;
	const toggleActionDialog = useChecklistStore((state) => state.toggleActionDialog);
	const { data: existingAction } = useActionTrpc().get({ answerId: selectedAnswer });
	const { mutateAsync: upsertAction, isPending: isCreating } = useActionTrpc().create;
	const { showSuccess, showError } = useCrudAlerts('action');
	const {
		control,
		handleSubmit,
		setValue,
		formState: { errors, isValid },
		reset,
		watch,
	} = useForm<
		{
			recipients: {
				email: string;
				first: string;
				last: string;
				id?: string;
				phone?: string | null;
			}[];
		} & ActionInput
	>({ mode: 'onChange' });
	const recipients = watch('recipients');
	const actionType = watch('type');

	useEffect(() => {
		reset(getDefaultAction(existingAction));
	}, [existingAction]);

	const onSubmit = handleSubmit(async (data) => {
		try {
			await upsertAction({
				answerId: selectedAnswer,
				type: data.type,
				definition: {
					...data.definition,
					recipients: data.recipients.map((r) => r.email),
				} as any,
			});
			showSuccess('update', 'Action saved');
			toggleActionDialog();
		} catch (e) {
			showError('update', e, 'Failed to save action');
		}
	});

	return (
		<BasicDialog
			title="User Actions"
			primaryAction={{
				label: isCreating ? 'Saving...' : 'Save',
				onClick: onSubmit,
				disabled: !isValid,
			}}
			onClose={toggleActionDialog}
			closeDisabled={isCreating}
			width={800}
			height={600}
		>
			<div
				style={{
					width: '100%',
					display: 'flex',
					justifyContent: 'flex-start',
					alignItems: 'center',
				}}
			>
				<Controller
					name="type"
					control={control}
					rules={{ required: true }}
					render={({ field }) => (
						<Dropdown
							options={actionTypeOptions.map((o) => ({
								value: o.value,
								label: capitalize(o.value),
								icon: o.icon,
							}))}
							value={field.value ?? ''}
							onChange={(v) => field.onChange(v)}
							error={!!errors.type}
							name={field.name}
							renderValue={(val) => (
								<div style={{ display: 'flex', alignItems: 'center' }}>
									{actionTypeOptions.find((o) => o.value === val)?.icon ?? <></>}
									<span style={{ paddingLeft: '5px' }}>{capitalize(String(val))}</span>
								</div>
							)}
						/>
					)}
				/>
			</div>
			{!!actionType && (
				<div
					style={{
						width: '100%',
						display: 'flex',
						justifyContent: 'flex-start',
						alignItems: 'flex-start',
						paddingTop: '20px',
						height: 'fit-content',
					}}
				>
					{actionType === ActionType.EMAIL && (
						<>
							<BasicAutocomplete
								currentSelected={recipients}
								label="Recipients"
								entity="users"
								onSearch={trpcUtils.user.getUsers.fetch}
								onSelect={(newSelection) => {
									setValue(
										'recipients',
										newSelection.map((s) =>
											typeof s === 'string' ? { email: s, first: '', last: '' } : s
										)
									);
								}}
								placeholder="Search by user..."
								renderOption={(result) =>
									typeof result === 'string'
										? result
										: `${result.first} ${result.last} <${result.email}>`
								}
								renderOptionLabel={(result) => (typeof result === 'string' ? result : result.email)}
								renderSelection={(result) => (typeof result === 'string' ? result : result.email)}
								variant="outlined"
								width={500}
							/>

							<Controller
								name="definition.title"
								control={control}
								rules={{ required: true }}
								render={({ field }) => (
									<Input
										label="Subject"
										placeholder="Important Announcement"
										{...field}
										value={field.value ?? ''}
										style={{ width: 300, marginTop: 20 }}
									/>
								)}
							/>
							<Controller
								name="definition.message"
								control={control}
								rules={{ required: true }}
								render={({ field }) => (
									<Textarea
										label="Body"
										placeholder={`Hello, ${config.APP_NAME} users...`}
										{...field}
										value={field.value ?? ''}
										rows={10}
										style={{ width: '100%', marginTop: 20 }}
									/>
								)}
							/>
						</>
					)}
				</div>
			)}
		</BasicDialog>
	);
}
