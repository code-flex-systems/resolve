import { useState } from 'react';
import BasicDialog from '../common/BasicDialog';
import { usePageTrpc } from '@/hooks/trpc/usePageTrpc';
import { useChecklistParams } from '@/hooks/useChecklistParams';
import { MenuItem, Select, Typography } from '@mui/material';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export default function BreakdownPageSelect({ onClose }: { onClose: () => void }) {
	const searchParams = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();
	const { checklistId = -1 } = useChecklistParams();
	const [selectedInstanceId, setSelectedInstanceId] = useState<number | null>(null);
	const { data: instances = [] } = usePageTrpc().listInstances({ checklistId }, { enabled: checklistId !== -1 });
	const selectedPage = instances.find((i) => i.instance_id === selectedInstanceId);

	const setSearchParams = () => {
		if (!selectedPage) return;
		const params = new URLSearchParams(searchParams.toString());
		params.set('pageId', selectedPage.id.toString());
		params.set('instanceId', selectedPage.instance_id.toString());
		router.replace(`${pathname}?${params.toString()}`);
	};

	return (
		<BasicDialog
			title="Welcome to the checklist breakdown!"
			closeDisabled
			showCloseButton={false}
			onClose={() => {}}
			primaryAction={{
				label: 'Go',
				onClick: () => {
					setSearchParams();
					onClose();
				},
				disabled: !selectedPage,
			}}
			secondaryActions={[
				{
					label: 'Back to checklists',
					onClick: () => router.push('/admin/workflow-configuration/checklists'),
				},
			]}
			width={400}
		>
			<Typography fontSize={15} color="primary" paddingBottom="10px">
				Choose a page instance to get started:
			</Typography>
			<Select
				displayEmpty
				variant="standard"
				value={selectedInstanceId}
				renderValue={() =>
					selectedPage
						? `${selectedPage.title} (p${selectedPage.id}.i${selectedPage.instance_id})`
						: 'Select page...'
				}
				onChange={(e) => setSelectedInstanceId(+(e.target.value as string))}
				sx={styles.textFieldOverrides}
			>
				{instances.map((o) => (
					<MenuItem key={o.instance_id} value={o.instance_id}>
						<Typography fontSize={13}>
							{o.title} (p{o.id}.i{o.instance_id})
						</Typography>
					</MenuItem>
				))}
			</Select>
		</BasicDialog>
	);
}

const styles = {
	form: {
		width: '100%',
		paddingTop: 10,
	},
	formLabel: {
		paddingLeft: '10px',
		fontSize: 12,
	},
	textFieldOverrides: {
		width: 300,
		fontSize: 14,
		'& .MuiInputBase-root': {
			padding: '3px 5px',
		},
		'& .MuiOutlinedInput-input': {
			padding: '3px 5px',
		},
	},
};
