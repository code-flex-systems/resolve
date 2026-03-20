import CustomChip from '@/components/ui/Chip';
import React, { useState } from 'react';
import BasicPopper from './BasicPopper';
import { BASE_COLOR_LIGHT } from '@/styles/theme';
import { useDeskTrpc } from '@/hooks/trpc/useDeskTrpc';
import { IconLayoutBoard } from '@tabler/icons-react';

interface DeskLocationTypeFilterProps {
	value: number | null;
	onChange: (value: number | null) => void;
	clearable?: boolean;
	height?: number;
	label?: string;
	disabled?: boolean;
}

export default function DeskLocationTypeFilter({
	value,
	onChange,
	clearable = true,
	height,
	label = 'Filter by desk type',
	disabled = false,
}: DeskLocationTypeFilterProps) {
	const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
	const { data = { rows: [], count: 0 }, isFetching } = useDeskTrpc().listTypes({});

	const selectedType = data.rows.find((type) => type.id === value);
	const displayLabel = selectedType ? selectedType.name : label;

	return (
		<>
			<span
				onClick={(e: React.MouseEvent) => {
				setAnchorEl(e.currentTarget as HTMLElement);
				e.preventDefault();
				e.stopPropagation();
			}}
				style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer', margin: '5px 0px', opacity: disabled || isFetching ? 0.5 : 1 }}
			>
				<CustomChip color={value ? 'info' : 'neutral'} size="sm">
				<IconLayoutBoard size={20} style={{ color: value ? undefined : BASE_COLOR_LIGHT }} />
					<span>{displayLabel}</span>
				</CustomChip>
				{value && (
					<button onClick={(e: React.MouseEvent) => { e.stopPropagation(); onChange(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 14 }}>x</button>
				)}
			</span>
			{!!anchorEl && (
				<BasicPopper anchorEl={anchorEl} setAnchorEl={() => setAnchorEl(null)} placement="bottom-start">
					<div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', padding: 8, marginTop: 5, minWidth: 220 }}>
						{data.rows.map((type) => (
							<div
								key={type.id}
								style={{
									padding: '8px 12px',
									borderRadius: 6,
									cursor: 'pointer',
									fontSize: 13,
									backgroundColor: value === type.id ? 'var(--status-info-bg)' : undefined,
								}}
								onClick={() => {
									onChange(type.id);
									setAnchorEl(null);
								}}
							>
								<div style={{ width: '100%', display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
									<IconLayoutBoard size={16} style={{ color: BASE_COLOR_LIGHT, marginRight: 8 }} />
									<span style={{ fontSize: 13 }}>{type.name}</span>
								</div>
							</div>
						))}
					</div>
				</BasicPopper>
			)}
		</>
	);
}
