'use client';

import { useState, useEffect, useMemo, useRef } from 'react';

interface UsePageTransitionOptions {
	/** Minimum time to show loader (prevents flash) */
	minLoadingTime?: number;
	/** Fade transition duration */
	fadeTimeout?: number;
}

interface UsePageTransitionResult {
	/** Whether to show loading state */
	isLoading: boolean;
	/** Whether content is ready to display */
	isReady: boolean;
	/** Fade timeout for MUI Fade component */
	fadeTimeout: number;
}

/**
 * Hook to coordinate page transitions with data loading.
 * Ensures a minimum loading time to prevent flash on fast loads,
 * and waits for critical data before revealing content.
 *
 * If criticalDataReady is true on initial mount, skips the loading
 * state entirely (useful for DataGrid pages that handle their own loading).
 *
 * @param criticalDataReady - Pass true when all critical data is loaded
 * @param options - Configuration options
 */
export function usePageTransition(
	criticalDataReady: boolean,
	options: UsePageTransitionOptions = {}
): UsePageTransitionResult {
	const { minLoadingTime = 300, fadeTimeout = 500 } = options;

	// Track if data was ready on initial mount - if so, skip loading entirely
	const wasReadyOnMount = useRef(criticalDataReady);
	const [minTimeElapsed, setMinTimeElapsed] = useState(wasReadyOnMount.current);

	// Start minimum loading timer on mount (only if not already ready)
	useEffect(() => {
		if (wasReadyOnMount.current) return; // Skip timer if ready on mount
		const timer = setTimeout(() => setMinTimeElapsed(true), minLoadingTime);
		return () => clearTimeout(timer);
	}, [minLoadingTime]);

	const isReady = useMemo(() => {
		return minTimeElapsed && criticalDataReady;
	}, [minTimeElapsed, criticalDataReady]);

	return {
		isLoading: !isReady,
		isReady,
		fadeTimeout,
	};
}
