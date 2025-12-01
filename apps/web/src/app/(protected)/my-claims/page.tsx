import { Suspense } from 'react';
import PageWrapper from '@/components/common/PageWrapper';
import MyClaims from '@/components/my-claims/MyClaims';
import { CircularProgress, Box } from '@mui/material';

export default function MyClaimsPage() {
	return (
		<PageWrapper>
			<Suspense
				fallback={
					<Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
						<CircularProgress />
					</Box>
				}
			>
				<MyClaims />
			</Suspense>
		</PageWrapper>
	);
}
