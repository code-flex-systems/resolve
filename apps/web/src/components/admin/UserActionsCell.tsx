'use client';

import { IconEdit, IconLogout } from '@tabler/icons-react';
import Button from '@/components/ui/Button';
import { useUserTrpc } from '@/hooks/trpc/useUserTrpc';
import { useClerkSession } from '@/lib/auth/use-clerk-session';
import { useState } from 'react';
import BasicDialog from '../common/BasicDialog';
import BasicButtonStyled from '../common/BasicButtonStyled';
import UpdateUserDialog from '../home/UpdateUserDialog';

interface UserActionsCellProps {
	row: any;
	value?: any;
	id?: string | number;
	isManageMode?: boolean;
}

export default function UserActionsCell(params: UserActionsCellProps) {
	const { row, isManageMode = true } = params;
	if (!isManageMode) return null;
	const { mutate, isPending } = useUserTrpc().update;
	const { data: session } = useClerkSession();
	const [onOffboarding, setOnOffboarding] = useState(false);
	const [updating, setUpdating] = useState(false);
	return (
		<>
			{onOffboarding && (
				<BasicDialog
					title={`${row.disabled ? 'Onboard' : 'Offboard'} ${row.first} ${row.last}`}
					primaryAction={{
						label: 'Confirm',
						onClick: () => mutate({ id: row.id, params: { disabled: !row.disabled } }),
						color: 'warning',
					}}
					secondaryActions={[
						{
							label: 'Cancel',
							onClick: () => setOnOffboarding(false),
						},
					]}
					onClose={() => setOnOffboarding(false)}
					width={500}
				>
					<span style={{  fontStyle: 'italic' ,  fontWeight: 'bold'  }}>
						Are you sure you want to {row.disabled ? 'onboard' : 'offboard'} this user?
					</span>
					<span style={{ paddingTop: '10px', fontStyle: 'italic' }}>
						The user will receive an email informing them that their access to the application has been{' '}
						{row.disabled ? 'reinstated' : 'terminated'}.
					</span>
				</BasicDialog>
			)}
			{updating && <UpdateUserDialog user={row} onClose={() => setUpdating(false)} />}

			<div style={styles.container}>
				<BasicButtonStyled
					buttonProps={{
						onClick: () => setUpdating(true),
						disabled: isPending,
					}}
					tooltipProps={{ title: 'Make changes' }}
					icon={<IconEdit size={15} />}
				/>
				{session?.user?.id !== row.id && (
					<div style={{ marginLeft: '10px' }}>
						<BasicButtonStyled
							buttonProps={{
								onClick: () => setOnOffboarding(true),
								disabled: isPending,
							}}
							tooltipProps={{ title: row.disabled ? 'Onboard' : 'Offboard' }}
							icon={<IconLogout style={{ fontSize: 15, transform: row.disabled ? 'scaleX(-1)' : undefined }} />}
						/>
					</div>
				)}
			</div>
		</>
	);
}

const styles = {
	container: {
		width: '100%',
		height: '100%',
		display: 'flex',
		justifyContent: 'flex-end',
		alignItems: 'center',
	},
};
