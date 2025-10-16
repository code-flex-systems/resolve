'use client';
import { Controller, Form, useForm } from 'react-hook-form';
import { useChecklistStore, getSelectedPageInfoOrDefault } from '@/stores/useChecklistStore';
import { Answer } from '@/types/types';
import {
	Button,
	Checkbox,
	Collapse,
	Divider,
	Fade,
	FormControl,
	FormLabel,
	MenuItem,
	Select,
	TextField,
	Typography,
} from '@mui/material';
import { ActionType, QuestionType } from '@/config/enums';
import { useEffect, useMemo, useState } from 'react';
import { ContentCopy, Delete, Save, Share, TaskAlt } from '@mui/icons-material';
import Toolbar from '../common/Toolbar';
import { useAnswerTrpc } from '@/hooks/trpc/useAnswerTrpc';
import { useQuestionTrpc } from '@/hooks/trpc/useQuestionTrpc';
import { getPageInstancesFromTree } from '@/lib/utils/utils';
import { usePageTrpc } from '@/hooks/trpc/usePageTrpc';
import { useChecklistParams } from '@/hooks/useChecklistParams';
import { useSelectedQuestionData } from '@/hooks/useSelectedQuestionData';
import { useSelectedAnswerData } from '@/hooks/useSelectedAnswerData';
import UserActionsDialog from './UserActionsDialog';
import { useActionTrpc } from '@/hooks/trpc/useActionTrpc';
import BasicButtonStyled from '../common/BasicButtonStyled';
import theme from '@/styles/theme';

function formatActionText(action: any | undefined) {
	if (!action) return <></>;
	switch (action.type as ActionType) {
		case ActionType.EMAIL:
			return (
				<Typography fontSize={15} marginLeft="5px">
					This answer currently sends an email to ({action.definition?.recipients?.length}) recipients.
				</Typography>
			);
		case ActionType.EVENT:
			return <></>;
		case ActionType.LETTER:
			return <></>;
		case ActionType.TASK:
			return <></>;
		default:
			return <></>;
	}
}

