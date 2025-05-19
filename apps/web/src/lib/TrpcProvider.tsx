// apps/web/src/lib/TrpcProvider.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { trpc, trpcClient } from './trpc';
import { ReactNode, useState } from 'react';

export function TrpcProvider({ children }: { children: ReactNode }) {
	const [queryClient] = useState(() => new QueryClient());
	const [client] = useState(() => trpcClient);

	return (
		<trpc.Provider client={client} queryClient={queryClient}>
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		</trpc.Provider>
	);
}
