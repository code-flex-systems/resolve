import { useAdminSlice } from '@/state/store';
import Claims from './Claims';
import Feeds from './Feeds';
import NewClaimDialog from './NewClaimDialog';
import { CSVImportWizard } from '../common/CSV-wizard/CSVWizard';
import { toggleImportClaimsDialog } from '@/state/admin/actions';
import config from '@/config/config';
import { createClaimInput } from '@/schemas/claimSchemas';
import { useClaimTrpc } from '@/hooks/trpc/useClaimTrpc';

export default function FeedsAndClaimsTab() {
	const showImportClaimsDialog = useAdminSlice((state) => state.showImportClaimsDialog);
	const showNewClaimDialog = useAdminSlice((state) => state.showNewClaimDialog);
	const { mutateAsync: createClaims, isPending } = useClaimTrpc().createMany;

	return (
		<div style={styles.container} className="flex-row-between">
			<Feeds />
			<Claims />
			{showImportClaimsDialog && (
				<CSVImportWizard
					fields={config.CLAIM_FIELDS.map((f) => ({ ...f, required: true }))}
					validateRow={(row: any) => createClaimInput.safeParse({ claims: [row] })}
					onSubmit={(claims) => createClaims({ claims })}
					submitting={isPending}
					onClose={toggleImportClaimsDialog}
				/>
			)}
			{showNewClaimDialog && <NewClaimDialog />}
		</div>
	);
}

const styles = {
	container: {
		width: '100%',
		height: 'calc(100vh - 135px)',
	},
};
