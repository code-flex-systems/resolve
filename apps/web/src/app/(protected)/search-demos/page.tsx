'use client';

import { Box, Container, Divider, Stack, Typography } from '@mui/material';
import HomeSearchOptionA from '@/components/home/HomeSearchOptionA';
import HomeSearchOptionB from '@/components/home/HomeSearchOptionB';
import HomeSearchOptionC from '@/components/home/HomeSearchOptionC';

/**
 * Demo page showing 3 HomeSearch mockup options
 * Navigate to /search-demos to view
 */
export default function SearchDemosPage() {
	return (
		<Container maxWidth="xl" sx={{ py: 4, backgroundColor: '#F7F8FA', minHeight: '100vh' }}>
			<Stack spacing={6}>
				{/* Page Header */}
				<Box textAlign="center">
					<Typography variant="h4" fontWeight={700} color="primary" mb={1}>
						HomeSearch Design Options
					</Typography>
					<Typography variant="body1" color="text.secondary">
						Choose your preferred design direction for the investor demo
					</Typography>
				</Box>

				{/* Option A: Hero Search */}
				<Box>
					<Stack spacing={2}>
						<Box>
							<Typography variant="h5" fontWeight={600} mb={0.5}>
								Option A: Hero Search (Full-Width)
							</Typography>
							<Typography variant="body2" color="text.secondary" mb={1}>
								<strong>Pros:</strong> Most visually impressive, hero treatment, clean and bold
							</Typography>
							<Typography variant="body2" color="text.secondary">
								<strong>Cons:</strong> More development effort, changes UX flow (combined search)
							</Typography>
						</Box>
						<HomeSearchOptionA />
					</Stack>
				</Box>

				<Divider sx={{ my: 2 }} />

				{/* Option B: Dual-Column Modern */}
				<Box>
					<Stack spacing={2}>
						<Box>
							<Typography variant="h5" fontWeight={600} mb={0.5}>
								Option B: Dual-Column Modern
							</Typography>
							<Typography variant="body2" color="text.secondary" mb={1}>
								<strong>Pros:</strong> Keeps familiar UX, easier to implement, clear workflow
							</Typography>
							<Typography variant="body2" color="text.secondary">
								<strong>Cons:</strong> Less dramatic visual change, still two-step process
							</Typography>
						</Box>
						<HomeSearchOptionB />
					</Stack>
				</Box>

				<Divider sx={{ my: 2 }} />

				{/* Option C: Card-Based Selection */}
				<Box>
					<Stack spacing={2}>
						<Box>
							<Typography variant="h5" fontWeight={600} mb={0.5}>
								Option C: Card-Based Selection
							</Typography>
							<Typography variant="body2" color="text.secondary" mb={1}>
								<strong>Pros:</strong> Very clean, modern, unique UX, great whitespace
							</Typography>
							<Typography variant="body2" color="text.secondary">
								<strong>Cons:</strong> Requires modal/dialog for search (more complexity)
							</Typography>
						</Box>
						<HomeSearchOptionC />
					</Stack>
				</Box>

				{/* Footer Note */}
				<Box textAlign="center" pt={4}>
					<Typography variant="caption" color="text.disabled">
						These are visual mockups. The actual search functionality will be integrated once a design is selected.
					</Typography>
				</Box>
			</Stack>
		</Container>
	);
}
