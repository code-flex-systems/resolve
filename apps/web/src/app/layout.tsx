import { ReactNode } from 'react';
import { Providers } from './Providers';
import './globals.css';

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head />
			<body>
				{/* <AppRouterCacheProvider options={{ enableCssLayer: true }}> */}
				<Providers>{children}</Providers>
				{/* </AppRouterCacheProvider> */}
			</body>
		</html>
	);
}
