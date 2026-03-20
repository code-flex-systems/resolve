'use client';

import Card from '@/components/ui/Card';
import ExecutionHistoryTable from './ExecutionHistoryTable';

export default function ExecutionHistoryView() {
	return (
		<div style={{ padding: 32, width: '100%' }}>
			<Card variant="beveled" padding="md" style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
				<h5 style={{ margin: 0, fontSize: 18, fontWeight: 700, fontWeight: 700, marginBottom: 8 }}>
					Execution History
				</h5>
				<span style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
					View the history of all workflow rule executions
				</span>
				<ExecutionHistoryTable />
			</Card>
		</div>
	);
}
