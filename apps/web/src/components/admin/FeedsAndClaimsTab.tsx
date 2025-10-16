'use client';

import { useAdminStore } from '@/stores/useAdminStore';
import Claims from './Claims';
import Feeds from './Feeds';
import NewClaimDialog from './NewClaimDialog';
import { CSVImportWizard } from '../common/CSV-wizard/CSVWizard';
import config from '@/config/config';
import { createClaimInput } from '@/schemas/claimSchemas';
import { useClaimTrpc } from '@/hooks/trpc/useClaimTrpc';
import { Fade } from '@mui/material';

export default function FeedsAndClaimsTab() {
	const showImportClaimsDialog = useAdminStore((state) => state.showImportClaimsDialog);
	const showNewClaimDialog = useAdminStore((state) => state.showNewClaimDialog);
	const toggleImportClaimsDialog = useAdminStore((state) => state.toggleImportClaimsDialog);
	const { mutateAsync: createClaims, isPending } = useClaimTrpc().createMany;

	return (
		<Fade in={true} timeout={1000}>
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
		</Fade>
	);
}

const styles = {
	container: {
		width: '100%',
		height: 'calc(100vh - 75px)',
	},
};
