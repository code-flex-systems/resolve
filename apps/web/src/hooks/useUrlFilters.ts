'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';

/**
 * Custom hook for managing filters via URL search params
 * Provides type-safe reading and writing of URL parameters
 *
 * @example
 * const { getParam, setParam, removeParam, clearParams } = useUrlFilters();
 *
 * // Read a param
 * const search = getParam('search');
 *
 * // Set a param
 * setParam('search', 'foo');
 *
 * // Remove a param
 * removeParam('search');
 *
 * // Clear all params (except those in keepParams)
 * clearParams(['selected']); // Keep 'selected' param
 */
export function useUrlFilters() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();

	/**
	 * Get a parameter value from the URL
	 */
	const getParam = useCallback(
		(key: string): string | null => {
			return searchParams.get(key);
		},
		[searchParams]
	);

	/**
	 * Get a boolean parameter from the URL
	 */
	const getBoolParam = useCallback(
		(key: string): boolean => {
			const value = searchParams.get(key);
			return value === 'true' || value === '1';
		},
		[searchParams]
	);

	/**
	 * Set a parameter in the URL
	 */
	const setParam = useCallback(
		(key: string, value: string | boolean | null | undefined) => {
			const params = new URLSearchParams(searchParams.toString());

			if (value === null || value === undefined || value === '') {
				params.delete(key);
			} else if (typeof value === 'boolean') {
				if (value) {
					params.set(key, 'true');
				} else {
					params.delete(key);
				}
			} else {
				params.set(key, value);
			}

			const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
			router.push(newUrl);
		},
		[searchParams, pathname, router]
	);

	/**
	 * Set multiple parameters at once
	 */
	const setParams = useCallback(
		(updates: Record<string, string | null | undefined | boolean>) => {
			const params = new URLSearchParams(searchParams.toString());

			Object.entries(updates).forEach(([key, value]) => {
				if (value === null || value === undefined || value === '') {
					params.delete(key);
				} else if (typeof value === 'boolean') {
					if (value) {
						params.set(key, 'true');
					} else {
						params.delete(key);
					}
				} else {
					params.set(key, value);
				}
			});

			const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
			router.push(newUrl);
		},
		[searchParams, pathname, router]
	);

	/**
	 * Remove a parameter from the URL
	 */
	const removeParam = useCallback(
		(key: string) => {
			const params = new URLSearchParams(searchParams.toString());
			params.delete(key);

			const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
			router.push(newUrl);
		},
		[searchParams, pathname, router]
	);

	/**
	 * Clear all parameters except those specified in keepParams
	 */
	const clearParams = useCallback(
		(keepParams: string[] = []) => {
			const params = new URLSearchParams();

			// Keep specified params
			keepParams.forEach((key) => {
				const value = searchParams.get(key);
				if (value) {
					params.set(key, value);
				}
			});

			const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
			router.push(newUrl);
		},
		[searchParams, pathname, router]
	);

	return {
		getParam,
		getBoolParam,
		setParam,
		setParams,
		removeParam,
		clearParams,
		searchParams,
	};
}

/**
 * Hook for managing a single URL param with local state
 * Useful for controlled inputs that sync with URL
 *
 * @example
 * const [search, setSearch] = useUrlParam('search');
 */
export function useUrlParam(key: string, defaultValue: string = ''): [string, (value: string) => void] {
	const { getParam, setParam } = useUrlFilters();
	const [localValue, setLocalValue] = useState(() => getParam(key) ?? defaultValue);

	// Sync local state with URL on mount and when URL changes
	useEffect(() => {
		const urlValue = getParam(key);
		setLocalValue(urlValue ?? defaultValue);
	}, [getParam, key, defaultValue]);

	const setValue = useCallback(
		(value: string) => {
			setLocalValue(value);
			setParam(key, value);
		},
		[key, setParam]
	);

	return [localValue, setValue];
}
