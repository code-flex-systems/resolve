import { useSessionContext } from '@/app/(protected)/SessionProvider';

export default function useIsAdmin() {
	const { isAdmin } = useSessionContext();
	return isAdmin;
}
