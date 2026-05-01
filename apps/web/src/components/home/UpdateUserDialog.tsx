'use client';

import { useClerkSession } from '@/lib/auth/use-clerk-session';
import { formatPhoneNumber, getInitials, parsePhoneNumber } from '@/lib/utils/utils';
import BasicDialog from '../common/BasicDialog';
import Input from '@/components/ui/Input';
import Dropdown from '@/components/ui/Dropdown';
import { Controller, useForm } from 'react-hook-form';
import { GetUserOutput, UpdateUserInput, useUserTrpc } from '@/hooks/trpc/useUserTrpc';
import { Role } from '@/types/types';
import config from '@/config/config';
import useIsAdmin from '@/hooks/useIsAdmin';
import useIsSuperAdmin from '@/hooks/useIsSuperAdmin';
import { JSX, useState } from 'react';
import RoleValue from '../admin/RoleValue';
import { useCrudAlerts } from '@/hooks/useCrudAlerts';
import { IconAlertTriangle, IconShield, IconUser } from '@tabler/icons-react';
import Collapse from '@/components/ui/Collapse';

interface UserFormState {
	first: string;
	last: string;
	email: string;
	phone: string;
	role: string;
}

const roleOptions: { icon: JSX.Element; value: Role }[] = [
	{ icon: <IconShield size={15} />, value: config.ROLES.SUPER_ADMIN },
	{ icon: <IconShield size={15} />, value: config.ROLES.ADMIN },
	{ icon: <IconUser size={15} />, value: config.ROLES.CONTRIBUTOR },
];

