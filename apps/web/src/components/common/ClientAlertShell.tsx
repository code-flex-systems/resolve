'use client';

import AlertContainer from '@/components/common/AlertContainer';

export default function ClientAlertShell({ children }: { children: React.ReactNode }) {
	return (
		<>
			<AlertContainer />
			{children}
		</>
	);
}
