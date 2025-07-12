'use client';

import { Box, Paper, Typography } from '@mui/material';
import Image from 'next/image';
import { PropsWithChildren } from 'react';
import InsuranceGraphic2 from '@/lib/resources/images/insurance-graphic-2.png';
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
					{/* {showLogo && <Image src={logo} alt="logo" height={30} />} */}
					<div style={{ width: '100%', height: 50 }} className="flex-row-center">
						<Typography fontSize={showLogo ? 25 : 20} marginLeft="10px" color="primary">
							{title}
						</Typography>
					</div>
					{children}
				</Paper>
				<Box position="absolute" bottom={-5} right={0}>
					<Image src={InsuranceGraphic2} alt="insurance-sign" height={300} />
				</Box>
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
		position: 'absolute' as const,
		zIndex: 10,
	},
	paper: {
		width: '100vw',
		height: '100vh',
		background: 'linear-gradient(180deg, rgb(33, 106, 196), rgba(33, 106, 196, 0.8))',
		display: 'flex',
		flexDirection: 'column' as const,
		justifyContent: 'center',
		alignItems: 'center',
		borderRadius: 0,
		position: 'relative' as const,
	},
};
