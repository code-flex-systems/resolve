'use client';

import Card from '@/components/ui/Card';
import ExecutionHistoryTable from './ExecutionHistoryTable';

export default function ExecutionHistoryView() {
	return (
		<div style={{ width: '100%' }}>
			<Card
				variant="beveled"
				padding="md"
				style={{
					display: 'flex',
					flexDirection: 'column',
					width: '100%',
					height: 'calc(100vh - 90px)',
				}}
			>
				<ExecutionHistoryTable />
			</Card>
		</div>
	);
}
