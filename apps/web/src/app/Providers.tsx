// app/Providers.tsx
'use client';

import { useState } from 'react';
import { DehydratedState, HydrationBoundary, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import SuperJSON from 'superjson';
import { trpc } from '@/lib/trpc';
import { ClerkProvider } from '@clerk/nextjs';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

export function Providers({ children, state }: { children: React.ReactNode; state?: DehydratedState }) {
	// 1) Create one QueryClient, with your defaults
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						staleTime: 1000 * 60 * 5,
						// cacheTime: 1000 * 60 * 10,
						refetchOnMount: true,
						refetchOnWindowFocus: false,
						refetchOnReconnect: false,
					},
				},
			})
	);

	// 2) Create one tRPC client
	const [trpcClient] = useState(() =>
		trpc.createClient({
			links: [
				httpBatchLink({
					url: '/api/trpc',
					transformer: SuperJSON,
				}),
			],
		})
	);

	return (
		<ClerkProvider>
			<QueryClientProvider client={queryClient}>
				<trpc.Provider client={trpcClient} queryClient={queryClient}>
					<HydrationBoundary state={state}>
						<LocalizationProvider dateAdapter={AdapterDayjs}>
							{children}
						</LocalizationProvider>
					</HydrationBoundary>
				</trpc.Provider>
				{process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
			</QueryClientProvider>
		</ClerkProvider>
	);
}
