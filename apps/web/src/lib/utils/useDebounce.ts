import { useCallback, useRef } from 'react';

function useDebounce<T extends (...args: any[]) => any>(func: T, delay: number): T {
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const funcRef = useRef(func);

	// Keep the function ref updated
	funcRef.current = func;

	const debouncedFunction = useCallback(
		(...args: Parameters<T>) => {
			if (timer.current) {
				clearTimeout(timer.current);
			}

			timer.current = setTimeout(() => {
				funcRef.current(...args);
			}, delay);
		},
		[delay]
	) as T;

	return debouncedFunction;
}

export default useDebounce;
