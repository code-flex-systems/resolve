import { SignUp } from '@clerk/nextjs';
import { Box } from '@mui/material';

export default function SignUpPage() {
	return (
		<Box
			sx={{
				display: 'flex',
				justifyContent: 'center',
				alignItems: 'center',
				minHeight: '100vh',
				backgroundColor: '#f5f5f5',
			}}
		>
			<SignUp />
		</Box>
	);
}
