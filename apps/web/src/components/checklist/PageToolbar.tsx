'use client';
import { Button, Collapse, Divider } from '@mui/material';
import { useChecklistSlice } from '@/state/store';
import { ChecklistMode } from '@/config/enums';

export default function PageToolbar() {
	const mode = useChecklistSlice((state) => state.mode);
	return (
		<Collapse style={{ width: '100%', height: 45 }} in={mode === ChecklistMode.VIEW}>
			<div style={{ width: '100%', height: 45, minHeight: 45, maxHeight: 45 }}>
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
				<div style={styles.divider}>
					<Divider />
				</div>
			</div>
		</Collapse>
	);
}

const styles = {
	button: {
		height: 30,
		margin: 5,
	},
	container: {
		width: '100%',
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
