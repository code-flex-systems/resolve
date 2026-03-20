'use client';

import config from '@/config/config';
import { Role } from '@/types/types';

const getRoleColorInner = (role: Role) => {
	switch (role) {
		case config.ROLES.ADMIN:
			return 'var(--status-success)';
		case config.ROLES.CONTRIBUTOR:
			return 'var(--status-warning)';
		case config.ROLES.SUPER_ADMIN:
			return 'var(--status-error)';
	}
};

const getRoleColorOuter = (role: Role) => {
	switch (role) {
		case config.ROLES.ADMIN:
			return 'rgba(76, 175, 79, 0.2)';
		case config.ROLES.CONTRIBUTOR:
			return 'rgb(255, 242, 224)';
		case config.ROLES.SUPER_ADMIN:
			return 'rgba(238, 83, 79, 0.2)';
	}
};

export default function RoleValue({ role }: { role: Role }) {
	return (
		<span style={{ fontSize: 13, color: getRoleColorInner(role), padding: '2px 5px', backgroundColor: getRoleColorOuter(role), borderRadius: 4 }}>
			{role}
		</span>
	);
}
