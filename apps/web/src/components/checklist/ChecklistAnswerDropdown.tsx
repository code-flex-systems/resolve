'use client';
import Tooltip from '@/components/ui/Tooltip';
import Dropdown from '@/components/ui/Dropdown';
import { Question } from '@/types/types';
import { ControllerRenderProps, FieldValues } from 'react-hook-form';
import { useDocTrpc } from '@/hooks/trpc/useDocTrpc';
import ImageTooltip from '../common/ImageTooltip';

// Component to display a dropdown menu item with its attached image
function DropdownAnswerItem(props: { answer: any }) {
	const { answer: a } = props;

	// Fetch attached image for this answer
	const { data: attachedImagesResult } = useDocTrpc().listDocs(
		{
			filters: { answer_id: a.id },
		},
		{ enabled: a.id !== -1 }
	);
	const attachedImages = attachedImagesResult?.rows ?? [];

	const attachedImage = attachedImages.length > 0 ? attachedImages[0] : null;

	return (
		<Tooltip content={a.description_text ?? ''} position="right">
			<div     style={{ display: 'flex', alignItems: 'center', gap: 4, width: '100%' }}>
				<span  style={{ fontSize: 13 }}>{a.text}</span>
				{attachedImage && (
					<ImageTooltip
						imageUrl={`/api/download?docId=${attachedImage.id}`}
						description={attachedImage.title ?? undefined}
					/>
				)}
			</div>
		</Tooltip>
	);
}

export default function ChecklistAnswerDropdown(props: {
	field: ControllerRenderProps<FieldValues, string>;
	question: Question;
	disabled?: boolean;
}) {
	const { field, question, disabled } = props;
	return (
		<div style={{ marginTop: 5, marginLeft: 10 }}>
			<Dropdown inlineLabel
				options={question.answers.map((a) => ({
					value: a.id,
					label: a.text,
				}))}
				value={field.value?.[0] ?? ''}
				onChange={(v) => field.onChange([v])}
				placeholder="Choose an answer"
				disabled={disabled}
				size="sm"
			/>
		</div>
	);
}
