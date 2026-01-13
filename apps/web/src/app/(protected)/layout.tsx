import ClientAlertShell from '@/components/common/ClientAlertShell';
import { SessionProvider } from './SessionProvider';
import { getProtectedSession } from './get-session';

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
	const { session, isAdmin, isSuperAdmin } = await getProtectedSession();

	// Clerk handles password reset flows automatically
	return (
		<SessionProvider session={session} isAdmin={isAdmin} isSuperAdmin={isSuperAdmin}>
			<ClientAlertShell>{children}</ClientAlertShell>
		</SessionProvider>
	);
}
