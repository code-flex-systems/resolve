'use client';

import { Ring } from 'ldrs/react';
import 'ldrs/react/Ring.css';

export default function RingLoadingIndicator({ message }: { message?: string }) {
	return (
		<>
			{message && (
				<p style={{ fontStyle: 'italic', color: 'var(--text-accent)', marginBottom: 16 }}>
					{message}
				</p>
			)}
			<Ring size="60" stroke="5" bgOpacity="0.1" speed="2" color="var(--text-accent)" />
		</>
	);
}
