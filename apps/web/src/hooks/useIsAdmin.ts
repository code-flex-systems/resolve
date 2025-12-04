import config from '@/config/config';
import { useClerkSession } from '@/lib/auth/use-clerk-session';

export default function useIsAdmin() {
	const { data: session } = useClerkSession();
	return session?.user?.role === config.ROLES.ADMIN;
}