export default function UpdateUserDialog({
	user,
	onClose,
}: {
	user?: GetUserOutput;
	onClose: () => void;
}) {
	const { data: session } = useClerkSession();
	const [confirmingRoleChange, setConfirmingRoleChange] = useState(false);
	const userData = user ?? session?.user;
	const isAdmin = useIsAdmin();
	const isSuperAdmin = useIsSuperAdmin();
	const { mutateAsync: updateUser } = useUserTrpc().update;
	const { showSuccess, showError } = useCrudAlerts('user');

	const availableRoleOptions = roleOptions.filter((option) => {
		if (isSuperAdmin) return true;
		if (isAdmin)
			return option.value === config.ROLES.ADMIN || option.value === config.ROLES.CONTRIBUTOR;
		return false;
	});

	const {
		control,
		handleSubmit,
		watch,
		formState: { isDirty, isSubmitting, isValid, errors },
	} = useForm<UserFormState>({
		defaultValues: user
			? { ...user, phone: user.phone ? parsePhoneNumber(user.phone) : '' }
			: {
					first: session?.user?.name?.split(' ')?.[0] ?? '',
					last: session?.user?.name?.split(' ')?.[1] ?? '',
					email: session?.user?.email ?? '',
					phone: session?.user?.phone ? parsePhoneNumber(session.user.phone) : '',
					role: session?.user?.role ?? config.ROLES.CONTRIBUTOR,
				},
		mode: 'onChange',
	});
	const role = watch('role');
	const canChangeRole = session?.user?.id !== userData?.id && (isAdmin || isSuperAdmin);
	const validRoleInUserData = !!userData && 'role' in userData;

	const modifyUser = async (data: UserFormState) => {
		try {
			if (!userData) return;
			const [first, last] =
				'name' in userData ? (userData.name ?? '').split(' ') : [userData.first, userData.last];
			const phoneNumber = userData.phone ? parsePhoneNumber(userData.phone) : undefined;
			const updates: UpdateUserInput['params'] = {
				first: data.first !== first ? data.first : undefined,
				last: data.last !== last ? data.last : undefined,
				email: data.email !== userData.email ? data.email : undefined,
				phone: data.phone !== phoneNumber ? formatPhoneNumber(data.phone).toString() : undefined,
				role:
					canChangeRole && 'role' in userData && data.role !== userData.role
						? (data.role as Role)
						: undefined,
			};
			if (!Object.keys(updates).length) return;
			await updateUser({ id: userData.id, params: updates });
			showSuccess('update', 'User details updated');
			onClose();
		} catch (e) {
			showError('update', e, 'Failed to update user');
		}
	};
	const onSubmit = handleSubmit(modifyUser as any);

	const dropdownRoleOptions = availableRoleOptions.map((o) => ({
		value: o.value,
		label: o.value,
		icon: o.icon,
	}));

	return (
		<BasicDialog
			primaryAction={{
				label: confirmingRoleChange ? 'Continue' : 'Update',
				onClick: () => {
					if (
						validRoleInUserData &&
						userData.role !== role &&
						!confirmingRoleChange &&
						canChangeRole
					) {
						setConfirmingRoleChange(true);
					} else {
						onSubmit();
					}
				},
				disabled: isSubmitting || !isDirty || !isValid,
			}}
			secondaryActions={
				confirmingRoleChange
					? [{ label: 'Cancel', onClick: () => setConfirmingRoleChange(false) }]
					: undefined
			}
			onClose={onClose}
			width={500}
		>
			<div
				style={{
					display: 'flex',
					flexDirection: 'column' as const,
					alignItems: 'center',
					width: '100%',
				}}
			>
				{/* Avatar */}
				<div
					style={{
						width: 100,
						height: 100,
						borderRadius: '50%',
						backgroundColor: 'var(--bg-tertiary)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						fontSize: 40,
						fontWeight: 600,
						color: 'var(--text-secondary)',
						marginBottom: 10,
					}}
				>
					{userData
						? getInitials('name' in userData ? userData.name : `${userData.first} ${userData.last}`)
						: ''}
				</div>

				<Collapse open={confirmingRoleChange}>
					<div style={{ display: 'flex', alignItems: 'center', marginBottom: 10, maxWidth: 300 }}>
						<IconAlertTriangle
							size={20}
							style={{ color: 'var(--status-warning)', marginRight: 10, flexShrink: 0 }}
						/>
						<span style={{ fontSize: 13, lineHeight: '17px', color: 'var(--status-warning)' }}>
							You are {role === config.ROLES.ADMIN ? 'elevating' : 'lowering'} this user&apos;s
							privileges. Are you sure you want to continue?
						</span>
					</div>
				</Collapse>

				{/* Role selector */}
				{canChangeRole ? (
					<div style={{ width: 300, marginBottom: 12 }}>
						<Controller
							name="role"
							control={control}
							rules={{ required: true }}
							render={({ field }) => (
								<Dropdown
									options={dropdownRoleOptions}
									value={field.value ?? ''}
									onChange={(v) => field.onChange(String(v))}
									disabled={
										isSubmitting ||
										confirmingRoleChange ||
										(isAdmin &&
											(!validRoleInUserData || userData.role !== config.ROLES.CONTRIBUTOR))
									}
									placeholder="Select role"
									fullWidth
								/>
							)}
						/>
					</div>
				) : validRoleInUserData ? (
					<div style={{ marginBottom: 10 }}>
						<RoleValue role={userData.role as Role} />
					</div>
				) : null}

				{/* Form fields */}
				<div style={{ width: 300, display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
					<Controller
						name="first"
						control={control}
						rules={{ required: true }}
						render={({ field }) => (
							<Input
								label="First"
								placeholder="John"
								error={!!errors.first}
								{...field}
								disabled={isSubmitting || confirmingRoleChange || !isSuperAdmin}
								fullWidth
							/>
						)}
					/>
					<Controller
						name="last"
						control={control}
						rules={{ required: true }}
						render={({ field }) => (
							<Input
								label="Last"
								placeholder="Doe"
								error={!!errors.last}
								{...field}
								disabled={isSubmitting || confirmingRoleChange || !isSuperAdmin}
								fullWidth
							/>
						)}
					/>
					<Controller
						name="email"
						control={control}
						rules={{ required: true }}
						render={({ field }) => (
							<Input
								label="Email"
								placeholder="youremail@example.com"
								error={!!errors.email}
								{...field}
								disabled={isSubmitting || confirmingRoleChange}
								fullWidth
							/>
						)}
					/>
					<Controller
						name="phone"
						control={control}
						rules={{
							maxLength: 10,
							minLength: 10,
							validate: (v) => {
								try {
									formatPhoneNumber(v);
									return true;
								} catch (e) {
									return 'Invalid number';
								}
							},
						}}
						render={({ field }) => (
							<Input
								label="Contact number"
								placeholder="10-digit number"
								type="tel"
								error={!!errors.phone}
								errorText={errors.phone?.message}
								startAdornment={
									<span style={{ color: 'var(--text-muted)', fontSize: 13 }}>+1</span>
								}
								{...field}
								onChange={(e) => {
									if (e.target.value.length <= 10) field.onChange(e);
								}}
								disabled={isSubmitting || confirmingRoleChange}
								fullWidth
							/>
						)}
					/>
				</div>
			</div>
		</BasicDialog>
	);
}
