'use client';

import { Alert, Slide, Snackbar, Stack } from '@mui/material';
import { useAlertStore } from '@/stores/useAlertStore';
import { useEffect } from 'react';

export default function AlertContainer() {
	const alerts = useAlertStore((state) => state.alerts);
	const hideAlert = useAlertStore((state) => state.hideAlert);

	// Auto-hide alerts with autoHide flag after 5 seconds
	useEffect(() => {
		const timers: NodeJS.Timeout[] = [];

		alerts.forEach((alert) => {
			if (alert.autoHide) {
				const timer = setTimeout(() => {
					hideAlert(alert.id);
				}, 5000);
				timers.push(timer);
			}
		});

		return () => {
			timers.forEach((timer) => clearTimeout(timer));
		};
	}, [alerts, hideAlert]);

	return (
		<Stack
			spacing={1}
			sx={{
				position: 'fixed',
				bottom: 20,
				left: 20,
				zIndex: 9999,
				maxWidth: 400,
			}}
		>
			{alerts.map((alert) => (
				<Slide key={alert.id} direction="up" in={true} mountOnEnter unmountOnExit>
					<Alert
						severity={alert.severity}
						onClose={() => hideAlert(alert.id)}
						sx={{
							boxShadow: 3,
							'& .MuiAlert-message': {
								fontSize: 14,
							},
						}}
					>
						{alert.message}
					</Alert>
				</Slide>
			))}
		</Stack>
	);
}
