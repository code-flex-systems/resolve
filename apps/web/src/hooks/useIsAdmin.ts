import config from '@/config/config';
import { useSession } from 'next-auth/react';

export default function useIsAdmin() {
	const { data: session } = useSession();
	return session?.user?.role === config.ROLES.ADMIN;
}
