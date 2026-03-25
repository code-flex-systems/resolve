'use client';

import { Cardio } from 'ldrs/react';
import 'ldrs/react/Cardio.css';
import styles from './CardioLoadingIndicator.module.css';

interface CardioLoadingIndicatorProps {
	message?: string;
	size?: number;
	stroke?: number;
	speed?: number;
	fullScreen?: boolean;
	showCard?: boolean;
}

export default function CardioLoadingIndicator({
	message,
	size = 50,
	stroke = 4,
	speed = 2,
	fullScreen = false,
	showCard = true,
}: CardioLoadingIndicatorProps) {
	const content = (
		<>
			{message && (
				<p className={styles.message}>
					{message}
				</p>
			)}
			<Cardio size={size.toString()} stroke={stroke.toString()} speed={speed.toString()} color="var(--text-accent)" />
		</>
	);

	const cardContent = showCard ? (
		<div className={styles.card}>
			<div className={styles.center}>
				{content}
			</div>
		</div>
	) : (
		<div className={styles.center}>
			{content}
		</div>
	);

	if (fullScreen) {
		return (
			<div className={styles.fullScreen}>
				{cardContent}
			</div>
		);
	}

	return cardContent;
}
