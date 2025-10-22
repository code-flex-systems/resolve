'use client';

import config from '@/config/config';
import theme from '@/styles/theme';
import { Role } from '@/types/types';
import { Typography } from '@mui/material';

const getRoleColorInner = (role: Role) => {
	switch (role) {
		case config.ROLES.ADMIN:
			return theme.palette.success.main;
		case config.ROLES.CONTRIBUTOR:
			return theme.palette.warning.main;
		case config.ROLES.SUPER_ADMIN:
			return theme.palette.error.main;
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
		<Typography
			fontSize={13}
			color={getRoleColorInner(role)}
			padding="2px 5px"
			bgcolor={getRoleColorOuter(role)}
			borderRadius={1}
		>
			{role}
		</Typography>
	);
}
