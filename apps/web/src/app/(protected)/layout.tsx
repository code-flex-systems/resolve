import ClientAlertShell from '@/components/common/ClientAlertShell';
import { SessionProvider } from './SessionProvider';
import { getProtectedSession } from './get-session';
import { BreadcrumbProvider } from '@/components/common/BreadcrumbContext';

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
	const { session, isAdmin, isSuperAdmin } = await getProtectedSession();

	return (
		<SessionProvider session={session} isAdmin={isAdmin} isSuperAdmin={isSuperAdmin}>
			<BreadcrumbProvider>
				<ClientAlertShell>{children}</ClientAlertShell>
			</BreadcrumbProvider>
		</SessionProvider>
	);
}
