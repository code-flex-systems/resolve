import CustomChip from '@/components/ui/Chip';
import React, { useState } from 'react';
import BasicPopper from './BasicPopper';
import { IconSearch } from '@tabler/icons-react';
import { BASE_COLOR_LIGHT } from '@/styles/theme';

export default function RecoverySourceFilter({
	recoverySource,
	setRecoverySource,
	clearable = true,
	height,
	text = 'Filter by recovery source',
	disabled = false,
}: {
	recoverySource: string;
	setRecoverySource: (source: string) => void;
	clearable?: boolean;
	height?: number;
	text?: string;
	disabled?: boolean;
}) {
	const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
	const [inputValue, setInputValue] = useState(recoverySource);

	const handleApply = () => {
		setRecoverySource(inputValue);
		setAnchorEl(null);
	};

	const handleClear = () => {
		setInputValue('');
		setRecoverySource('');
	};

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
				<CustomChip color={recoverySource ? 'info' : 'neutral'} size="sm">
				<IconSearch size={20} style={{ color: BASE_COLOR_LIGHT }} />
					<span>{recoverySource || text}</span>
				</CustomChip>
				{recoverySource && (
					<button onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleClear; }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 14 }}>x</button>
				)}
			</span>
			{!!anchorEl && (
				<BasicPopper anchorEl={anchorEl} setAnchorEl={() => setAnchorEl(null)} placement="bottom-start">
					<div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', padding: 10, marginTop: 5, minWidth: 250 }}>
						<input
							type="text"
							placeholder="Search recovery source..."
							value={inputValue}
							onChange={(e) => setInputValue(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === 'Enter') {
									handleApply();
								}
							}}
							style={{
								width: '100%',
								border: 'none',
								outline: 'none',
								fontSize: 13,
								padding: '5px',
							}}
							autoFocus
						/>
					</div>
				</BasicPopper>
			)}
		</>
	);
}
