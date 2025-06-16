import { useRef } from 'react';

function useDebounce(func: Function, delay: number) {
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

	const debouncedFunction = (...args: any[]) => {
		if (timer.current) {
			clearTimeout(timer.current);
		}

		timer.current = setTimeout(() => {
			func(...args);
		}, delay);
	};

	return debouncedFunction;
}

export default useDebounce;
