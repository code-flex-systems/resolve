import { BORDER_COLOR, BORDER_LIGHT, BG_TERTIARY, TEXT_MUTED } from '@/styles/theme';
import { IconButton, IconButtonProps } from '@mui/material';

export default function BasicIconButton(props: IconButtonProps) {
	return (
		<IconButton {...props} sx={styles.icon}>
			{props.children}
		</IconButton>
	);
}

const styles = {
	icon: {
		bgcolor: 'white',
		outline: `1px solid ${BORDER_COLOR}`,
		borderRadius: 2,
		'&.Mui-disabled': {
			bgcolor: BG_TERTIARY,
			outline: `1px solid ${BORDER_LIGHT}`,
			color: TEXT_MUTED,
		},
	},
};
