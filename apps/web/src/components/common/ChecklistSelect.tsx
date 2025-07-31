import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import { Chip, ChipProps, MenuItem, Paper, PopperProps, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import BasicPopper from './BasicPopper';
import { Checklist } from '@mui/icons-material';

export default function ChecklistSelect({
	selected,
	setSelected,
	color = 'primary',
}: {
	selected: number | null;
	setSelected: (newSelected: number | null) => void;
	color?: ChipProps['color'];
}) {
	const { data: options = [], isFetching } = useChecklistTrpc().list({});
	const [anchorEl, setAnchorEl] = useState<PopperProps['anchorEl']>();

	useEffect(() => {
		setSelected(options[0]?.id ?? null);
	}, [options]);

	return (
		<>
			<Chip
				icon={<Checklist />}
				label={options.find((o) => o.id === selected)?.name ?? 'Select'}
				color={selected ? color : undefined}
				onClick={(e) => setAnchorEl(e.currentTarget)}
			/>
			{!!anchorEl && (
				<BasicPopper anchorEl={anchorEl} setAnchorEl={() => setAnchorEl(null)} placement="bottom-start">
					<Paper sx={styles.paper}>
						{options.map((o) => (
							<MenuItem
								key={o.id}
								selected={o.id === selected}
								value={o.id}
								onClick={() => {
									setSelected(o.id);
									setAnchorEl(null);
								}}
							>
								<Typography fontSize={15}>{o.name}</Typography>
							</MenuItem>
						))}
					</Paper>
				</BasicPopper>
			)}
		</>
	);
}

const styles = {
	paper: {
		outline: 1,
		outlineColor: 'divider',
		marginTop: '5px',
		minWidth: 200,
	},
};
