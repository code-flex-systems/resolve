import { useSessionContext } from '@/app/(protected)/SessionProvider';

export default function useIsSuperAdmin() {
	const { isSuperAdmin } = useSessionContext();
	return isSuperAdmin;
}
