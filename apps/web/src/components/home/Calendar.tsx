import { Paper } from '@mui/material';
import { DateCalendar } from '@mui/x-date-pickers-pro';

export default function Calendar() {
	return (
		<Paper elevation={0} sx={styles.container}>
			<DateCalendar />
		</Paper>
	);
}

const styles = {
	container: {
		width: 400,
		minWidth: 400,
		height: 375,
		padding: '10px 20px',
		overflow: 'hidden',
		borderRadius: 4,
		margin: '15px',
	},
};
