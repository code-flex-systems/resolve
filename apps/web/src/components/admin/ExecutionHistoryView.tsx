'use client';

import Card from '@/components/ui/Card';
import ExecutionHistoryTable from './ExecutionHistoryTable';

export default function ExecutionHistoryView() {
	return (
		<div style={{ padding: 32, width: '100%' }}>
			<Card variant="beveled" padding="md" style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
				<p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '0 0 12px', lineHeight: 1.5 }}>
					View the history of all workflow rule executions, including actions taken, pending approvals, and failures.
				</p>
				<ExecutionHistoryTable />
			</Card>
		</div>
	);
}
