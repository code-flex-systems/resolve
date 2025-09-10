import theme, { BASE_COLOR_LIGHT } from '@/styles/theme';
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
		outline: `1px solid ${BASE_COLOR_LIGHT}`,
		borderRadius: 2,
	},
};
