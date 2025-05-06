import { Button, Collapse, Divider } from '@mui/material';
import { useChecklistSlice } from '../../state/store';
import { ChecklistMode } from '../../config/enums';

export default function PageToolbar() {
	const mode = useChecklistSlice((state) => state.mode);
	return (
		<>
			<Collapse style={styles.container} in={mode === ChecklistMode.VIEW} unmountOnExit>
				<div style={styles.container}>
					<Button color="secondary" style={styles.button}>
						Summary
					</Button>
					<Button color="secondary" style={styles.button}>
						Results
					</Button>
					<Button color="secondary" style={styles.button}>
						Unknowns
					</Button>
					<Button color="secondary" style={styles.button}>
						Incompletes
					</Button>
					<Button color="secondary" style={styles.button}>
						Evaluation
					</Button>
				</div>
			</Collapse>
			{mode === ChecklistMode.VIEW && (
				<div style={styles.divider}>
					<Divider />
				</div>
			)}
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
