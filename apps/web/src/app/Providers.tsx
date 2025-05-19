'use client';

import { ReactNode, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import theme from '@/styles/theme';
import { TrpcProvider } from '@/lib/TrpcProvider';

export function Providers({ children }: { children: ReactNode }) {
	const [queryClient] = useState(() => new QueryClient());

	return (
		<QueryClientProvider client={queryClient}>
			<ThemeProvider theme={theme}>
				<TrpcProvider>{children}</TrpcProvider>
			</ThemeProvider>
		</QueryClientProvider>
	);
}
