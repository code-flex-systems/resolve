'use client';

import ExecutionHistoryTable from './ExecutionHistoryTable';
import { Table } from '@mui/material';

export default function ExecutionHistoryView() {
	return (
		<div>
			<div style={{ padding: 32, width: '100%' }}>
				<span style={{ fontWeight: 700, marginBottom: 8 }}>
					Execution History
				</span>
				<span style={{  color: 'var(--text-secondary)' ,  marginBottom: 24  }}>
					View the history of all workflow rule executions
				</span>
				<ExecutionHistoryTable />
			</div>
		</div>
	);
}
