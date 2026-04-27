'use client';

import config from '@/config/config';
import { Role } from '@/types/types';
import Chip from '@/components/ui/Chip';

const getRoleColor = (role: Role): 'success' | 'warning' | 'error' | 'neutral' => {
	switch (role) {
		case config.ROLES.SUPER_ADMIN:
			return 'error';
		case config.ROLES.ADMIN:
			return 'success';
		case config.ROLES.CONTRIBUTOR:
			return 'warning';
		default:
			return 'neutral';
	}
};

export default function RoleValue({ role }: { role: Role }) {
	return (
		<Chip color={getRoleColor(role)} size="sm">
			{role}
		</Chip>
	);
}
