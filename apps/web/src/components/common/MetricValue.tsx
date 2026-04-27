import styles from './MetricValue.module.css';

export default function MetricValue({ value, fontSize = 15 }: { value: string | number; fontSize?: number }) {
	return (
		<div className={styles.dot}>
			<span style={{ fontSize, whiteSpace: 'nowrap' }}>
				{value}
			</span>
		</div>
	);
}
