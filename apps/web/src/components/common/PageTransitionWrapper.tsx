'use client';

import { Box, Fade } from '@mui/material';
import { ReactNode } from 'react';
import CardioLoadingIndicator from './CardioLoadingIndicator';
import { usePageTransition } from '@/hooks/usePageTransition';

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
		<Box width="100%" height="100%" position="relative">
			{/* Loading State */}
			<Fade in={isLoading} timeout={fadeTimeout} unmountOnExit>
				<Box
					width="100%"
					height="100%"
					display="flex"
					flexDirection="column"
					justifyContent="center"
					alignItems="center"
					position="absolute"
					top={0}
					left={0}
					zIndex={1}
				>
					{loadingComponent ?? <CardioLoadingIndicator message={loadingMessage} />}
				</Box>
			</Fade>

			{/* Content */}
			<Fade in={isReady} timeout={fadeTimeout}>
				<Box width="100%" height="100%" display="flex" flexDirection="column">
					{children}
				</Box>
			</Fade>
		</Box>
	);
}
