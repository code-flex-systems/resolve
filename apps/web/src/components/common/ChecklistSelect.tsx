import { GetChecklistOutput, useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import { Chip, MenuItem, Paper, PopperProps, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import BasicPopper from './BasicPopper';
import Checklist from '@mui/icons-material/Checklist';
import theme from '@/styles/theme';

export default function ChecklistSelect({
	checklist,
	setChecklist,
	clearable = true,
	showEmpty = false,
	height,
	text = 'Filter by checklist',
	disabled = false,
}: {
	checklist: GetChecklistOutput | null;
	setChecklist: (newChecklist: GetChecklistOutput | null) => void;
	clearable?: boolean;
	showEmpty?: boolean;
	height?: number;
	text?: string;
	disabled?: boolean;
}) {
	const { data: options = [], isFetching } = useChecklistTrpc().list({});
	const [anchorEl, setAnchorEl] = useState<PopperProps['anchorEl']>();

	useEffect(() => {
		if (!clearable && !showEmpty && options.length > 0) {
			setChecklist(options[0]);
		}
	}, [options, clearable, showEmpty]);

	return (
		<>
			<Chip
				label={options.find((o) => o.id === checklist?.id)?.name ?? text}
				icon={<Checklist />}
				onClick={(e) => {
					setAnchorEl(e.currentTarget);
					e.preventDefault();
					e.stopPropagation();
				}}
				onDelete={checklist && clearable ? () => setChecklist(null) : undefined}
				sx={{
					...styles.chip,
					height,
					'& .MuiChip-icon': {
						color: checklist ? theme.palette.primary.main : undefined,
					},
					'& .MuiChip-label': {
						color: checklist ? theme.palette.primary.main : undefined,
					},
				}}
				disabled={disabled}
			/>
			{!!anchorEl && (
				<BasicPopper anchorEl={anchorEl} setAnchorEl={() => setAnchorEl(null)} placement="bottom-start">
					<Paper sx={styles.paper}>
						{options.map((o) => (
							<MenuItem
								key={o.id}
								selected={o.id === checklist?.id}
								value={o.id}
								onClick={() => {
									setChecklist(o);
									setAnchorEl(null);
								}}
							>
								<Typography fontSize={13}>{o.name}</Typography>
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
