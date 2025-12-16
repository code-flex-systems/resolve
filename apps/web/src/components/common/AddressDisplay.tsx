'use client';

import { Typography, Stack } from '@mui/material';
import {
	formatAddressInline,
	formatAddressMultiline,
	formatCityState,
	hasAddressData,
	type Address,
} from '@/schemas/addressSchemas';

interface AddressDisplayProps {
	/**
	 * Address data to display. Can be partial.
	 */
	address: Partial<Address> | null | undefined;
	/**
	 * Display mode: 'inline' shows on single line, 'multiline' shows on multiple lines.
	 */
	mode?: 'inline' | 'multiline';
	/**
	 * Text to show when no address data is present.
	 */
	emptyText?: string;
	/**
	 * Typography variant for the text.
	 */
	variant?: 'body1' | 'body2' | 'caption';
	/**
	 * Font size override.
	 */
	fontSize?: number;
	/**
	 * Text color.
	 */
	color?: string;
}

/**
 * Display component for formatted addresses.
 * Supports both inline (single-line) and multiline display modes.
 */
export default function AddressDisplay({
	address,
	mode = 'inline',
	emptyText = '',
	variant = 'body2',
	fontSize,
	color,
}: AddressDisplayProps) {
	if (!hasAddressData(address)) {
		if (!emptyText) return null;
		return (
			<Typography
				variant={variant}
				fontSize={fontSize}
				color={color || 'text.secondary'}
			>
				{emptyText}
			</Typography>
		);
	}

	if (mode === 'inline') {
		return (
			<Typography variant={variant} fontSize={fontSize} color={color}>
				{formatAddressInline(address)}
			</Typography>
		);
	}

	// Multiline mode
	const lines = formatAddressMultiline(address);

	return (
		<Stack spacing={0}>
			{lines.map((line, index) => (
				<Typography
					key={index}
					variant={variant}
					fontSize={fontSize}
					color={color}
				>
					{line}
				</Typography>
			))}
		</Stack>
	);
}

/**
 * Compact display for city and state only.
 */
export function CityStateDisplay({
	city,
	state,
	emptyText = '',
	fontSize = 13,
	color,
}: {
	city?: string | null;
	state?: string | null;
	emptyText?: string;
	fontSize?: number;
	color?: string;
}) {
	const text = formatCityState(city, state);

	if (!text) {
		if (!emptyText) return null;
		return (
			<Typography fontSize={fontSize} color={color || 'text.secondary'}>
				{emptyText}
			</Typography>
		);
	}

	return (
		<Typography fontSize={fontSize} color={color}>
			{text}
		</Typography>
	);
}
