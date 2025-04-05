import { Paper } from '@mui/material';
import theme from '../../styles/theme';

export default function HomeNavCard() {
	return (
		<Paper elevation={0} style={styles.paper}>

		</Paper>
	);
}

const styles = {
	paper: {
		width: 500,
		height: 300,
		outline: `1px solid ${theme.palette.primary.main}`
	}
};