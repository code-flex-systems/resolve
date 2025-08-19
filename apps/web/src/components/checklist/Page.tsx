'use client';
import { Form, useForm } from 'react-hook-form';
import { useShallow } from 'zustand/react/shallow';
import useStore, { useChecklistSlice } from '@/state/store';
import * as selectors from '@/state/checklist/selectors';
import { ChecklistMode, ClaimStatus, PageInstanceStatus, QuestionType } from '@/config/enums';
import { Divider, Fade, Typography } from '@mui/material';
import { Question, QuestionResponse } from '@/types/types';
import { useEffect, useState } from 'react';
import Toolbar from '../common/Toolbar';
import { ChecklistQuestion } from './ChecklistQuestion';
import { Description, Replay, Save, TaskAlt } from '@mui/icons-material';
import { LineWobble } from 'ldrs/react';
import 'ldrs/react/LineWobble.css';
import theme from '@/styles/theme';
import { useChecklistParams } from '@/hooks/useChecklistParams';
import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import { useResponseTrpc } from '@/hooks/trpc/useResponseTrpc';
import { useQuestionTrpc } from '@/hooks/trpc/useQuestionTrpc';
import { useEvaluateResponses } from '@/hooks/useEvaluateResponses';
import ExpandableTitle from '../common/ExpandableTitle';
import BasicButtonStyled from '../common/BasicButtonStyled';
import CommentDialog from './CommentDialog';
import { toggleUpdateSubmittedDialog } from '@/state/checklist/actions';
import UpdateSubmittedDialog from './UpdateSubmittedDialog';
import useIsAssigned from '@/hooks/useIsAssigned';
import { useCommentTrpc } from '@/hooks/trpc/useCommentTrpc';

