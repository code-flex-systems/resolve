import { MenuItem, Paper, PopperProps } from '@mui/material';
import CustomChip from '@/components/ui/Chip';
import React, { useState } from 'react';
import BasicPopper from './BasicPopper';
import { IconCircleCheck } from '@tabler/icons-react';
import { BASE_COLOR_LIGHT } from '@/styles/theme';
import { ClaimSubstatus } from '@/config/enums';
import { formatLabel } from '@/lib/utils/claimUtils';

export default function SubstatusSelect({
	substatus,
	setSubstatus,
	clearable = true,
	height,
	text = 'Filter by status',
	disabled = false,
}: {
	substatus: ClaimSubstatus | null;
	setSubstatus: (newStatus: ClaimSubstatus | null) => void;
	clearable?: boolean;
	height?: number;
	text?: string;
	disabled?: boolean;
}) {
	const [anchorEl, setAnchorEl] = useState<PopperProps['anchorEl']>();

	return (
		<>
			<span
				onClick={(e: React.MouseEvent) => {
				setAnchorEl(e.currentTarget as HTMLElement);
				e.preventDefault();
				e.stopPropagation();
			}}
				style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer', margin: '5px 0px', opacity: disabled ? 0.5 : 1 }}
			>
				<CustomChip color={substatus ? 'info' : 'neutral'} size="sm">
				<IconCircleCheck size={20} style={{ color: BASE_COLOR_LIGHT }} />
					<span>{substatus ? formatLabel(substatus) : text}</span>
				</CustomChip>
				{substatus && (
					<button onClick={(e: React.MouseEvent) => { e.stopPropagation(); setSubstatus(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 14 }}>x</button>
				)}
			</span>
			{!!anchorEl && (
				<BasicPopper anchorEl={anchorEl} setAnchorEl={() => setAnchorEl(null)} placement="bottom-start">
					<Paper sx={styles.paper}>
						{Object.values(ClaimSubstatus)
							.sort((a, b) => a.localeCompare(b))
							.map((o) => (
								<MenuItem
									key={o}
									selected={substatus === o}
									value={o}
									onClick={() => {
										setSubstatus(o);
										setAnchorEl(null);
									}}
								>
									<div style={{ width: '100%', display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
										<span style={{ fontSize: 13 }}>{formatLabel(o)}</span>
									</div>
								</MenuItem>
							))}
					</Paper>
				</BasicPopper>
			)}
		</>
	);
}

const styles = {
	chip: {
		margin: '5px 0px',
	},
	paper: {
		mt: 0.625,
		minWidth: 200,
	},
};
