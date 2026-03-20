import { IconLogout } from '@tabler/icons-react';
import styles from './MetricAction.module.css';

export default function MetricAction({
	action,
	actionText,
	actionValue,
	color,
	loading = false,
}: {
	action: () => void;
	actionText: string;
	actionValue: string;
	color: string;
	loading?: boolean;
}) {
	return (
		<div className={styles.container}>
			{loading ? (
				<>
					<div className={styles.skeleton} style={{ width: 130, height: 5 }} />
					<div className={styles.skeleton} style={{ width: 100, height: 5, marginTop: 5 }} />
					<div className={styles.skeleton} style={{ width: 50, height: 5, marginTop: 5 }} />
				</>
			) : (
				<>
					<a className={styles.link} onClick={action} style={{ fontSize: 15, color }}>
						{actionText}
						<br />({actionValue})
					</a>
					<IconLogout size={20} style={{ color, marginTop: 5 }} />
				</>
			)}
		</div>
	);
}
