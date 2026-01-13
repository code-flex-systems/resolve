import { useSessionContext } from '@/app/(protected)/SessionProvider';
import { useChecklistTrpc } from './trpc/useChecklistTrpc';
import { useChecklistParams } from './useChecklistParams';
import useIsAdmin from './useIsAdmin';
import useIsSuperAdmin from './useIsSuperAdmin';

export default function useIsAssigned(includeOwner?: boolean) {
	const { session } = useSessionContext();
	const isAdmin = useIsAdmin();
	const isSuperAdmin = useIsSuperAdmin();
	const { checklistId = -1, claimId = -1 } = useChecklistParams();
	const { data: checklistClaim } = useChecklistTrpc().getForClaim(
		{ checklistId, claimId },
		{ enabled: checklistId !== -1 && claimId !== -1 }
	);
	if (!checklistClaim || !session?.user.id) return false;
	const allowedUsers: string[] = [checklistClaim.assignee];
	if (includeOwner) allowedUsers.push(checklistClaim.created_by);
	return isAdmin || isSuperAdmin || allowedUsers.includes(session.user.id);
}
