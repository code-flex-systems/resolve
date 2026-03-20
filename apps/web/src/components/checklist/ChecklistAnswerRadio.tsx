'use client';
import CheckboxUi from '@/components/ui/Checkbox';
import Tooltip from '@/components/ui/Tooltip';
import { ChecklistMode, QuestionType } from '@/config/enums';
import { Question } from '@/types/types';
import { ControllerRenderProps, FieldValues, UseFormWatch } from 'react-hook-form';
import { useChecklistStore } from '@/stores/useChecklistStore';
import { useChecklistParams } from '@/hooks/useChecklistParams';
import { usePageTrpc } from '@/hooks/trpc/usePageTrpc';
import { useDocTrpc } from '@/hooks/trpc/useDocTrpc';
import ImageTooltip from '../common/ImageTooltip';

// Component to display a single answer with its attached image
function AnswerWithImage(props: {
	answer: any;
	questionType: QuestionType;
	field: ControllerRenderProps<FieldValues, string>;
	disabled?: boolean;
	visibleInstanceIds: number[];
	goToPage: (instanceId: number, tree: any[]) => void;
	tree: any[];
	watch: UseFormWatch<FieldValues>;
	question: Question;
}) {
	const { answer: a, questionType, field, disabled, visibleInstanceIds, goToPage, tree, watch, question } = props;
	const mode = useChecklistStore((s) => s.mode);

	// Fetch attached image for this answer
	const { data: attachedImagesResult } = useDocTrpc().listDocs(
		{
			filters: { answer_id: a.id },
		},
		{ enabled: a.id !== -1 }
	);
	const attachedImages = attachedImagesResult?.rows ?? [];

	const attachedImage = attachedImages.length > 0 ? attachedImages[0] : null;

	// Check if all required fields for this answer are complete
	const isAnswerComplete = () => {
		if (!field.value?.includes(a.id)) return false;

		// Check if additional_info is required and filled
		if (a.has_additional_info) {
			const freeformFieldName = `${question.id}-${a.id}-${QuestionType.FREEFORM}`;
			const freeformValue = watch(freeformFieldName);
			if (!freeformValue || freeformValue.trim() === '') return false;
		}

		// Check if upload is required and filled
		if (a.requires_upload) {
			const uploadFieldName = `${question.id}-${a.id}-upload`;
			const uploadValue = watch(uploadFieldName);
			if (!uploadValue) return false;
		}

		return true;
	};

	const answerComplete = isAnswerComplete();

	const labelContent = (
		<div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
			{a.calls_instance_id &&
			visibleInstanceIds.includes(a.calls_instance_id) &&
			(answerComplete || mode === ChecklistMode.TEST) ? (
				<button onClick={() => goToPage(a.calls_instance_id!, tree)} style={{ fontSize: 13, color: 'var(--text-accent)', background: 'none', border: 'none', padding: 0, font: 'inherit', cursor: 'pointer' }}>
					{a.text}
				</button>
			) : (
				<span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 13 }}>
					{a.text}
				</span>
			)}
			{attachedImage && (
				<ImageTooltip
					imageUrl={`/api/download?docId=${attachedImage.id}`}
					description={attachedImage.title ?? undefined}
				/>
			)}
		</div>
	);

	return (
		<Tooltip key={a.id} position="top" content={a.description_text ?? ''}>
			{questionType === QuestionType.MULTI ? (
				<CheckboxUi
					checked={!!field.value?.includes(a.id)}
					onChange={(checked) => {
						const newValue = checked
							? [...(field.value ?? []), a.id]
							: field.value?.filter((value: any) => value !== a.id);
						field.onChange(newValue);
					}}
					disabled={disabled}
					label={a.text}
				/>
			) : (
				<label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: disabled ? 'default' : 'pointer' }}>
					<input
						type="radio"
						checked={!!field.value?.includes(a.id)}
						onChange={(e) => {
							const newValue = e.target.checked ? [a.id] : [];
							field.onChange(newValue);
						}}
						disabled={disabled}
						style={{ accentColor: 'var(--text-accent)' }}
					/>
					{labelContent}
				</label>
			)}
		</Tooltip>
	);
}

export default function ChecklistAnswerRadio(props: {
	field: ControllerRenderProps<FieldValues, string>;
	question: Question;
	disabled?: boolean;
	watch: UseFormWatch<FieldValues>;
}) {
	const { field, question, disabled, watch } = props;
	const { checklistId = -1, claimId = -1 } = useChecklistParams();
	const goToPage = useChecklistStore((state) => state.goToPage);
	const { data = { tree: [], maxPosition: 0 } } = usePageTrpc().getInstanceTree(
		{ checklistId, claimId },
		{ enabled: checklistId !== -1 && claimId !== -1 }
	);
	const { data: visibleInstanceIds = [] } = usePageTrpc().listVisibleInstances(
		{ checklistId, claimId },
		{ enabled: checklistId !== -1 && claimId !== -1 }
	);
	return (
		<div     style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 4, padding: '0px 10px' }}>
			{(question.answers ?? []).map((a) => (
				<AnswerWithImage
					key={a.id}
					answer={a}
					questionType={question.type as QuestionType}
					field={field}
					disabled={disabled}
					visibleInstanceIds={visibleInstanceIds}
					goToPage={goToPage}
					tree={data.tree}
					watch={watch}
					question={question}
				/>
			))}
		</div>
	);
}