function generateDefaultValues(questions?: Question[], responses?: Record<number, QuestionResponse>) {
	const defaults: Record<string, number[] | string> = {};
	if (!questions) return defaults;
	questions.forEach((q) => {
		switch (q.type) {
			case QuestionType.DROPDOWN:
			case QuestionType.MULTI:
			case QuestionType.SINGLE:
				if (responses?.[q.id]) {
					const answers = responses[q.id].selected_answers ?? [];
					const answerOther = q.answers.find((a) => a.has_additional_info);
					defaults[q.id.toString()] = answers.map((a) => a.answer_id);
					if (answerOther) {
						defaults[`${q.id}-${answerOther.id}-${QuestionType.FREEFORM}`] =
							answers.find((a) => a.answer_id === answerOther.id)?.additional_info ?? '';
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
	const { checklistId = -1, claimId = -1 } = useChecklistParams();
	const selectedPageInstance = useChecklistSlice((state) => state.selectedPageInstance) ?? -1;
	const mode = useChecklistSlice((state) => state.mode);
	const selectedPageInfo = useStore(useShallow(selectors.selectedPageInfo));
	const questionCommentDialog = useChecklistSlice((state) => state.questionCommentDialog);
	const updateSubmittedDialogAction = useChecklistSlice((state) => state.updateSubmittedDialogAction);

	const {
		control,
		setValue,
		reset,
		watch,
		handleSubmit,
		formState: { isDirty, isSubmitting },
	} = useForm({ mode: 'onChange' });

	const { data: checklist } = useChecklistTrpc().get({ id: checklistId! }, { enabled: checklistId !== -1 });
	const { data: checklistClaim } = useChecklistTrpc().getForClaim(
		{ checklistId, claimId },
		{ enabled: checklistId !== -1 && claimId !== -1 }
	);
	const { data: questions = [] } = useQuestionTrpc().list(
		{ pageId: selectedPageInfo.pageId },
		{ enabled: selectedPageInfo.pageId !== -1 }
	);
	const {
		isLoading: loading,
		isFetching: fetching,
		data: responses,
	} = useResponseTrpc().list(
		{ checklistId, claimId, instanceId: selectedPageInstance },
		{ enabled: checklistId !== -1 && claimId !== -1 && selectedPageInstance !== -1 && mode === ChecklistMode.VIEW }
	);
	const { data: comments } = useCommentTrpc().listForPage(
		{ checklistId, claimId, instanceId: selectedPageInstance },
		{ enabled: checklistId !== -1 && claimId !== -1 && selectedPageInstance !== -1 && mode === ChecklistMode.VIEW }
	);
	const { mutate: evaluateResponses } = useEvaluateResponses();
	const { mutateAsync: upsertResponses } = useResponseTrpc().createUpdateMany;

	const [showUpdateMsg, setShowUpdateMsg] = useState(false);

	useEffect(() => {
		if (
			checklistId !== -1 &&
			claimId !== -1 &&
			selectedPageInstance !== -1 &&
			selectedPageInfo.status === PageInstanceStatus.STALE
		) {
			evaluateResponses({ checklistId, claimId, instanceId: selectedPageInstance });
		}
	}, [checklistId, claimId, selectedPageInstance, selectedPageInfo.status]);

	useEffect(() => {
		if (loading || selectedPageInstance === -1) return;
		reset({
			...generateDefaultValues(questions, mode === ChecklistMode.VIEW ? responses : undefined),
		});
	}, [questions, responses, selectedPageInstance, mode, loading]);

	const onSubmit = handleSubmit(async (data) => {
		if (!isAssigned) return;
		try {
			const responses: QuestionResponse[] = Object.keys(data)
				.filter((field) => !field.endsWith(QuestionType.FREEFORM))
				.map((field) => {
					const questionId = parseInt(field);
					const response: QuestionResponse = {
						checklist_id: checklist?.id ?? -1,
						instance_id: selectedPageInstance,
						claim_id: claimId,
						question_id: questionId,
						response_text: typeof data[field] === 'string' && !!data[field] ? data[field] : null,
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
				{(selectedPageInstance === -1 || loading) && (
					<div style={{ width: '100%', height: '100%' }} className="flex-col-center">
						{loading ? (
							<>
								<Typography fontStyle="italic" color="primary">
									Loading...
								</Typography>
								<LineWobble
									size="200"
									stroke="5"
									bgOpacity="0.1"
									speed="2"
									color={theme.palette.primary.main}
								/>
							</>
						) : (
							<Typography fontStyle="italic">No page selected</Typography>
						)}
					</div>
				)}
				{selectedPageInstance !== -1 && !loading && (
					<>
						<Toolbar
							left={
								<>
									<ExpandableTitle
										title={selectedPageInfo.title}
										icon={<Description sx={{ color: 'white' }} />}
									/>
									<Fade in={showUpdateMsg} timeout={500} unmountOnExit>
										<div style={{ marginLeft: 10 }} className="flex-row-left">
											<TaskAlt sx={{ color: theme.palette.success.light, marginRight: '5px' }} />
											<Typography color={theme.palette.success.light}>Saved!</Typography>
										</div>
									</Fade>
								</>
							}
							leftWidth="70%"
							right={
								<Fade in={mode === ChecklistMode.VIEW && isAssigned} unmountOnExit>
									<div className="flex-row-right">
										<BasicButtonStyled
											buttonProps={{
												onClick: () =>
													reset(
														{ ...generateDefaultValues(questions) },
														{ keepDefaultValues: true }
													),
												startIcon: <Replay />,
												sx: { height: 25, marginRight: '10px' },
											}}
										>
											Reset
										</BasicButtonStyled>
										<BasicButtonStyled
											buttonProps={{
												color: 'primary',
												disabled: !isDirty || fetching || isSubmitting,
												onClick: () => {
													if (checklistClaim?.status === ClaimStatus.SUBMITTED) {
														toggleUpdateSubmittedDialog(onSubmit);
														return;
													}
													onSubmit();
												},
												startIcon: <Save />,
												sx: { height: 25 },
											}}
										>
											Save
										</BasicButtonStyled>
									</div>
								</Fade>
							}
							rightWidth="30%"
							height={60}
							padding={'10px 0px'}
						/>
						<div style={styles.divider}>
							<Divider />
						</div>
						<Fade key={selectedPageInstance} in={!loading} style={styles.form} timeout={500} unmountOnExit>
							<Form control={control} style={styles.form}>
								{questions.map((question, i) => (
									<ChecklistQuestion
										key={question.id}
										control={control}
										setValue={setValue}
										watch={watch}
										question={question}
										comment={comments?.[question.id]}
										disabled={isSubmitting || !isAssigned}
										idx={i}
									/>
								))}
							</Form>
						</Fade>
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
		minWidth: 0,
		height: '100%',
		display: 'flex',
		flexDirection: 'column' as const,
		justifyContent: 'flex-start',
		alignItems: 'flex-start',
		padding: '20px',
	},
	divider: {
		width: '100%',
		height: 1,
		marginBottom: 5,
	},
	form: {
		width: '100%',
		height: '100%',
		overflow: 'auto',
	},
};
