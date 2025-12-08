'use client';
import { Form, useForm } from 'react-hook-form';
import { useChecklistStore, getSelectedPageInfoOrDefault } from '@/stores/useChecklistStore';
import { ChecklistMode, ClaimStatus, PageInstanceStatus, QuestionType } from '@/config/enums';
import { Box, Divider, Fade, Typography } from '@mui/material';
import { Question, QuestionResponse } from '@/types/types';
import { useEffect, useState } from 'react';
import Toolbar from '../common/Toolbar';
import { ChecklistQuestion } from './ChecklistQuestion';
import Description from '@mui/icons-material/Description';
import Replay from '@mui/icons-material/Replay';
import Save from '@mui/icons-material/Save';
import TaskAlt from '@mui/icons-material/TaskAlt';
import { LineWobble } from 'ldrs/react';
import 'ldrs/react/LineWobble.css';
import theme, { BASE_COLOR, BASE_COLOR_LIGHT } from '@/styles/theme';
import { useChecklistParams } from '@/hooks/useChecklistParams';
import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import { useResponseTrpc } from '@/hooks/trpc/useResponseTrpc';
import { useQuestionTrpc } from '@/hooks/trpc/useQuestionTrpc';
import { useEvaluateResponses } from '@/hooks/useEvaluateResponses';
import ExpandableTitle from '../common/ExpandableTitle';
import BasicButtonStyled from '../common/BasicButtonStyled';
import CommentDialog from './CommentDialog';
import UpdateSubmittedDialog from './UpdateSubmittedDialog';
import useIsAssigned from '@/hooks/useIsAssigned';
import { useCommentTrpc } from '@/hooks/trpc/useCommentTrpc';

function generateDefaultValues(questions?: Question[], responses?: Record<number, QuestionResponse>) {
	const defaults: Record<string, number[] | string | number | null> = {};
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
	const { checklistId = -1, claimId = -1 } = useChecklistParams();
	const selectedPageInstance = useChecklistStore((state) => state.selectedPageInstance) ?? -1;
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

	const { data: checklist } = useChecklistTrpc().get({ id: checklistId! }, { enabled: checklistId !== -1 });
	const { data: checklistClaim } = useChecklistTrpc().getForClaim(
		{ checklistId, claimId },
		{ enabled: checklistId !== -1 && claimId !== -1 }
	);
	const { data: questions } = useQuestionTrpc().list(
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
				.filter((field) => !field.endsWith(QuestionType.FREEFORM) && !field.endsWith('-upload'))
				.map((field) => {
					const questionId = parseInt(field);
					const question = questions?.find((q) => q.id === questionId);
					const uploadAnswer = question?.answers?.find((a) => a.requires_upload);
					const uploadFieldName = uploadAnswer ? `${questionId}-${uploadAnswer.id}-upload` : null;
					const response: QuestionResponse = {
						checklist_id: checklist?.id ?? -1,
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
			<Box sx={styles.container}>
				{(selectedPageInstance === -1 || loading) && (
					<Box sx={{ width: '100%', height: '100%' }} className="flex-col-center">
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
							<Box width={200} display="flex" justifyContent="center" alignItems="center">
								<Description sx={{ color: BASE_COLOR_LIGHT, fontSize: 25 }} />
								<Typography color={BASE_COLOR_LIGHT} fontSize={15} paddingLeft="10px">
									No page selected
								</Typography>
							</Box>
						)}
					</Box>
				)}
				{selectedPageInstance !== -1 && !loading && (
					<>
						<Toolbar
							left={
								<>
									<ExpandableTitle
										title={selectedPageInfo.title}
										icon={<Description sx={{ color: BASE_COLOR }} />}
										color="white"
									/>
									<Fade in={showUpdateMsg} timeout={500} unmountOnExit>
										<Box sx={{ ml: 1.25 }} className="flex-row-left">
											<TaskAlt sx={{ color: theme.palette.success.light, marginRight: '5px' }} />
											<Typography color={theme.palette.success.light}>Saved!</Typography>
										</Box>
									</Fade>
								</>
							}
							leftWidth="70%"
							right={
								<Fade in={mode === ChecklistMode.VIEW && isAssigned} unmountOnExit>
									<Box className="flex-row-right">
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
									</Box>
								</Fade>
							}
							rightWidth="30%"
							height={60}
							padding={'10px 0px'}
						/>
						<Box sx={styles.divider}>
							<Divider />
						</Box>
						<Box sx={styles.formWrapper}>
							<Fade key={selectedPageInstance} in={!loading} timeout={500} unmountOnExit>
								<Form control={control} style={{ width: '100%' }}>
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
							</Fade>
						</Box>
					</>
				)}
			</Box>
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
		flexDirection: 'column',
		justifyContent: 'flex-start',
		alignItems: 'flex-start',
		p: 2.5,
		overflow: 'hidden',
	},
	divider: {
		width: '100%',
		mb: 0.625,
		flexShrink: 0,
	},
	formWrapper: {
		flex: 1,
		width: '100%',
		minHeight: 0,
		overflow: 'auto',
	},
};
