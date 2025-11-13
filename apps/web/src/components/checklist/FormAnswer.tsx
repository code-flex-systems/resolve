'use client';
import { Controller, Form, useForm } from 'react-hook-form';
import { useChecklistStore, getSelectedPageInfoOrDefault } from '@/stores/useChecklistStore';
import {
	Box,
	Button,
	Checkbox,
	Collapse,
	Divider,
	Fade,
	FormControl,
	FormLabel,
	Grid,
	IconButton,
	InputAdornment,
	MenuItem,
	Select,
	TextField,
	Typography,
} from '@mui/material';
import { ActionType, QuestionType } from '@/config/enums';
import { useEffect, useMemo, useState } from 'react';
import Check from '@mui/icons-material/Check';
import ContentCopy from '@mui/icons-material/ContentCopy';
import Delete from '@mui/icons-material/Delete';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Share from '@mui/icons-material/Share';
import TaskAlt from '@mui/icons-material/TaskAlt';
import Close from '@mui/icons-material/Close';
import ImageIcon from '@mui/icons-material/Image';
import Toolbar from '../common/Toolbar';
import { useAnswerTrpc } from '@/hooks/trpc/useAnswerTrpc';
import { Answer } from '@/types/types';
import { useQuestionTrpc } from '@/hooks/trpc/useQuestionTrpc';
import { buildAnswerCallGraph, getPageInstancesFromTree, wouldCreateCycle } from '@/lib/utils/utils';
import { usePageTrpc } from '@/hooks/trpc/usePageTrpc';
import { useChecklistParams } from '@/hooks/useChecklistParams';
import { useSelectedQuestionData } from '@/hooks/useSelectedQuestionData';
import { useSelectedAnswerData } from '@/hooks/useSelectedAnswerData';
import UserActionsDialog from './UserActionsDialog';
import { useActionTrpc } from '@/hooks/trpc/useActionTrpc';
import BasicButtonStyled from '../common/BasicButtonStyled';
import theme, { BASE_COLOR_LIGHT } from '@/styles/theme';
import FormatQuote from '@mui/icons-material/FormatQuote';
import DocumentSelectorDialog from '../admin/DocumentSelectorDialog';
import type { DocListItem } from '@/hooks/trpc/useDocTrpc';
import { useDocTrpc } from '@/hooks/trpc/useDocTrpc';
import ImageTooltip from '../common/ImageTooltip';
import { getAllowedExtensions } from '@/config/allowedFileTypes';

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
	const [copiedField, setCopiedField] = useState<string | null>(null);
	const [showDocSelector, setShowDocSelector] = useState(false);
	const [attachedImage, setAttachedImage] = useState<DocListItem | null>(null);

	const { data: answerAction, isFetching: fetchingAction } = useActionTrpc().get(
		{ answerId: selectedAnswerData.id },
		{ enabled: selectedAnswerData.id !== -1 && !!selectedAnswerData?.has_action }
	);
	const { create, copy, remove, update, getCallGraph } = useAnswerTrpc();
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
	const { data: callGraphData = [] } = getCallGraph({ checklistId }, { enabled: checklistId !== -1 });

	// Fetch attached image for current answer
	const { data: attachedImages = [] } = useDocTrpc().listDocs(
		{
			filters: { answer_id: selectedAnswerData.id },
		},
		{ enabled: selectedAnswerData.id !== -1 }
	);

	const { mutateAsync: updateDoc } = useDocTrpc().updateDoc;

	const {
		control,
		handleSubmit,
		reset,
		formState: { errors, isDirty, isValid, isSubmitting },
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
	const requiresUpload = watch('requires_upload');
	const allPageInstanceOptions = getPageInstancesFromTree(navigation.tree, selectedPageInfo.instanceId);

	// Build the answer call graph and filter out instances that would create cycles
	const answerCallGraph = useMemo(() => {
		const graph = buildAnswerCallGraph(navigation.tree);
		// Populate the graph with actual answer call data
		for (const edge of callGraphData) {
			const fromSet = graph.get(edge.from_instance_id);
			if (fromSet) {
				fromSet.add(edge.to_instance_id);
			}
		}
		return graph;
	}, [navigation.tree, callGraphData]);

	// Filter out page instances that would create cycles
	const pageInstanceOptions = useMemo(() => {
		return allPageInstanceOptions.filter((option) => {
			// Don't filter if this is the currently selected option (allow keeping existing selection)
			if (selectedAnswerData.calls_instance_id === option.instanceId) {
				return true;
			}
			// Check if selecting this option would create a cycle
			return !wouldCreateCycle(selectedPageInfo.instanceId, option.instanceId, answerCallGraph);
		});
	}, [allPageInstanceOptions, selectedPageInfo.instanceId, answerCallGraph, selectedAnswerData.calls_instance_id]);

	const isPlaceholder = selectedAnswerData.id === -1;
	const isFreeform = selectedQuestionData.type === QuestionType.FREEFORM;
	const inTransition = isSubmitting || adding || copying || updating || deleting || refetching;
	const scopedQuestionId = `p${selectedPageInfo.pageId}.q${selectedQuestion}`;

	useEffect(() => {
		reset({ ...selectedAnswerData });
	}, [selectedAnswerData]);

	// Sync attached image when images are fetched
	useEffect(() => {
		if (attachedImages.length > 0) {
			setAttachedImage(attachedImages[0]); // Only support one image per answer
		} else {
			setAttachedImage(null);
		}
	}, [attachedImages]);

	const onSubmit = handleSubmit(async (data) => {
		try {
			// Extract only the fields needed for AnswerParams/AnswerUpdateParams
			// Note: Database returns numeric fields as numbers, but Zod parseNumber() expects strings
			const params = {
				text: data.text,
				position: data.position,
				grade: data.grade,
				description_text: data.description_text,
				description_image_url: data.description_image_url,
				has_additional_info: data.has_additional_info,
				additional_info_placeholder: data.additional_info_placeholder,
				additional_info_num_lines: data.additional_info_num_lines
					? String(data.additional_info_num_lines)
					: null,
				calls_instance_id: !data.calls_instance_id ? null : data.calls_instance_id,
				hidden: data.hidden,
				requires_upload: data.requires_upload,
				allowed_extensions: data.allowed_extensions,
			};
			const newAnswer =
				selectedAnswerData.id === -1
					? await addAnswer({
							questionId: selectedQuestion,
							pageId: selectedPageInfo.pageId,
							params,
						})
					: await updateAnswer({
							pageId: selectedPageInfo.pageId,
							answerId: selectedAnswerData.id,
							params,
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

	const onCopyText = (field: string, text: string) => {
		navigator.clipboard.writeText(text);
		setCopiedField(field);
		setTimeout(() => setCopiedField(null), 2000);
	};

	const handleSelectImage = async (doc: DocListItem) => {
		// Unlink the previous image first if there is one
		if (attachedImage && attachedImage.id !== doc.id) {
			try {
				await updateDoc({
					docId: attachedImage.id,
					params: { answer_id: null },
				});
			} catch (e) {
				console.error('Failed to unlink previous image:', e);
				// Continue anyway - the new document will be linked
			}
		}
		setAttachedImage(doc);
		setShowDocSelector(false);
	};

	const handleRemoveImage = async () => {
		if (!attachedImage) return;
		try {
			// Unlink the document instead of deleting it
			await updateDoc({
				docId: attachedImage.id,
				params: { answer_id: null },
			});
			setAttachedImage(null);
		} catch (e) {
			console.error(e);
			alert('Failed to remove image attachment');
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
						<FormatQuote sx={{ color: theme.palette.warning.main, marginRight: '10px' }} />
						<Typography color="warning" lineHeight={'21px'} fontSize={17} minWidth={200}>
							{answerText === '' && isPlaceholder ? 'New answer' : answerText} (p{selectedPageInfo.pageId}
							.q{selectedQuestion}.a
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
								disabled: inTransition || (isPlaceholder ? !isValid : !isDirty),
								color: 'primary',
								sx: { height: 25 },
								startIcon: <CheckCircle />,
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
					<Grid container>
						<Grid container alignItems="center">
							<Grid margin="5px">
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
											slotProps={{
												input: {
													endAdornment: (
														<InputAdornment position="end">
															<IconButton
																disableRipple
																onClick={() => onCopyText(field.name, field.value)}
															>
																{copiedField === field.name ? (
																	<Check
																		sx={{ color: theme.palette.success.light }}
																	/>
																) : (
																	<ContentCopy sx={{ color: BASE_COLOR_LIGHT }} />
																)}
															</IconButton>
														</InputAdornment>
													),
												},
											}}
											sx={styles.textFieldOverrides}
											style={styles.item}
										/>
									)}
								/>
							</Grid>

							<Grid margin="5px">
								<Controller
									name="description_text"
									control={control}
									render={({ field }) => (
										<TextField
											label="Answer description (optional)"
											placeholder="Damage as a result of leaks or condensation"
											variant="outlined"
											{...field}
											slotProps={{
												input: {
													endAdornment: (
														<InputAdornment position="end">
															<IconButton
																disableRipple
																onClick={() =>
																	onCopyText(field.name, field.value ?? '')
																}
															>
																{copiedField === field.name ? (
																	<Check
																		sx={{ color: theme.palette.success.light }}
																	/>
																) : (
																	<ContentCopy sx={{ color: BASE_COLOR_LIGHT }} />
																)}
															</IconButton>
														</InputAdornment>
													),
												},
											}}
											value={field.value ?? ''}
											sx={{ ...styles.textFieldOverrides, width: 400 }}
											style={styles.item}
										/>
									)}
								/>
							</Grid>
						</Grid>

						<Grid container alignItems="center">
							<Grid margin="5px">
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
							</Grid>
							<Grid margin="5px">
								<Controller
									name="position"
									control={control}
									rules={{ required: true }}
									render={({ field }) => (
										<FormControl style={{ padding: '0px 5px' }}>
											<FormLabel sx={styles.formLabel}>Order</FormLabel>
											<Select
												variant="outlined"
												error={!!errors.position}
												{...field}
												sx={{ ...styles.textFieldOverrides, width: 80, height: 35 }}
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
							</Grid>

							<Grid margin="5px">
								<Controller
									name="calls_instance_id"
									control={control}
									render={({ field }) => (
										<FormControl style={{ padding: '0px 5px' }}>
											<FormLabel sx={styles.formLabel}>Calls page (optional)</FormLabel>
											<Select
												displayEmpty
												variant="outlined"
												error={!!errors.calls_instance_id}
												{...field}
												value={field.value ?? ''}
												renderValue={(value) => {
													if (value === 0) return 'None';
													const option = pageInstanceOptions.find(
														(o) => o.instanceId === value
													);
													return option
														? `${option.title} (p${option.pageId}.i${option.instanceId})`
														: 'Choose a page';
												}}
												sx={{ ...styles.textFieldOverrides, height: 35 }}
											>
												<MenuItem key="none" value="">
													<Typography fontSize={13}>None</Typography>
												</MenuItem>
												{pageInstanceOptions
													.sort((a, b) => a.pageId - b.pageId)
													.map((o) => (
														<MenuItem key={o.instanceId} value={o.instanceId}>
															<Typography fontSize={13}>
																{o.title} (p{o.pageId}.i{o.instanceId})
															</Typography>
														</MenuItem>
													))}
											</Select>
										</FormControl>
									)}
								/>
							</Grid>
						</Grid>

						<Grid container alignItems="center">
							<Grid margin="5px">
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
							</Grid>
							<Grid margin="5px">
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
													value={Boolean(field?.value)}
													disabled={Boolean(requiresUpload)}
													sx={{ width: 15, height: 15 }}
												/>
												<FormLabel sx={{ fontSize: 12, paddingLeft: '5px' }}>
													Requires additional info...
												</FormLabel>
											</div>
										</FormControl>
									)}
								/>
							</Grid>
							<Grid margin="5px">
								<Controller
									name="requires_upload"
									control={control}
									render={({ field }) => (
										<FormControl style={styles.item}>
											<div className="flex-row-left">
												<Checkbox
													{...field}
													onChange={(e) => field.onChange(e.target.checked)}
													checked={Boolean(field?.value)}
													value={Boolean(field?.value)}
													disabled={Boolean(hasAdditionalInfo)}
													sx={{ width: 15, height: 15 }}
												/>
												<FormLabel sx={{ fontSize: 12, paddingLeft: '5px' }}>
													Requires file upload
												</FormLabel>
											</div>
										</FormControl>
									)}
								/>
							</Grid>
						</Grid>

						<Collapse in={!!requiresUpload}>
							<Grid margin="5px">
								<Controller
									name="allowed_extensions"
									control={control}
									render={({ field }) => {
										const selectedExtensions = field.value
											? field.value.split(',').filter(Boolean)
											: [];
										const allExtensions = Array.from(new Set(getAllowedExtensions()));

										return (
											<FormControl sx={{ minWidth: 300 }} size="small">
												<FormLabel sx={{ fontSize: 12, mb: 0.5 }}>
													Allowed file extensions (optional)
												</FormLabel>
												<Select
													{...field}
													multiple
													value={selectedExtensions}
													onChange={(e) => {
														const value = e.target.value;
														const extensionsArray =
															typeof value === 'string' ? value.split(',') : value;
														field.onChange(extensionsArray.join(','));
													}}
													renderValue={(selected) => {
														if (selected.length === 0) {
															return (
																<em style={{ fontSize: 12, color: '#999' }}>
																	All file types allowed
																</em>
															);
														}
														return selected.join(', ');
													}}
													displayEmpty
													sx={{ fontSize: 13 }}
												>
													{allExtensions.map((ext) => (
														<MenuItem key={ext} value={ext} sx={{ fontSize: 13 }}>
															<Checkbox
																checked={selectedExtensions.indexOf(ext) > -1}
																sx={{ width: 15, height: 15, mr: 1 }}
															/>
															{ext}
														</MenuItem>
													))}
												</Select>
											</FormControl>
										);
									}}
								/>
							</Grid>
						</Collapse>

						{/* Image attachment section */}
						<Box display="flex" alignItems="center" margin="5px" gap={1}>
							<Button
								variant="outlined"
								size="small"
								startIcon={<ImageIcon />}
								onClick={() => setShowDocSelector(true)}
								disabled={inTransition || isPlaceholder}
								sx={{ height: 30 }}
							>
								{attachedImage ? 'Change Image' : 'Add Image...'}
							</Button>
							{attachedImage && (
								<Box
									display="flex"
									alignItems="center"
									gap={1}
									bgcolor="#f5f5f5"
									p={1}
									borderRadius={1}
								>
									<Typography fontSize={12} color="text.secondary">
										{attachedImage.title || attachedImage.alias}
									</Typography>
									<ImageTooltip
										imageUrl={`/api/download?docId=${attachedImage.id}`}
										description={attachedImage.title ?? undefined}
									/>
									<IconButton
										size="small"
										onClick={handleRemoveImage}
										disabled={inTransition}
										sx={{ ml: 0.5, padding: 0.5 }}
									>
										<Close sx={{ fontSize: 16 }} />
									</IconButton>
								</Box>
							)}
						</Box>

						<Collapse in={!!hasAdditionalInfo}>
							<Grid container alignItems="center">
								<Grid margin="5px">
									<Controller
										name="additional_info_placeholder"
										control={control}
										render={({ field }) => (
											<TextField
												label="Free-form placeholder (optional)"
												placeholder="Please list"
												variant="outlined"
												{...field}
												slotProps={{
													input: {
														endAdornment: (
															<InputAdornment position="end">
																<IconButton
																	disableRipple
																	onClick={() =>
																		onCopyText(field.name, field.value ?? '')
																	}
																>
																	{copiedField === field.name ? (
																		<Check
																			sx={{ color: theme.palette.success.light }}
																		/>
																	) : (
																		<ContentCopy sx={{ color: BASE_COLOR_LIGHT }} />
																	)}
																</IconButton>
															</InputAdornment>
														),
													},
												}}
												value={field.value ?? ''}
												sx={styles.textFieldOverrides}
												style={styles.item}
											/>
										)}
									/>
								</Grid>
								<Grid margin="5px">
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
								</Grid>
							</Grid>
						</Collapse>
					</Grid>
				</Form>
			</Fade>
			{showActionDialog && <UserActionsDialog />}

			{showDocSelector && (
				<DocumentSelectorDialog
					onClose={() => setShowDocSelector(false)}
					onSelectDocument={handleSelectImage}
					filterByType="all"
					title="Add Document to Answer"
					relationshipData={{ answer_id: selectedAnswerData.id }}
				/>
			)}
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
		zIndex: 100,
		backgroundColor: 'white',
		position: 'absolute',
		marginLeft: '10px',
		padding: '1px 5px',
		fontSize: 12,
		top: -10,
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
			paddingTop: '3px',
			paddingBottom: '3px',
		},
		'& .MuiOutlinedInput-input': {
			paddingTop: '3px',
			paddingBottom: '3px',
		},
	},
	toolbar: {
		color: 'secondary.main',
		fontSize: 20,
		marginRight: '5px',
	},
};
