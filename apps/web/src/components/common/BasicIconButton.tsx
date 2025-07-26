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
		outline: `1px solid #D9D9D9`,
		borderRadius: 2,
	},
};
