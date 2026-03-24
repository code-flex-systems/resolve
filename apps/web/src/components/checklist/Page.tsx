'use client';
import { Form, useForm } from 'react-hook-form';
import { useChecklistStore, getSelectedPageInfoOrDefault } from '@/stores/useChecklistStore';
import { ChecklistMode, ClaimStatus, PageInstanceStatus, QuestionType } from '@/config/enums';
import { Question, QuestionResponse } from '@/types/types';
import { useEffect, useState } from 'react';
import Toolbar from '../common/Toolbar';
import { ChecklistQuestion } from './ChecklistQuestion';
import { useChecklistParams } from '@/hooks/useChecklistParams';
import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import { useResponseTrpc } from '@/hooks/trpc/useResponseTrpc';
import { useQuestionTrpc } from '@/hooks/trpc/useQuestionTrpc';
import { useEvaluateResponses } from '@/hooks/useEvaluateResponses';
import ExpandableTitle from '../common/ExpandableTitle';
import Button from '@/components/ui/Button';
import CommentDialog from './CommentDialog';
import UpdateSubmittedDialog from './UpdateSubmittedDialog';
import useIsAssigned from '@/hooks/useIsAssigned';
import { useCommentTrpc } from '@/hooks/trpc/useCommentTrpc';
import { IconCircleCheck, IconDeviceFloppy, IconFileDescription, IconRefresh } from '@tabler/icons-react';
import Skeleton from '@/components/ui/Skeleton';
import Divider from '@/components/ui/Divider';
import Card from '../ui/Card';

function generateDefaultValues(questions?: Question[], responses?: Record<string, QuestionResponse>) {
	const defaults: Record<string, string[] | string | number | null> = {};
	if (!questions) return defaults;
	questions.forEach((q) => {
		switch (q.type) {
			case QuestionType.DROPDOWN:
			case QuestionType.MULTI:
			case QuestionType.SINGLE:
				if (responses?.[q.id]) {
					const answers = responses[q.id].selected_answers ?? [];
					const answerOther = q.answers.find((a) => a.has_additional_info);
					const answerUpload = q.answers.find((a) => a.requires_upload);
					defaults[q.id.toString()] = answers.map((a) => a.answer_id);
					if (answerOther) {
						defaults[`${q.id}-${answerOther.id}-${QuestionType.FREEFORM}`] =
							answers.find((a) => a.answer_id === answerOther.id)?.additional_info ?? '';
					}
					if (answerUpload) {
						defaults[`${q.id}-${answerUpload.id}-upload`] = responses[q.id].response_doc_id ?? null;
					}
				} else {
					defaults[q.id.toString()] = [];
				}
				break;
			case QuestionType.FREEFORM:
				defaults[q.id.toString()] = responses?.[q.id]?.response_text ?? '';
				break;
			default:
				defaults[q.id.toString()] = '';
				break;
		}
	});
	return defaults;
}

