'use client';

import { ReactNode } from 'react';
import CardioLoadingIndicator from './CardioLoadingIndicator';
import { usePageTransition } from '@/hooks/usePageTransition';
import styles from './PageTransitionWrapper.module.css';

interface PageTransitionWrapperProps {
	/** Is critical data loaded? */
	criticalDataReady: boolean;
	/** Loading message to display */
	loadingMessage?: string;
	/** Children to render when ready */
	children: ReactNode;
	/** Minimum loading time in ms */
	minLoadingTime?: number;
	/** Fade transition duration in ms */
	fadeTimeout?: number;
	/** Custom loading component */
	loadingComponent?: ReactNode;
}

/**
 * Wrapper component that handles loading/content transitions.
 * Shows a Cardio loader during loading state, then fades to content.
 *
 * For DataGrid-based pages, set criticalDataReady={true} to show the
 * grid immediately and let it handle its own loading state.
 */
export default function PageTransitionWrapper({
	criticalDataReady,
	loadingMessage = 'Loading...',
	children,
	minLoadingTime = 1000,
	fadeTimeout = 1000,
	loadingComponent,
}: PageTransitionWrapperProps) {
	const { isLoading, isReady } = usePageTransition(criticalDataReady, {
		minLoadingTime,
		fadeTimeout,
	});

	return (
		<div className={styles.wrapper} style={{ '--fade-timeout': `${fadeTimeout}ms` } as React.CSSProperties}>
			{/* Loading State */}
			<div className={`${styles.loading} ${isLoading ? styles.loadingVisible : ''}`}>
				{loadingComponent ?? <CardioLoadingIndicator message={loadingMessage} />}
			</div>

			{/* Content */}
			<div className={`${styles.content} ${isReady ? styles.contentVisible : ''}`}>
				{children}
			</div>
		</div>
	);
}
