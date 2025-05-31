import config from '@/config/config';
import { Typography } from '@mui/material';
import { GridRenderCellParams } from '@mui/x-data-grid';

export default function RoleCell(params: GridRenderCellParams) {
	const isAdmin = params.row.role === config.ROLES.ADMIN;
	return (
		<div style={{ width: '100%', height: '100%' }} className="flex-row-left">
			<Typography fontWeight={isAdmin ? 'bold' : undefined} fontSize={14} color={isAdmin ? 'success' : undefined}>
				{isAdmin ? config.ROLES.ADMIN : config.ROLES.CONTRIBUTOR}
			</Typography>
		</div>
	);
}
