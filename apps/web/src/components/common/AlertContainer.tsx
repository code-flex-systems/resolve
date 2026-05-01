'use client';

import { useAlertStore, type AlertSeverity } from '@/stores/useAlertStore';
import { useEffect } from 'react';
import {
	IconCircleCheck,
	IconAlertTriangle,
	IconInfoCircle,
	IconAlertCircle,
	IconX,
} from '@tabler/icons-react';
import css from './AlertContainer.module.css';

const severityClassMap: Record<AlertSeverity, string> = {
	success: css.alertSuccess,
	error: css.alertError,
	warning: css.alertWarning,
	info: css.alertInfo,
};

const severityIconMap: Record<AlertSeverity, React.ReactNode> = {
	success: <IconCircleCheck size={20} />,
	error: <IconAlertCircle size={20} />,
	warning: <IconAlertTriangle size={20} />,
	info: <IconInfoCircle size={20} />,
};

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
		<div className={css.container}>
			{alerts.map((alert) => (
				<div key={alert.id} className={[css.alert, severityClassMap[alert.severity]].join(' ')}>
					<span className={css.alertIcon}>{severityIconMap[alert.severity]}</span>
					<span className={css.alertMessage}>{alert.message}</span>
					<button type="button" className={css.closeButton} onClick={() => hideAlert(alert.id)}>
						<IconX size={16} />
					</button>
				</div>
			))}
		</div>
	);
}
