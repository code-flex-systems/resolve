'use client';

import { IconBinaryTree } from '@tabler/icons-react';
import { useState } from 'react';
import Dropdown from '@/components/ui/Dropdown';
import BasicPopper from '@/components/common/BasicPopper';
import { EntityName } from '@/api/utils/activityLogger';

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
	const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

	const handleClose = () => setAnchorEl(null);

	return (
		<>
			<span
				onClick={(e) => {
					setAnchorEl(e.currentTarget);
					e.preventDefault();
					e.stopPropagation();
				}}
				style={{
					display: 'inline-flex',
					alignItems: 'center',
					gap: 6,
					height,
					padding: '0 12px',
					borderRadius: 'var(--radius-full)',
					backgroundColor: 'var(--bg-tertiary)',
					fontSize: 13,
					cursor: 'pointer',
					color: value ? 'var(--text-primary)' : 'var(--text-muted)',
				}}
			>
				<IconBinaryTree size={16} style={{ color: value ? undefined : 'var(--text-muted)' }} />
				{value ? formatEntityLabel(value) : text}
				{value && (
					<span
						onClick={(e) => {
							e.stopPropagation();
							onChange(null);
						}}
						style={{ marginLeft: 4, cursor: 'pointer', color: 'var(--text-muted)' }}
					>
						&times;
					</span>
				)}
			</span>
			{!!anchorEl && (
				<BasicPopper anchorEl={anchorEl} setAnchorEl={handleClose} placement="bottom-start">
					<div style={{ padding: 12, minWidth: 240 }}>
						<Dropdown
							inlineLabel
							fullWidth
							label="Entity"
							value={value ?? ''}
							onChange={(val) => {
								const nextValue = String(val) as EntityName;
								onChange(nextValue || null);
								handleClose();
							}}
							options={[
								{ value: '', label: 'All entities' },
								...ENTITY_OPTIONS.map((entity) => ({
									value: entity,
									label: formatEntityLabel(entity),
								})),
							]}
						/>
					</div>
				</BasicPopper>
			)}
		</>
	);
}

export function formatEntityLabelForDisplay(value: string) {
	return formatEntityLabel(value);
}
