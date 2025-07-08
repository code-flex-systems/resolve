'use client';

import { Paper, Typography } from '@mui/material';
import Image from 'next/image';
import { PropsWithChildren } from 'react';
import logo from '@/lib/resources/images/ChecklistLogo.png';
import theme from '@/styles/theme';

export default function AuthPageWrapper({
	title,
	showLogo,
	children,
}: PropsWithChildren & { title: string; showLogo?: boolean }) {
	return (
		<div style={styles.container}>
			<Paper elevation={0} style={styles.paper}>
				<Paper style={styles.innerPaper}>
					{showLogo && <Image src={logo} alt="logo" height={30} />}
					<div style={{ width: '100%', height: 50 }} className="flex-row-center">
						<Typography fontSize={showLogo ? 25 : 20} marginLeft="10px" color="primary">
							{title}
						</Typography>
					</div>
					{children}
				</Paper>
			</Paper>
		</div>
	);
}

const styles = {
	container: {
		width: '100vw',
		height: '100vh',
	},
	innerPaper: {
		width: 600,
		height: 'fit-content',
		minHeight: 200,
		display: 'flex',
		flexDirection: 'column' as const,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
	},
	paper: {
		width: '100vw',
		height: '100vh',
		backgroundColor: theme.palette.primary.main,
		display: 'flex',
		flexDirection: 'column' as const,
		justifyContent: 'center',
		alignItems: 'center',
		borderRadius: 0,
	},
};
