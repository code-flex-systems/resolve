import { Button, Divider } from '@mui/material';

export default function PageToolbar() {
	return (
		<>
			<div style={styles.container}>
				<Button style={styles.button}>Summary</Button>
				<Button style={styles.button}>Results</Button>
				<Button style={styles.button}>Unknowns</Button>
				<Button style={styles.button}>Incompletes</Button>
				<Button style={styles.button}>Evaluation</Button>
			</div>
			<div style={styles.divider}>
				<Divider />
			</div>
		</>
	);
}

const styles = {
	button: {
		margin: 5,
	},
	container: {
		width: '100%',
		height: 50,
		display: 'flex',
		justifyContent: 'center',
		alignItems: 'center',
	},
	divider: {
		width: '100%',
		height: 1,
		margin: '5px 0px',
	},
};
