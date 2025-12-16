'use client';
import { Box, Checkbox, FormControlLabel, Link, Radio, Stack, Tooltip, Typography } from '@mui/material';
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
	const { data: attachedImages = [] } = useDocTrpc().listDocs(
		{
			filters: { answer_id: a.id },
		},
		{ enabled: a.id !== -1 }
	);

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

	return (
		<Tooltip key={a.id} placement="top" title={a.description_text ?? ''} arrow>
			<FormControlLabel
				control={
					questionType === QuestionType.MULTI ? (
						<Checkbox
							checked={!!field.value?.includes(a.id)}
							onChange={(e) => {
								const newValue = e.target.checked
									? [...(field.value ?? []), a.id]
									: field.value?.filter((value: any) => value !== a.id);
								field.onChange(newValue);
							}}
							disabled={disabled}
							color="primary"
						/>
					) : (
						<Radio
							checked={!!field.value?.includes(a.id)}
							onChange={(e) => {
								const newValue = e.target.checked ? [a.id] : [];
								field.onChange(newValue);
							}}
							disabled={disabled}
							color="primary"
						/>
					)
				}
				label={
					<Box display="flex" alignItems="center" gap={0.5}>
						{a.calls_instance_id &&
						visibleInstanceIds.includes(a.calls_instance_id) &&
						(answerComplete || mode === ChecklistMode.TEST) ? (
							<Link fontSize={13} color="info" onClick={() => goToPage(a.calls_instance_id!, tree)}>
								{a.text}
							</Link>
						) : (
							<Typography fontSize={13} noWrap>
								{a.text}
							</Typography>
						)}
						{attachedImage && (
							<ImageTooltip
								imageUrl={`/api/download?docId=${attachedImage.id}`}
								description={attachedImage.title ?? undefined}
							/>
						)}
					</Box>
				}
			/>
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
		<Stack direction="row" flexWrap="wrap" spacing={0.5} useFlexGap padding="0px 10px">
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
		</Stack>
	);
}
