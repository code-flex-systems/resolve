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
		<span style={{ color, fontWeight: bold ? 600 : 'inherit' }}>
			{children}
		</span>
	);
}
