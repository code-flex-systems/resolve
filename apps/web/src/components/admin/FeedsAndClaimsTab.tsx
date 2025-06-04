import { useAdminSlice } from '@/state/store';
import Claims from './Claims';
import Feeds from './Feeds';
import NewClaimDialog from './NewClaimDialog';
import { CSVImportWizard } from '../common/CSV-wizard/CSVWizard';
import { toggleImportClaimsDialog } from '@/state/admin/actions';
import config from '@/config/config';
import { createClaimInput } from '@/schemas/claimSchemas';

export default function FeedsAndClaimsTab() {
	const showImportClaimsDialog = useAdminSlice((state) => state.showImportClaimsDialog);
	const showNewClaimDialog = useAdminSlice((state) => state.showNewClaimDialog);
	return (
		<div style={styles.container} className="flex-row-between">
			<Feeds />
			<Claims />
			{showImportClaimsDialog && (
				<CSVImportWizard
					fields={config.CLAIM_FIELDS.map((f) => ({ ...f, required: true }))}
					validateRow={(row: any) =>
						createClaimInput.safeParse({
							params: {
								...row,
								claim_amount: Number(row.claim_amount),
								expected_recovery: Number(row.expected_recovery),
								total_incurred: Number(row.total_incurred),
								date_of_loss: new Date(row.date_of_loss?.toString() ?? ''),
								last_update: new Date(row.last_update?.toString() ?? ''),
							},
						})
					}
					onSubmit={() => {
						return new Promise(() => {});
					}}
					submitting={false}
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
