import { useRef } from 'react';

function useDebounce(func: Function, delay: number) {
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

	const debouncedFunction = (...args: any[]) => {
		if (timer.current) {
			clearTimeout(timer.current); // Clear the previous timeout
		}

		timer.current = setTimeout(() => {
			func(...args); // Call the provided function after the delay
		}, delay);
	};

	return debouncedFunction;
}

export default useDebounce;
