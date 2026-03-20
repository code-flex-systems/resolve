import React, { useEffect } from 'react';
import { usePageTrpc } from '@/hooks/trpc/usePageTrpc';
import Dropdown from '@/components/ui/Dropdown';

export default function PageInstanceSelect({
	checklistId,
	instanceId,
	setInstanceId,
	clearable = true,
	height,
	text = 'Filter by page',
	disabled = false,
}: {
	checklistId: number;
	instanceId: number | null;
	setInstanceId: (newInstanceId: number | null) => void;
	clearable?: boolean;
	height?: number;
	text?: string;
	disabled?: boolean;
}) {
	const { data: options = [], isFetching } = usePageTrpc().listInstances(
		{ checklistId },
		{ enabled: checklistId !== -1 }
	);

	useEffect(() => {
		if (!clearable && options.length > 0) {
			setInstanceId(options[0].instance_id);
		}
	}, [options, clearable]);

	const dropdownOptions = [
		...(clearable ? [{ value: '', label: 'All' }] : []),
		...options.map((o) => ({
			value: o.instance_id,
			label: `${o.title} (p${o.id}.i${o.instance_id})`,
		})),
	];

	return (
		<Dropdown
			options={dropdownOptions}
			value={instanceId ?? ''}
			onChange={(val) => setInstanceId(val === '' ? null : Number(val))}
			placeholder={text}
			size="sm"
			disabled={disabled}
		/>
	);
}
