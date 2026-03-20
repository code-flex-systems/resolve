'use client';
import {
	Avatar,
	Box,
	FormControl,
	InputAdornment,
	MenuItem,
	Select,
	Stack,
	TextField,
	Typography} from '@mui/material';
import { useClerkSession } from '@/lib/auth/use-clerk-session';
import { formatPhoneNumber, getInitials, parsePhoneNumber } from '@/lib/utils/utils';
import BasicDialog from '../common/BasicDialog';
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
	{
		icon: <IconShield size={15} />,
		value: config.ROLES.SUPER_ADMIN,
	},
	{
		icon: <IconShield size={15} />,
		value: config.ROLES.ADMIN,
	},
	{
		icon: <IconUser size={15} />,
		value: config.ROLES.CONTRIBUTOR,
	},
];

/*
This component handles two scenarios:
    1) The session user is updating their own display name (first/last), email, or contact number
    2) An admin user is updating their or another user's info
Notes:
    - Role updates are only allowed for admins
    - Admins are not allowed to update their own role
*/

export default function UpdateUserDialog({ user, onClose }: { user?: GetUserOutput; onClose: () => void }) {
	const { data: session } = useClerkSession();
	const [confirmingRoleChange, setConfirmingRoleChange] = useState(false);
	const userData = user ?? session?.user;
	const isAdmin = useIsAdmin();
	const isSuperAdmin = useIsSuperAdmin();
	const { mutateAsync: updateUser } = useUserTrpc().update;
	const { showSuccess, showError } = useCrudAlerts('user');

	// Filter role options based on user permissions
	// Super Admin can set any role
	// Admin can only elevate to Admin (cannot set Super Admin or demote from Admin)
	// Contributors cannot change roles at all
	const availableRoleOptions = roleOptions.filter((option) => {
		if (isSuperAdmin) return true; // Super Admin can set any role
		if (isAdmin) {
			// Admin can only elevate Contributor → Admin
			return option.value === config.ROLES.ADMIN || option.value === config.ROLES.CONTRIBUTOR;
		}
		return false; // Contributors shouldn't see role options
	});
	const {
		control,
		handleSubmit,
		watch,
		formState: { isDirty, isSubmitting, isValid, errors },
	} = useForm<UserFormState>({
		defaultValues: user
			? { ...user, phone: user.phone ? parsePhoneNumber(user.phone) : undefined }
			: {
					first: session?.user?.name?.split(' ')?.[0],
					last: session?.user?.name?.split(' ')?.[1],
					email: session?.user?.email,
					phone: session?.user?.phone ? parsePhoneNumber(session.user.phone) : undefined,
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

			const [first, last] = 'name' in userData ? userData.name.split(' ') : [userData.first, userData.last];
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

			if (!Object.keys(updates).length) return; // No updates

			const updatedInfo = await updateUser({
				id: userData.id,
				params: updates,
			});

			// Clerk handles session updates automatically when user data changes
			showSuccess('update', 'User details updated');
			onClose();
		} catch (e) {
			showError('update', e, 'Failed to update user');
		}
	};
	const onSubmit = handleSubmit(modifyUser);

	return (
		<BasicDialog
			primaryAction={{
				label: confirmingRoleChange ? 'Continue' : 'Update',
				onClick: () => {
					if (validRoleInUserData && userData.role !== role && !confirmingRoleChange && canChangeRole) {
						setConfirmingRoleChange(true);
					} else {
						onSubmit();
					}
				},
				disabled: isSubmitting || !isDirty || !isValid,
			}}
			secondaryActions={
				confirmingRoleChange ? [{ label: 'Cancel', onClick: () => setConfirmingRoleChange(false) }] : undefined
			}
			onClose={() => onClose()}
			width={500}>
			<Avatar sx={styles.avatar}>
				{userData ? getInitials('name' in userData ? userData.name : `${userData.first} ${userData.last}`) : ''}
			</Avatar>

			<Stack width="100%" display="flex" alignItems="center">
				<Collapse open={confirmingRoleChange}>
					<Box width={300} display="flex" alignItems="center" marginBottom="10px">
						<IconAlertTriangle size={20} style={{ color: 'var(--status-warning)', marginRight: '10px' }} />
						<Typography fontSize={13} lineHeight="17px" color="warning">
							You are {role === config.ROLES.ADMIN ? 'elevating' : 'lowering'} this user's privileges.
							<br />
							Are you sure you want to continue?
						</Typography>
					</Box>
				</Collapse>
				{canChangeRole ? (
					<Controller
						name="role"
						control={control}
						rules={{ required: true }}
						render={({ field }) => (
							<FormControl>
								<Select
									displayEmpty
									variant="outlined"
									error={!!errors.role}
									{...field}
									value={field.value ?? ''}
									disabled={
										isSubmitting ||
										confirmingRoleChange ||
										(isAdmin &&
											(!validRoleInUserData || userData.role !== config.ROLES.CONTRIBUTOR))
									}
									renderValue={(value) => (
										<Box
											width="100%"
											display="flex"
											justifyContent="flex-start"
											alignItems="center">
											{availableRoleOptions.find((o) => o.value === value)?.icon ??
												roleOptions.find((o) => o.value === value)?.icon ?? <></>}
											<Typography paddingLeft="10px" fontSize={13}>
												{value}
											</Typography>
										</Box>
									)}
									sx={{ ...styles.textFieldOverrides, marginBottom: '20px' }}>
									{availableRoleOptions.map((o) => (
										<MenuItem key={o.value} value={o.value}>
											<Box
												width="100%"
												display="flex"
												justifyContent="flex-start"
												alignItems="center">
												{o.icon}
												<Typography paddingLeft="10px" fontSize={13}>
													{o.value}
												</Typography>
											</Box>
										</MenuItem>
									))}
								</Select>
							</FormControl>
						)}
					/>
				) : validRoleInUserData ? (
					<Box width={300} display="flex" alignItems="center" marginBottom="10px">
						<RoleValue role={userData.role as Role} />
					</Box>
				) : (
					<></>
				)}

				<Controller
					name="first"
					control={control}
					rules={{ required: true }}
					render={({ field }) => (
						<TextField
							label="First"
							
							placeholder="John"
							error={!!errors.first}
							{...field}
							disabled={isSubmitting || confirmingRoleChange || !isSuperAdmin}
							sx={styles.textFieldOverrides}
						/>
					)}
				/>

				<Controller
					name="last"
					control={control}
					rules={{ required: true }}
					render={({ field }) => (
						<TextField
							label="Last"
							
							placeholder="Doe"
							error={!!errors.last}
							{...field}
							disabled={isSubmitting || confirmingRoleChange || !isSuperAdmin}
							sx={styles.textFieldOverrides}
						/>
					)}
				/>

				<Controller
					name="email"
					control={control}
					rules={{ required: true }}
					render={({ field }) => (
						<TextField
							label="Email"
							
							placeholder="youremail@example.com"
							error={!!errors.email}
							{...field}
							disabled={isSubmitting || confirmingRoleChange}
							sx={styles.textFieldOverrides}
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
						<TextField
							label="Contact number"
							
							placeholder="10-digit number"
							type="tel"
							error={!!errors.phone}
							helperText={errors.phone?.message}
							{...field}
							onChange={(e) => {
								if (e.target.value.length <= 10) field.onChange(e);
							}}
							slotProps={{
								input: {
									startAdornment: (
										<InputAdornment position="start">
											<Typography fontSize={13}>+1</Typography>
										</InputAdornment>
									),
								},
							}}
							disabled={isSubmitting || confirmingRoleChange}
							sx={styles.textFieldOverrides}
						/>
					)}
				/>
			</Stack>
		</BasicDialog>
	);
}

const styles = {
	avatar: {
		width: 100,
		height: 100,
		fontSize: 40,
		marginBottom: '10px',
	},
	textFieldOverrides: {
		width: 300,
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
