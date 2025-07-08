import WobbleLoadingIndicator from '@/components/common/WobbleLoadingIndicator';
import { Stack } from '@mui/material';

export default function LoadingPage() {
	return (
		<Stack width="100%" height="100%" display="flex" justifyContent="center" alignItems="center">
			<WobbleLoadingIndicator />
		</Stack>
	);
}
