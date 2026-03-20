import React, { useState } from 'react';
import Dropdown from '@/components/ui/Dropdown';

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
	const [inputValue, setInputValue] = useState(recoverySource);

	const handleApply = () => {
		setRecoverySource(inputValue);
	};

	const handleClear = () => {
		setInputValue('');
		setRecoverySource('');
	};

	return (
		<div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
			<input
				type="text"
				placeholder={text}
				value={inputValue}
				onChange={(e) => setInputValue(e.target.value)}
				onKeyDown={(e) => {
					if (e.key === 'Enter') {
						handleApply();
					}
				}}
				onBlur={handleApply}
				disabled={disabled}
				style={{
					border: '1px solid var(--border)',
					borderRadius: 'var(--radius-md)',
					fontSize: 13,
					padding: '4px 10px',
					height: 32,
					outline: 'none',
					background: 'var(--bg-white)',
					minWidth: 180,
				}}
			/>
			{recoverySource && clearable && (
				<button
					onClick={handleClear}
					style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 14 }}
				>
					x
				</button>
			)}
		</div>
	);
}
