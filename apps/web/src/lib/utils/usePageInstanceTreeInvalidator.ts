import { useChecklistParams } from '@/hooks/useChecklistParams';
import { trpc } from '@/lib/trpc';

export function usePageInstanceTreeInvalidator() {
	const utils = trpc.useUtils();
	const { checklistId = -1, claimId = -1 } = useChecklistParams();

	const invalidateTree = () => {
		utils.page.getPageInstanceTree.invalidate({ checklistId, claimId });
	};

	return invalidateTree;
}
