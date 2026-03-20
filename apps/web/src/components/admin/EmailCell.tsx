'use client';

import { useState } from 'react';
import { IconCopy, IconCheck } from '@tabler/icons-react';
import Button from '@/components/ui/Button';

export default function EmailCell({ value }: { value: string | null | undefined }) {
	const [copied, setCopied] = useState(false);

	if (!value) {
		return <span style={{ color: 'var(--text-muted)' }}>—</span>;
	}

	const handleCopy = (e: React.MouseEvent) => {
		e.stopPropagation();
		navigator.clipboard.writeText(value).then(() => {
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		});
	};

	return (
		<span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
			<Button variant="icon" size="sm" onClick={handleCopy} color="neutral">
				{copied ? <IconCheck size={13} stroke={1.5} /> : <IconCopy size={13} stroke={1.5} />}
			</Button>
			<span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
				{value.toLowerCase()}
			</span>
		</span>
	);
}
