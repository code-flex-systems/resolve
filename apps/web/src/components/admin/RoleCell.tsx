'use client';

import config from '@/config/config';
import theme from '@/styles/theme';
import { Role } from '@/types/types';
import { Box, Typography } from '@mui/material';
import { GridRenderCellParams } from '@mui/x-data-grid-pro';

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

export default function RoleCell(params: GridRenderCellParams) {
	return (
		<Box width="100%" height="100%" display="flex" justifyContent="flex-start" alignItems="center">
			<Typography
				fontSize={13}
				color={getRoleColorInner(params.row.role)}
				padding="2px 5px"
				bgcolor={getRoleColorOuter(params.row.role)}
				borderRadius={1}
			>
				{params.row.role}
			</Typography>
		</Box>
	);
}
