'use client';

import { formatPhoneDisplay } from '@/lib/utils/utils';

export default function PhoneCell({
	value,
}: {
	value: string | null | undefined;
	verified?: boolean;
	disabled?: boolean;
}) {
	const formatted = formatPhoneDisplay(value);
	if (!formatted) {
		return <span style={{ color: 'var(--text-muted)' }}>—</span>;
	}
	return <span>{formatted}</span>;
}
