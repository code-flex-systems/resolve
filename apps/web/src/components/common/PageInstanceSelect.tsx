import { MenuItem, Paper, PopperProps } from '@mui/material';
import CustomChip from '@/components/ui/Chip';
import React, { useEffect, useState } from 'react';
import BasicPopper from './BasicPopper';
import { IconFileDescription } from '@tabler/icons-react';
import { usePageTrpc } from '@/hooks/trpc/usePageTrpc';

export default function PageInstanceSelect({
	checklistId,
	instanceId,
	setInstanceId,
	clearable = true,
	height,
	text = 'Filter by page',
	disabled = false,
}: {
	checklistId: number;
	instanceId: number | null;
	setInstanceId: (newInstanceId: number | null) => void;
	clearable?: boolean;
	height?: number;
	text?: string;
	disabled?: boolean;
}) {
	const { data: options = [], isFetching } = usePageTrpc().listInstances(
		{ checklistId },
		{ enabled: checklistId !== -1 }
	);
	const [anchorEl, setAnchorEl] = useState<PopperProps['anchorEl']>();
	const selectedOption = options.find((o) => o.instance_id === instanceId);

	useEffect(() => {
		if (!clearable && options.length > 0) {
			setInstanceId(options[0].instance_id);
		}
	}, [options, clearable]);

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
				<CustomChip color={instanceId ? 'info' : 'neutral'} size="sm">
				<IconFileDescription size={20} />
					<span>{selectedOption
						? `${selectedOption.title} (p${selectedOption.id}.i${selectedOption.instance_id})`
						: text}</span>
				</CustomChip>
				{instanceId && (
					<button onClick={(e: React.MouseEvent) => { e.stopPropagation(); setInstanceId(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 14 }}>x</button>
				)}
			</span>
			{!!anchorEl && (
				<BasicPopper anchorEl={anchorEl} setAnchorEl={() => setAnchorEl(null)} placement="bottom-start">
					<Paper sx={styles.paper}>
						{options.map((o) => (
							<MenuItem
								key={o.instance_id}
								selected={o.instance_id === instanceId}
								value={o.instance_id}
								onClick={() => {
									setInstanceId(o.instance_id);
									setAnchorEl(null);
								}}
							>
								<span style={{ fontSize: 13 }}>
									{o.title} (p{o.id}.i{o.instance_id})
								</span>
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
		maxHeight: 300,
		overflow: 'auto',
	},
};
