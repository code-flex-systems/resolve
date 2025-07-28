'use client';

import React, { useEffect, useRef } from 'react';
import { Typography } from '@mui/material';

export interface AnimatedCounterProps {
	value: number;
	duration?: number;
	fontSize?: number;
	formatter?: (val: number) => string;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
	value,
	duration = 1000,
	fontSize = 25,
	formatter,
}) => {
	const [count, setCount] = React.useState(0);
	const requestRef = useRef<number>(null);
	const startTimeRef = useRef<number>(null);

	useEffect(() => {
		startTimeRef.current = null;

		const step = (timestamp: number) => {
			if (startTimeRef.current === null) {
				startTimeRef.current = timestamp;
			}
			const elapsed = timestamp - (startTimeRef.current ?? 0);
			const progress = Math.min(elapsed / duration, 1);
			const currentValue = Math.floor(progress * value);
			setCount(currentValue);

			if (progress < 1) {
				requestRef.current = requestAnimationFrame(step);
			}
		};

		requestRef.current = requestAnimationFrame(step);

		return () => {
			if (requestRef.current) {
				cancelAnimationFrame(requestRef.current);
			}
		};
	}, [value, duration]);

	const display = formatter ? formatter(count) : count;

	return (
		<Typography fontSize={fontSize} lineHeight={`${fontSize}px`}>
			{display}
		</Typography>
	);
};
