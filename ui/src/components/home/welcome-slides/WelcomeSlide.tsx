import { Fade, Typography } from '@mui/material';
import { useEffect, useReducer } from 'react';
import config from '../../../config/config';
import LinearTextCollapse from '../../common/LinearTextCollapse';
import BasicButton from '../../common/BasicButton';

export default function WelcomeSlide() {
	const [state, setState] = useReducer((prevState: Record<string, boolean>, newState: Record<string, boolean>) => {
		return { ...prevState, ...newState };
	}, {});

	useEffect(() => {
		setTimeout(() => setState({ p1: true }), 500);
		setTimeout(() => setState({ p2: true }), 1000);
		setTimeout(() => setState({ p3: true }), 2000);
		setTimeout(() => setState({ p4: true }), 3000);
		setTimeout(() => setState({ p5: true }), 4500);
		setTimeout(() => setState({ b1: true }), 6000);
		return () => setState({});
	}, []);

	return (
		<div style={styles.container}>
			<div>
				<Fade key='p1' in={Boolean(state.p1)} timeout={500}>
					<Typography fontSize={19} fontWeight='bold' noWrap>
						Welcome to {config.APP_NAME}!
					</Typography>
				</Fade>
				<div style={styles.body}>
					<LinearTextCollapse key='p2' show={Boolean(state.p2)}>
						{config.APP_NAME} helps you manage all your properties in one place:
					</LinearTextCollapse>
					<div style={styles.list}>
						<LinearTextCollapse key='p3' show={Boolean(state.p3)}>
							<li style={styles.li}>Add properties with location and lease information</li>
						</LinearTextCollapse>
						<LinearTextCollapse key='p4' show={Boolean(state.p4)} timeout={1500}>
							<li style={styles.li}>Record the revenue and expenses for each property and generate statements</li>
						</LinearTextCollapse>
						<LinearTextCollapse key='p5' show={Boolean(state.p5)} timeout={1500}>
							<li style={styles.li}>Group related properties into portfolios for roll-up statements and reports</li>
						</LinearTextCollapse>
					</div>
				</div>
			</div>
			<div style={styles.gutter}>
				<Fade key='b1' in={Boolean(state.b1)} timeout={500}>
					<span>
						<BasicButton
							buttonProps={{
								onClick: () => { },
								variant: 'contained'
							}}
						>
							Next
						</BasicButton>
					</span>
				</Fade>
			</div>
		</div>
	);
}

const styles = {
	body: {
		marginTop: 10
	},
	container: {
		width: '100%',
		height: '100%',
		display: 'flex',
		flexDirection: 'column' as const,
		justifyContent: 'space-between',
		alignItems: 'flex-start'
	},
	gutter: {
		width: '100%',
		display: 'flex',
		justifyContent: 'flex-end',
		alignItems: 'center'
	},
	list: {
		marginTop: 5
	},
	li: {
		marginLeft: 10
	}
};