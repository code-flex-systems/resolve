import { useState } from 'react';
import BasicDialog from '../common/BasicDialog';
import { usePageTrpc } from '@/hooks/trpc/usePageTrpc';
import { useChecklistParams } from '@/hooks/useChecklistParams';
import Dropdown from '@/components/ui/Dropdown';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export default function BreakdownPageSelect({ onClose }: { onClose: () => void }) {
	const searchParams = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();
	const { checklistId } = useChecklistParams();
	const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
	const { data: instances = [] } = usePageTrpc().listInstances({ checklistId: checklistId! }, { enabled: !!checklistId });
	const selectedPage = instances.find((i) => i.instance_id === selectedInstanceId);

	const setSearchParams = () => {
		if (!selectedPage) return;
		const params = new URLSearchParams(searchParams.toString());
		params.set('pageId', selectedPage.id.toString());
		params.set('instanceId', selectedPage.instance_id.toString());
		params.set('pagePosition', String(selectedPage.position + 1));
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
			<span    style={{ fontSize: 15, color: 'primary', paddingBottom: '10px' }}>
				Choose a page instance to get started:
			</span>
			<Dropdown inlineLabel
				options={instances.map((o) => ({
					value: o.instance_id,
					label: `${o.title} (p${o.position + 1})`,
				}))}
				value={selectedInstanceId}
				onChange={(v) => setSelectedInstanceId(String(v))}
				placeholder="Select page..."
			/>
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
