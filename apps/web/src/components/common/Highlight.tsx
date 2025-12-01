import { Box } from '@mui/material';

interface HighlightProps {
	children: React.ReactNode;
	color?: string;
	bold?: boolean;
}

/**
 * Shared component for highlighting text with color and/or bold weight.
 * Used throughout the application for emphasizing keywords in sentence-form text.
 */
export default function Highlight({ children, color = '', bold = true }: HighlightProps) {
	return (
		<Box component="span" sx={{ color, fontWeight: bold ? 600 : 'inherit' }}>
			{children}
		</Box>
	);
}