export default function FormAnswer() {
	const { checklistId = -1, claimId } = useChecklistParams();
	const selectedPageInfo = getSelectedPageInfoOrDefault();
	const selectedQuestion = useChecklistStore((state) => state.selectedQuestion) ?? -1;
	const selectedQuestionData = useSelectedQuestionData();
	const selectedAnswerData = useSelectedAnswerData();
	const showActionDialog = useChecklistStore((state) => state.showActionDialog);
	const updateSelectedAnswer = useChecklistStore((state) => state.updateSelectedAnswer);
	const toggleActionDialog = useChecklistStore((state) => state.toggleActionDialog);

	const { data: answerAction, isFetching: fetchingAction } = useActionTrpc().get(
		{ answerId: selectedAnswerData.id },
		{ enabled: selectedAnswerData.id !== -1 && !!selectedAnswerData?.has_action }
	);
	const { create, copy, remove, update } = useAnswerTrpc();
	const { isPending: adding, mutateAsync: addAnswer } = create;
	const { isPending: updating, mutateAsync: updateAnswer } = update;
	const { isPending: copying, mutateAsync: copyAnswer } = copy;
	const { isPending: deleting, mutateAsync: deleteAnswer } = remove;
	const { isFetching: refetching } = useQuestionTrpc().list({
		pageId: selectedPageInfo.pageId,
	});
	const { data: navigation = { tree: [], maxPosition: 0 } } = usePageTrpc().getInstanceTree(
		{ checklistId, claimId },
		{ enabled: checklistId !== -1 }
	);

	const {
		control,
		handleSubmit,
		reset,
		formState: { errors, isDirty, isSubmitting },
		watch,
	} = useForm<Answer>({
		defaultValues: {
			...selectedAnswerData,
		},
		mode: 'onChange',
	});

	const [showUpdateMsg, setShowUpdateMsg] = useState(false);
	const answerText = watch('text');
	const hasAdditionalInfo = watch('has_additional_info');
	const pageInstanceOptions = getPageInstancesFromTree(navigation.tree, selectedPageInfo.instanceId);
	const isPlaceholder = selectedAnswerData.id === -1;
	const isFreeform = selectedQuestionData.type === QuestionType.FREEFORM;
	const inTransition = isSubmitting || adding || copying || updating || deleting || refetching;
	const scopedQuestionId = `p${selectedPageInfo.pageId}.q${selectedQuestion}`;

	useEffect(() => {
		reset({ ...selectedAnswerData });
	}, [selectedAnswerData]);

	const onSubmit = handleSubmit(async (data) => {
		try {
			const parsedData: Answer = {
				...data,
				calls_instance_id: !data.calls_instance_id ? null : data.calls_instance_id,
			};
			const newAnswer =
				selectedAnswerData.id === -1
					? await addAnswer({
							questionId: selectedQuestion,
							pageId: selectedPageInfo.pageId,
							params: parsedData,
						})
					: await updateAnswer({
							pageId: selectedPageInfo.pageId,
							answerId: selectedAnswerData.id,
							params: parsedData,
						});
			if (newAnswer) updateSelectedAnswer(newAnswer.question_id, newAnswer.id);
			setShowUpdateMsg(true);
			setTimeout(() => setShowUpdateMsg(false), 1000);
		} catch (e) {
			console.error(e);
		}
	});

	const onCopy = async () => {
		try {
			const newAnswer = await copyAnswer({
				questionId: selectedQuestion,
				answerId: selectedAnswerData.id,
				pageId: selectedPageInfo.pageId,
			});
			if (newAnswer) updateSelectedAnswer(newAnswer.question_id, newAnswer.id);
		} catch (e) {
			console.error(e);
		}
	};

	const onDelete = async () => {
		try {
			await deleteAnswer({ answerId: selectedAnswerData.id, pageId: selectedPageInfo.pageId });
			updateSelectedAnswer(selectedQuestion, null); // TODO
		} catch (e) {
			console.error(e);
		}
	};

	const positionOptions = useMemo(() => {
		const options: number[] = [];
		let limit = selectedQuestionData.answers?.length ?? 0;
		if (isPlaceholder) limit += 1;
		for (let i = 1; i <= limit; i++) {
			options.push(i);
		}
		return options;
	}, [selectedQuestionData, isPlaceholder]);

	return (
		<>
			<Toolbar
				left={
					<>
						<Typography lineHeight={'21px'} fontSize={19}>
							{answerText} (p{selectedPageInfo.pageId}.q{selectedQuestion}.a
							{isPlaceholder ? '?' : selectedAnswerData.id})
						</Typography>
						<Fade in={showUpdateMsg} timeout={500}>
							<div style={{ marginLeft: 10 }} className="flex-row-left">
								<TaskAlt sx={{ color: theme.palette.success.light, marginRight: '5px' }} />
								<Typography color={theme.palette.success.light}>Saved!</Typography>
							</div>
						</Fade>
					</>
				}
				leftWidth="60%"
				right={
					<>
						{!isPlaceholder && (
							<>
								<BasicButtonStyled
									buttonProps={{
										onClick: onDelete,
										disabled: inTransition || isFreeform,
										sx: { height: 25, marginRight: '10px' },
										startIcon: <Delete />,
									}}
									tooltipProps={{
										title: isFreeform
											? `Question ${scopedQuestionId} is free-form. Please change the question type to remove this answer.`
											: '',
									}}
								>
									Delete
								</BasicButtonStyled>
								<BasicButtonStyled
									buttonProps={{
										onClick: onCopy,
										disabled: inTransition || isFreeform,
										sx: { height: 25, marginRight: '10px' },
										startIcon: <ContentCopy />,
									}}
									tooltipProps={{
										title: isFreeform
											? `Question ${scopedQuestionId} is free-form. Please change the question type to copy this answer.`
											: '',
									}}
								>
									Copy
								</BasicButtonStyled>
							</>
						)}
						<BasicButtonStyled
							buttonProps={{
								onClick: onSubmit,
								disabled: inTransition || (!isPlaceholder && !isDirty),
								color: 'primary',
								sx: { height: 25 },
								startIcon: <Save />,
							}}
						>
							{isPlaceholder ? 'Add' : 'Save'}
						</BasicButtonStyled>
					</>
				}
				rightWidth="40%"
				height={60}
				padding={'10px 0px'}
			/>
			<div style={styles.divider}>
				<Divider />
			</div>
			<Fade
				key={selectedAnswerData.id}
				in={!!selectedAnswerData.id && !fetchingAction}
				timeout={500}
				unmountOnExit
			>
				<Form control={control} style={styles.form}>
					<div style={styles.row} className="flex-row-left">
						<Controller
							name="text"
							control={control}
							rules={{ required: true }}
							render={({ field }) => (
								<TextField
									label="Answer text"
									placeholder="Water Damage"
									variant="outlined"
									error={!!errors.text}
									{...field}
									sx={styles.textFieldOverrides}
									style={styles.item}
								/>
							)}
						/>

						<Controller
							name="description_text"
							control={control}
							render={({ field }) => (
								<TextField
									label="Answer description (optional)"
									placeholder="Damage as a result of leaks or condensation"
									variant="outlined"
									{...field}
									value={field.value ?? ''}
									sx={{ ...styles.textFieldOverrides, width: 400 }}
									style={styles.item}
								/>
							)}
						/>
					</div>
					<div style={{ ...styles.row, height: 55 }} className="flex-row-left">
						<Controller
							name="grade"
							control={control}
							render={({ field }) => (
								<TextField
									label="Grade (optional)"
									placeholder="1.1"
									variant="outlined"
									type="number"
									{...field}
									value={field.value ?? ''}
									sx={{ ...styles.textFieldOverrides, width: 120 }}
									style={styles.item}
								/>
							)}
						/>

						<Controller
							name="position"
							control={control}
							rules={{ required: true }}
							render={({ field }) => (
								<FormControl style={{ padding: '0px 5px 15px' }}>
									<FormLabel sx={styles.formLabel}>Order</FormLabel>
									<Select
										variant="outlined"
										error={!!errors.position}
										{...field}
										sx={{ ...styles.textFieldOverrides, width: 50 }}
									>
										{positionOptions.map((o) => (
											<MenuItem key={o} value={o}>
												{o}
											</MenuItem>
										))}
									</Select>
								</FormControl>
							)}
						/>

						<Controller
							name="calls_instance_id"
							control={control}
							render={({ field }) => (
								<FormControl style={{ padding: '0px 5px 15px' }}>
									<FormLabel sx={styles.formLabel}>Calls page (optional)</FormLabel>
									<Select
										displayEmpty
										variant="outlined"
										error={!!errors.calls_instance_id}
										{...field}
										value={field.value ?? ''}
										renderValue={(value) => {
											if (value === 0) return 'None';
											const option = pageInstanceOptions.find((o) => o.instanceId === value);
											return option ? `p${option.pageId}.i${option.instanceId}` : 'Choose a page';
										}}
										sx={styles.textFieldOverrides}
									>
										<MenuItem key="none" value="">
											None
										</MenuItem>
										{pageInstanceOptions
											.sort((a, b) => a.pageId - b.pageId)
											.map((o) => (
												<MenuItem key={o.instanceId} value={o.instanceId}>
													p{o.pageId}.i{o.instanceId}
												</MenuItem>
											))}
									</Select>
								</FormControl>
							)}
						/>
					</div>

					<div style={{ ...styles.row, height: 55 }} className="flex-row-left">
						<Button
							disabled={inTransition || isFreeform}
							variant="outlined"
							color="primary"
							startIcon={<Share />}
							onClick={toggleActionDialog}
							sx={{ height: 30 }}
							style={styles.item}
						>
							User actions
						</Button>
						{formatActionText(answerAction)}
					</div>

					<div style={{ ...styles.row, height: 40 }} className="flex-row-left">
						<Controller
							name="has_additional_info"
							control={control}
							render={({ field }) => (
								<FormControl style={styles.item}>
									<div className="flex-row-left">
										<Checkbox
											{...field}
											onChange={(e) => field.onChange(e.target.checked)}
											checked={Boolean(field?.value)}
											sx={{ width: 15, height: 15 }}
										/>
										<FormLabel sx={{ fontSize: 12, paddingLeft: '5px' }}>
											Requires additional info...
										</FormLabel>
									</div>
								</FormControl>
							)}
						/>
					</div>

					<Collapse in={hasAdditionalInfo}>
						<div style={styles.row} className="flex-row-left">
							<Controller
								name="additional_info_placeholder"
								control={control}
								render={({ field }) => (
									<TextField
										label="Free-form placeholder (optional)"
										placeholder="Please list"
										variant="outlined"
										{...field}
										value={field.value ?? ''}
										sx={styles.textFieldOverrides}
										style={styles.item}
									/>
								)}
							/>

							<Controller
								name="additional_info_num_lines"
								control={control}
								render={({ field }) => (
									<TextField
										label="Free-form # of lines (optional)"
										placeholder="2"
										variant="outlined"
										type="number"
										{...field}
										value={field.value ?? ''}
										sx={{ ...styles.textFieldOverrides, width: 200 }}
										style={styles.item}
									/>
								)}
							/>
						</div>
					</Collapse>
				</Form>
			</Fade>
			{showActionDialog && <UserActionsDialog />}
		</>
	);
}

const styles = {
	divider: {
		width: '100%',
		height: 1,
		marginBottom: 5,
	},
	form: {
		width: '100%',
		paddingTop: 10,
	},
	formLabel: {
		paddingLeft: '10px',
		fontSize: 12,
	},
	item: {
		margin: 5,
	},
	row: {
		padding: '15px 5px',
	},
	textFieldOverrides: {
		width: 300,
		'& .MuiInputBase-root': {
			padding: '3px 5px',
		},
		'& .MuiOutlinedInput-input': {
			padding: '3px 5px',
		},
	},
	toolbar: {
		color: 'secondary.main',
		fontSize: 20,
		marginRight: '5px',
	},
};
