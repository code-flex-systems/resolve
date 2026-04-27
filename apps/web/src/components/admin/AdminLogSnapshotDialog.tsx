'use client';

import BasicDialog from '@/components/common/BasicDialog';

export default function AdminLogSnapshotDialog({
	entityLabel,
	value,
	onClose,
}: {
	entityLabel: string;
	value: unknown;
	onClose: () => void;
}) {
	return (
		<BasicDialog title="Log Snapshot" onClose={onClose} width={720}>
			<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
				<span style={{ fontWeight: 600 }}>{entityLabel}</span>
				<div
					style={{
						whiteSpace: 'pre-wrap',
						wordBreak: 'break-word',
						backgroundColor: 'grey.100',
						borderRadius: 4,
						padding: 16,
						fontSize: 13,
					}}
				>
					{typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
				</div>
			</div>
		</BasicDialog>
	);
}
