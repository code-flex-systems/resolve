'use client';

import { Box, Typography } from '@mui/material';
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
			<Box display="flex" flexDirection="column" gap={1.5}>
				<Typography fontWeight={600}>{entityLabel}</Typography>
				<Box
					component="pre"
					sx={{
						whiteSpace: 'pre-wrap',
						wordBreak: 'break-word',
						bgcolor: 'grey.100',
						borderRadius: 1,
						p: 2,
						fontSize: 13,
					}}
				>
					{typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
				</Box>
			</Box>
		</BasicDialog>
	);
}
