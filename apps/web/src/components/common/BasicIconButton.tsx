import { BORDER_COLOR, BORDER_LIGHT, BG_TERTIARY, TEXT_MUTED } from '@/styles/theme';
import { IconButton, IconButtonProps } from '@mui/material';

interface BasicIconButtonProps extends IconButtonProps {
	compact?: boolean;
}

export default function BasicIconButton({ compact, ...props }: BasicIconButtonProps) {
	return (
		<IconButton
			{...props}
			sx={{
				...styles.icon,
				...(compact && styles.compact),
				...props.sx,
			}}
		>
			{props.children}
		</IconButton>
	);
}

const styles = {
	icon: {
		bgcolor: '#ffffff',
		border: `1px solid ${BORDER_COLOR}`,
		'&.Mui-disabled': {
			bgcolor: BG_TERTIARY,
			borderColor: BORDER_LIGHT,
			color: TEXT_MUTED,
		},
	},
	compact: {
		padding: '4px',
		'& .MuiSvgIcon-root': {
			fontSize: 18,
		},
	},
};
