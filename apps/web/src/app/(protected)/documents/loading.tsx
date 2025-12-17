import CardioLoadingIndicator from '@/components/common/CardioLoadingIndicator';
import { Stack } from '@mui/material';

export default function LoadingPage() {
	return (
		<Stack width="100%" height="100%" display="flex" justifyContent="center" alignItems="center">
			<CardioLoadingIndicator message="Loading..." />
		</Stack>
	);
}