export default function Page() {
	const isAssigned = useIsAssigned();
	const { checklistId = '', claimId = '' } = useChecklistParams();
	const selectedPageInstance = useChecklistStore((state) => state.selectedPageInstance) ?? '';
	const mode = useChecklistStore((state) => state.mode);
	const selectedPageInfo = getSelectedPageInfoOrDefault();
	const questionCommentDialog = useChecklistStore((state) => state.questionCommentDialog);
	const updateSubmittedDialogAction = useChecklistStore((state) => state.updateSubmittedDialogAction);
	const toggleUpdateSubmittedDialog = useChecklistStore((state) => state.toggleUpdateSubmittedDialog);

	const {
		control,
		setValue,
		reset,
		watch,
		handleSubmit,
		formState: { isDirty, isSubmitting },
	} = useForm({ mode: 'onChange' });

	const { data: checklist } = useChecklistTrpc().get({ id: checklistId! }, { enabled: !!checklistId });
	const { data: checklistClaim } = useChecklistTrpc().getForClaim(
		{ checklistId, claimId },
		{ enabled: !!checklistId && !!claimId }
	);
	const { data: questions } = useQuestionTrpc().list(
		{ pageId: selectedPageInfo.pageId },
		{ enabled: !!selectedPageInfo.pageId }
	);
	const {
		isLoading: loading,
		isFetching: fetching,
		data: responses,
	} = useResponseTrpc().list(
		{ checklistId, claimId, instanceId: selectedPageInstance },
		{ enabled: !!checklistId && !!claimId && !!selectedPageInstance && mode === ChecklistMode.VIEW }
	);
	const { data: comments } = useCommentTrpc().listForPage(
		{ checklistId, claimId, instanceId: selectedPageInstance },
		{ enabled: !!checklistId && !!claimId && !!selectedPageInstance && mode === ChecklistMode.VIEW }
	);
	const { mutate: evaluateResponses } = useEvaluateResponses();
	const { mutateAsync: upsertResponses } = useResponseTrpc().createUpdateMany;

	const [showUpdateMsg, setShowUpdateMsg] = useState(false);

	useEffect(() => {
		if (
			!!checklistId &&
			!!claimId &&
			!!selectedPageInstance &&
			selectedPageInfo.status === PageInstanceStatus.STALE
		) {
			evaluateResponses({ checklistId, claimId, instanceId: selectedPageInstance });
		}
	}, [checklistId, claimId, selectedPageInstance, selectedPageInfo.status]);

	useEffect(() => {
		if (loading || !selectedPageInstance) return;
		reset({
			...generateDefaultValues(
				questions,
				mode === ChecklistMode.VIEW ? (responses as Record<string, QuestionResponse>) : undefined
			),
		});
	}, [questions, responses, selectedPageInstance, mode, loading]);

	const onSubmit = handleSubmit(async (data) => {
		if (!isAssigned) return;
		try {
			const responses: QuestionResponse[] = Object.keys(data)
				.filter((field) => !field.endsWith(QuestionType.FREEFORM) && !field.endsWith('-upload'))
				.map((field) => {
					const questionId = field;
					const question = questions?.find((q) => q.id === questionId);
					const uploadAnswer = question?.answers?.find((a) => a.requires_upload);
					const uploadFieldName = uploadAnswer ? `${questionId}-${uploadAnswer.id}-upload` : null;
					const response: QuestionResponse = {
						checklist_id: checklist?.id ?? '',
						instance_id: selectedPageInstance,
						claim_id: claimId,
						question_id: questionId,
						response_text: typeof data[field] === 'string' && !!data[field] ? data[field] : null,
						response_doc_id: uploadFieldName && data[uploadFieldName] ? data[uploadFieldName] : null,
						selected_answers: Array.isArray(data[field])
							? data[field].map((id) => ({
									answer_id: id,
									additional_info: data[`${questionId}-${id}-${QuestionType.FREEFORM}`],
								}))
							: [],
					};
					return response;
				});
			await upsertResponses({ responses, claimStatus: checklistClaim?.status as ClaimStatus | undefined });
			setShowUpdateMsg(true);
			setTimeout(() => setShowUpdateMsg(false), 1000);
		} catch (e) {
			console.error(e);
		}
	});

	return (
		<>
			<div style={styles.container}>
				{(!selectedPageInstance || loading) && (
					<div className="flex-col-center" style={{ width: '100%', height: '100%' }}>
						{loading ? (
							<div
								style={{
									display: 'flex',
									flexDirection: 'column' as const,
									gap: 16,
									width: '100%',
									padding: 16,
								}}
							>
								<Skeleton variant="text" width="60%" height={32} />
								{[1, 2, 3, 4].map((i) => (
									<div key={i} style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
										<Skeleton variant="text" width="40%" />
										<Skeleton variant="rect" height={48} />
									</div>
								))}
							</div>
						) : (
							<div
								style={{ width: 200, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
							>
								<IconFileDescription size={20} style={{ color: 'var(--text-muted)', fontSize: 25 }} />
								<span style={{ color: 'var(--text-muted)', fontSize: 15, paddingLeft: '10px' }}>
									No page selected
								</span>
							</div>
						)}
					</div>
				)}
				{!!selectedPageInstance && !loading && (
					<>
						<Card variant="surface" style={{ width: '100%', padding: 5, marginBottom: 10 }}>
							<Toolbar
								left={
									<>
										<IconFileDescription size={20} />
										<h4>{selectedPageInfo.title}</h4>
										{showUpdateMsg && (
											<div className="flex-row-left" style={{ marginLeft: 10 }}>
												<IconCircleCheck
													size={20}
													style={{ color: 'var(--status-success)', marginRight: '5px' }}
												/>
												<span style={{ color: 'var(--status-success)' }}>Saved!</span>
											</div>
										)}
									</>
								}
								leftWidth="70%"
								right={
									mode === ChecklistMode.VIEW && isAssigned ? (
										<div className="flex-row-right" style={{ gap: 8 }}>
											<Button
												variant="outlined"
												size="sm"
												onClick={() =>
													reset(
														{ ...generateDefaultValues(questions) },
														{ keepDefaultValues: true }
													)
												}
												startIcon={<IconRefresh size={16} />}
											>
												Reset
											</Button>
											<Button
												variant="contained"
												size="sm"
												onClick={() => {
													if (checklistClaim?.status === ClaimStatus.SUBMITTED) {
														toggleUpdateSubmittedDialog(onSubmit);
														return;
													}
													onSubmit();
												}}
												disabled={!isDirty || fetching || isSubmitting}
												startIcon={<IconDeviceFloppy size={16} />}
											>
												Save
											</Button>
										</div>
									) : undefined
								}
								rightWidth="30%"
							/>
						</Card>
						<div style={styles.formWrapper}>
							<Form
								control={control}
								style={{ width: '100%', display: 'flex', flexDirection: 'column' as const, gap: 16 }}
							>
								{(questions ?? []).map((question, i) => (
									<ChecklistQuestion
										key={question.id}
										control={control}
										setValue={setValue}
										watch={watch}
										question={question}
										comment={comments?.[question.id]}
										disabled={isSubmitting}
										idx={i}
									/>
								))}
							</Form>
						</div>
					</>
				)}
			</div>
			{questionCommentDialog.show && <CommentDialog />}
			{!!updateSubmittedDialogAction && <UpdateSubmittedDialog />}
		</>
	);
}

const styles = {
	container: {
		flex: 1,
		minWidth: 500,
		width: '100%',
		height: '100%',
		display: 'flex',
		flexDirection: 'column' as const,
		justifyContent: 'flex-start',
		alignItems: 'flex-start',
		padding: '0px 20px',
		overflow: 'hidden' as const,
	},
	divider: {
		width: '100%',
		marginBottom: 5,
		flexShrink: 0,
	},
	formWrapper: {
		flex: 1,
		width: '100%',
		minHeight: 0,
		overflow: 'auto' as const,
		backgroundColor: 'var(--bg-white)',
	},
};
