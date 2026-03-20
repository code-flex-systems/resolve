import { GetChecklistOutput, useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import CustomChip from '@/components/ui/Chip';
import { useEffect, useState } from 'react';
import BasicPopper from './BasicPopper';
import { IconChecklist } from '@tabler/icons-react';

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
	const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

	useEffect(() => {
		if (!clearable && !showEmpty && options.length > 0) {
			setChecklist(options[0]);
		}
	}, [options, clearable, showEmpty]);

	return (
		<>
			<span
				onClick={(e: React.MouseEvent<HTMLSpanElement>) => {
					if (disabled) return;
					setAnchorEl(e.currentTarget);
					e.preventDefault();
					e.stopPropagation();
				}}
				style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: disabled ? 'default' : 'pointer', margin: '5px 0px', height, opacity: disabled ? 0.5 : 1 }}
			>
				<CustomChip color={checklist ? 'info' : 'neutral'} size="sm">
					<IconChecklist size={16} style={{ color: checklist ? 'var(--text-accent)' : undefined }} />
					<span style={{ color: checklist ? 'var(--text-accent)' : undefined }}>{options.find((o) => o.id === checklist?.id)?.name ?? text}</span>
				</CustomChip>
				{checklist && clearable && (
					<button onClick={(e) => { e.stopPropagation(); setChecklist(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 14 }}>x</button>
				)}
			</span>
			{!!anchorEl && (
				<BasicPopper anchorEl={anchorEl} setAnchorEl={() => setAnchorEl(null)} placement="bottom-start">
					<div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', padding: 8, marginTop: 5, minWidth: 200 }}>
						{options.map((o) => (
							<div
								key={o.id}
								style={{
									padding: '8px 12px',
									borderRadius: 6,
									cursor: 'pointer',
									backgroundColor: o.id === checklist?.id ? 'var(--status-info-bg)' : undefined,
								}}
								onClick={() => {
									setChecklist(o);
									setAnchorEl(null);
								}}
							>
								<span style={{ fontSize: 13 }}>{o.name}</span>
							</div>
						))}
					</div>
				</BasicPopper>
			)}
		</>
	);
}
