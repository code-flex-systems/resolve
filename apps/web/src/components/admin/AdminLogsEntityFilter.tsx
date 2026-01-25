'use client';

import { Chip, MenuItem, Paper, PopperProps, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import AccountTree from '@mui/icons-material/AccountTree';
import BasicPopper from '@/components/common/BasicPopper';
import { EntityName } from '@/api/utils/activityLogger';
import { TEXT_MUTED } from '@/styles/theme';

const ENTITY_OPTIONS = Object.values(EntityName);

function formatEntityLabel(value: string) {
	return value
		.split('_')
		.map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
		.join(' ');
}

export default function AdminLogsEntityFilter({
	value,
	onChange,
	height = 32,
	text = 'Filter by entity',
}: {
	value: EntityName | null;
	onChange: (value: EntityName | null) => void;
	height?: number;
	text?: string;
}) {
	const [anchorEl, setAnchorEl] = useState<PopperProps['anchorEl']>();

	const handleClose = () => setAnchorEl(null);

	return (
		<>
			<Chip
				label={value ? formatEntityLabel(value) : text}
				icon={<AccountTree sx={{ color: value ? undefined : TEXT_MUTED }} />}
				onClick={(e) => {
					setAnchorEl(e.currentTarget);
					e.preventDefault();
					e.stopPropagation();
				}}
				onDelete={value ? () => onChange(null) : undefined}
				sx={{
					height,
					'& .MuiChip-icon': {
						color: value ? undefined : TEXT_MUTED,
					},
				}}
			/>
			{!!anchorEl && (
				<BasicPopper anchorEl={anchorEl} setAnchorEl={handleClose} placement="bottom-start">
					<Paper sx={styles.filterPaper}>
						<TextField
							select
							fullWidth
							label="Entity"
							value={value ?? ''}
							onChange={(event) => {
								const nextValue = event.target.value as EntityName;
								onChange(nextValue || null);
								handleClose();
							}}
							size="small"
						>
							<MenuItem value="">
								<Typography fontSize={13}>All entities</Typography>
							</MenuItem>
							{ENTITY_OPTIONS.map((entity) => (
								<MenuItem key={entity} value={entity}>
									<Typography fontSize={13}>{formatEntityLabel(entity)}</Typography>
								</MenuItem>
							))}
						</TextField>
					</Paper>
				</BasicPopper>
			)}
		</>
	);
}

export function formatEntityLabelForDisplay(value: string) {
	return formatEntityLabel(value);
}

const styles = {
	filterPaper: {
		padding: 1.5,
		minWidth: 240,
	},
};
