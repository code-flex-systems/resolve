'use client';

import { useState, useCallback, useEffect } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'manifest-theme';

function getInitialTheme(): Theme {
	if (typeof window === 'undefined') return 'light';
	const stored = localStorage.getItem(STORAGE_KEY);
	if (stored === 'dark') return 'dark';
	return 'light';
}

/**
 * Theme switching hook.
 *
 * Sets `data-theme` attribute on <html> for CSS custom property switching.
 * Persists preference to localStorage.
 */
export function useTheme() {
	const [theme, setThemeState] = useState<Theme>(getInitialTheme);

	// Sync the data-theme attribute on mount and when theme changes
	useEffect(() => {
		document.documentElement.dataset.theme = theme;
	}, [theme]);

	const setTheme = useCallback((t: Theme) => {
		localStorage.setItem(STORAGE_KEY, t);
		setThemeState(t);
	}, []);

	const toggleTheme = useCallback(() => {
		setThemeState((prev) => {
			const next = prev === 'light' ? 'dark' : 'light';
			localStorage.setItem(STORAGE_KEY, next);
			return next;
		});
	}, []);

	return { theme, setTheme, toggleTheme };
}
