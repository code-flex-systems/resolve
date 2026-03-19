'use client';

import { Box, Typography, Fade } from '@mui/material';
import ExecutionHistoryTable from './ExecutionHistoryTable';

export default function ExecutionHistoryView() {
	return (
		<Fade in timeout={400}>
			<Box sx={{ p: 4, width: '100%' }}>
				<Typography variant="h4" fontWeight={700} sx={{ mb: 1 }}>
					Execution History
				</Typography>
				<Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
					View the history of all workflow rule executions
				</Typography>
				<ExecutionHistoryTable />
			</Box>
		</Fade>
	);
}
