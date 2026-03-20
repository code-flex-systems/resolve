'use client';
import { Controller, Form, useForm } from 'react-hook-form';
import { useChecklistStore, getSelectedPageInfoOrDefault } from '@/stores/useChecklistStore';
import {
	Box,
	Button,
	Checkbox,
	IconButton,
	InputAdornment,
	MenuItem,
	TextField,
	Fade } from '@mui/material';
import { ActionType, QuestionType } from '@/config/enums';
import { useEffect, useMemo, useState } from 'react';
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
import Card from '@/components/ui/Card';
import { BASE_COLOR_LIGHT, BG_TERTIARY, BORDER_COLOR, TEXT_MUTED } from '@/styles/theme';
import DocumentSelectorDialog from '../admin/DocumentSelectorDialog';
import type { DocListItem } from '@/hooks/trpc/useDocTrpc';
import { useDocTrpc } from '@/hooks/trpc/useDocTrpc';
import ImageTooltip from '../common/ImageTooltip';
import { getAllowedExtensions } from '@/config/allowedFileTypes';
import DocumentIconWithPreview from '../common/DocumentIconWithPreview';
import { useCrudAlerts } from '@/hooks/useCrudAlerts';
import { IconCheck, IconCircleCheck, IconCopy, IconPaperclip, IconQuote, IconShare, IconTrash, IconX } from '@tabler/icons-react';
import Collapse from '@/components/ui/Collapse';
import Divider from '@/components/ui/Divider';

function formatActionText(action: any | undefined) {
	if (!action) return <></>;
	switch (action.type as ActionType) {
		case ActionType.EMAIL:
			return (
				<span style={{ fontSize: 15, marginLeft: 5 }}>
					This answer currently sends an email to ({action.definition?.recipients?.length}) recipients.
				</span>
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
	const [attachedDoc, setAttachedDoc] = useState<DocListItem | null>(null);
	const { showSuccess, showError } = useCrudAlerts('answer');

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
	const { data: attachedImagesResult } = useDocTrpc().listDocs(
		{
			filters: { answer_id: selectedAnswerData.id },
		},
		{ enabled: selectedAnswerData.id !== -1 }
	);
	const attachedImages = attachedImagesResult?.rows ?? [];

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
			setAttachedDoc(attachedImages[0]); // Only support one image per answer
		} else {
			setAttachedDoc(null);
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
			showSuccess(selectedAnswerData.id === -1 ? 'create' : 'update');
		} catch (e) {
			showError(selectedAnswerData.id === -1 ? 'create' : 'update', e, 'Failed to save answer');
		}
	});

	const onCopy = async () => {
		try {
			const newAnswer = await copyAnswer({
				questionId: selectedQuestion,
				answerId: selectedAnswerData.id,
				pageId: selectedPageInfo.pageId,
			});
			if (newAnswer) {
				updateSelectedAnswer(newAnswer.question_id, newAnswer.id);
				showSuccess('copy');
			}
		} catch (e) {
			showError('copy', e, 'Failed to copy answer');
		}
	};

	const onDelete = async () => {
		try {
			await deleteAnswer({ answerId: selectedAnswerData.id, pageId: selectedPageInfo.pageId });
			updateSelectedAnswer(selectedQuestion, null); // TODO
			showSuccess('delete', 'Answer deleted');
		} catch (e) {
			showError('delete', e, 'Failed to delete answer');
		}
	};

	const onCopyText = (field: string, text: string) => {
		navigator.clipboard.writeText(text);
		setCopiedField(field);
		setTimeout(() => setCopiedField(null), 2000);
	};

	const handleSelectDocument = async (doc: DocListItem) => {
		// Unlink the previous image first if there is one
		if (attachedDoc && attachedDoc.id !== doc.id) {
			try {
				await updateDoc({
					docId: attachedDoc.id,
					params: { answer_id: null },
				});
			} catch (e) {
				console.error('Failed to unlink previous image:', e);
				// Continue anyway - the new document will be linked
			}
		}
		setAttachedDoc(doc);
		setShowDocSelector(false);
	};

	const handleRemoveDocument = async () => {
		if (!attachedDoc) return;
		try {
			// Unlink the document instead of deleting it
			await updateDoc({
				docId: attachedDoc.id,
				params: { answer_id: null },
			});
			setAttachedDoc(null);
			showSuccess('update', 'Attachment removed from answer');
		} catch (e) {
			showError('update', e, 'Failed to remove image attachment');
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
		<Box sx={styles.container}>
			<Toolbar
				left={
					<>
						<IconQuote size={20} style={{ color: 'var(--status-warning)', marginRight: '10px' }} />
						<span style={{ color: 'var(--status-warning)', lineHeight: '21px', fontSize: 17 }}>
							{answerText === '' && isPlaceholder ? 'New answer' : answerText}
						</span>
						<span style={{ fontSize: 13, color: "var(--text-muted)", backgroundColor: "var(--bg-secondary)", padding: "2px 8px", borderRadius: 8, marginLeft: 8 }}>
							p{selectedPageInfo.pageId}.q{selectedQuestion}.a
							{isPlaceholder ? '?' : selectedAnswerData.id}
						</span>
						<Fade in={showUpdateMsg} timeout={500}>
							<Box sx={{ ml: 1.25 }} className="flex-row-left">
								<IconCircleCheck size={20} style={{ color: 'var(--status-success)', marginRight: '5px' }} />
								<span style={{ color: 'var(--status-success)' }}>Saved!</span>
							</Box>
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
										startIcon: <IconTrash size={20} />,
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
										startIcon: <IconCopy size={20} />,
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
								startIcon: <IconCircleCheck size={20} />,
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
			<Box sx={styles.divider}>
				<Divider />
			</Box>
			<Fade
				key={selectedAnswerData.id}
				in={!!selectedAnswerData.id && !fetchingAction}
				timeout={500}
				unmountOnExit
			>
				<Form control={control} style={{ width: '100%' }}>
					<Box sx={styles.formContainer}>
						{/* Basic Information Section */}
						<Card variant="beveled" padding="none" style={{ maxWidth: 600, overflow: 'hidden' }}>
							<div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>Basic Information</div>
							<div style={{ padding: 16 }}>
								<Box sx={styles.fieldRow}>
									<Controller
										name="text"
										control={control}
										rules={{ required: true }}
										render={({ field }) => (
											<TextField
												label="Answer text"
												placeholder="Water Damage"
												variant="outlined"
												fullWidth
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
																		<IconCheck size={20} style={{ color: 'var(--status-success)' }}
																		/>
																	) : (
																		<IconCopy size={20} style={{ color: BASE_COLOR_LIGHT }} />
																	)}
																</IconButton>
																<IconButton
																	disableRipple
																	onClick={() => field.onChange('')}
																	disabled={!field.value}
																>
																	<IconX size={20} style={{ color: BASE_COLOR_LIGHT }} />
																</IconButton>
															</InputAdornment>
														),
													},
												}}
											/>
										)}
									/>
								</Box>
								<Box sx={styles.fieldRow}>
									<Controller
										name="description_text"
										control={control}
										render={({ field }) => (
											<TextField
												label="Description (optional)"
												placeholder="Damage as a result of leaks or condensation"
												variant="outlined"
												fullWidth
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
																		<IconCheck size={20} style={{ color: 'var(--status-success)' }}
																		/>
																	) : (
																		<IconCopy size={20} style={{ color: BASE_COLOR_LIGHT }} />
																	)}
																</IconButton>
																<IconButton
																	disableRipple
																	onClick={() => field.onChange('')}
																	disabled={!field.value}
																>
																	<IconX size={20} style={{ color: BASE_COLOR_LIGHT }} />
																</IconButton>
															</InputAdornment>
														),
													},
												}}
												value={field.value ?? ''}
												multiline
												minRows={3}
											/>
										)}
									/>
								</Box>
							</div>
						</Card>

						{/* Organization Section */}
						<Card variant="beveled" padding="none" style={{ maxWidth: 600, overflow: 'hidden' }}>
							<div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>Organization</div>
							<div style={{ padding: 16 }}>
								<Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
									<Controller
										name="position"
										control={control}
										rules={{ required: true }}
										render={({ field }) => (
											<TextField
												select
												label="Display order"
												error={!!errors.position}
												{...field}
												sx={{ width: 100 }}
											>
												{positionOptions.map((o) => (
													<MenuItem key={o} value={o}>
														{o}
													</MenuItem>
												))}
											</TextField>
										)}
									/>
									<Controller
										name="grade"
										control={control}
										render={({ field }) => (
											<TextField
												label="Grade"
												placeholder="1.1"
												type="number"
												{...field}
												value={field.value ?? ''}
												sx={{ width: 100 }}
											/>
										)}
									/>
									<Controller
										name="calls_instance_id"
										control={control}
										render={({ field }) => (
											<TextField
												select
												label="Navigates to page"
												error={!!errors.calls_instance_id}
												{...field}
												value={field.value ?? ''}
												sx={{ minWidth: 200 }}
												placeholder="Select a page"
											>
												<MenuItem key="none" value="">
													None
												</MenuItem>
												{pageInstanceOptions
													.sort((a, b) => a.pageId - b.pageId)
													.map((o) => (
														<MenuItem key={o.instanceId} value={o.instanceId}>
															{o.title} (p{o.pageId}.i{o.instanceId})
														</MenuItem>
													))}
											</TextField>
										)}
									/>
								</Box>
							</div>
						</Card>

						{/* Behavior Section */}
						<Card variant="beveled" padding="none" style={{ maxWidth: 600, overflow: 'hidden' }}>
							<div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>Behavior</div>
							<div style={{ padding: 16 }}>
								<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
									{/* User Actions */}
									<Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
										<Button
											disabled={inTransition || isFreeform}
											variant="outlined"
											color="primary"
											size="small"
											startIcon={<IconShare size={20} />}
											onClick={toggleActionDialog}
										>
											Configure User Actions
										</Button>
										{formatActionText(answerAction)}
									</Box>

									{/* Checkboxes */}
									<Box sx={{ display: 'flex', gap: 3 }}>
										<Controller
											name="has_additional_info"
											control={control}
											render={({ field }) => (
												<Box sx={styles.checkboxRow}>
													<Checkbox
														{...field}
														onChange={(e) => field.onChange(e.target.checked)}
														checked={Boolean(field?.value)}
														disabled={Boolean(requiresUpload)}
														size="small"
													/>
													<span style={{ fontSize: 13 }}>
														Requires additional text input
													</span>
												</Box>
											)}
										/>
										<Controller
											name="requires_upload"
											control={control}
											render={({ field }) => (
												<Box sx={styles.checkboxRow}>
													<Checkbox
														{...field}
														onChange={(e) => field.onChange(e.target.checked)}
														checked={Boolean(field?.value)}
														disabled={Boolean(hasAdditionalInfo)}
														size="small"
													/>
													<span style={{ fontSize: 13 }}>Requires file upload</span>
												</Box>
											)}
										/>
									</Box>

									{/* File Extensions (conditional) */}
									<Collapse open={!!requiresUpload}>
										<Controller
											name="allowed_extensions"
											control={control}
											render={({ field }) => {
												const selectedExtensions = field.value
													? field.value.split(',').filter(Boolean)
													: [];
												const allExtensions = Array.from(new Set(getAllowedExtensions()));

												return (
													<TextField
														select
														label="Allowed file extensions"
														{...field}
														value={selectedExtensions}
														onChange={(e) => {
															const value = e.target.value;
															const extensionsArray =
																typeof value === 'string' ? value.split(',') : value;
															field.onChange(extensionsArray.join(','));
														}}
														slotProps={{
															select: {
																multiple: true,
																displayEmpty: true,
																renderValue: (selected) => {
																	const sel = selected as string[];
																	if (sel.length === 0) {
																		return (
																			<em style={{ fontSize: 12, color: '#999' }}>
																				All file types allowed
																			</em>
																		);
																	}
																	return sel.join(', ');
																},
															},
														}}
														sx={{ maxWidth: 350 }}
													>
														{allExtensions.map((ext) => (
															<MenuItem key={ext} value={ext}>
																<Checkbox
																	checked={selectedExtensions.indexOf(ext) > -1}
																	size="small"
																/>
																{ext}
															</MenuItem>
														))}
													</TextField>
												);
											}}
										/>
									</Collapse>

									{/* Additional Info Fields (conditional) */}
									<Collapse open={!!hasAdditionalInfo}>
										<Box sx={{ display: 'flex', gap: 2 }}>
											<Controller
												name="additional_info_placeholder"
												control={control}
												render={({ field }) => (
													<TextField
														label="Placeholder text"
														placeholder="Please list"
														variant="outlined"
														size="small"
														{...field}
														slotProps={{
															input: {
																endAdornment: (
																	<InputAdornment position="end">
																		<IconButton
																			disableRipple
																			size="small"
																			onClick={() =>
																				onCopyText(
																					field.name,
																					field.value ?? ''
																				)
																			}
																		>
																			{copiedField === field.name ? (
																				<IconCheck size={20} style={{ color: 'var(--status-success-bg)',
																						fontSize: 16, }}
																				/>
																			) : (
																				<IconCopy size={20} style={{ color: BASE_COLOR_LIGHT,
																						fontSize: 16, }}
																				/>
																			)}
																		</IconButton>
																		<IconButton
																			disableRipple
																			size="small"
																			onClick={() => field.onChange('')}
																			disabled={!field.value}
																		>
																			<IconX size={20} style={{ color: BASE_COLOR_LIGHT,
																					fontSize: 16, }}
																			/>
																		</IconButton>
																	</InputAdornment>
																),
															},
														}}
														value={field.value ?? ''}
														sx={{ width: 300 }}
													/>
												)}
											/>
											<Controller
												name="additional_info_num_lines"
												control={control}
												render={({ field }) => (
													<TextField
														label="Number of lines"
														placeholder="2"
														variant="outlined"
														type="number"
														size="small"
														{...field}
														value={field.value ?? ''}
														sx={{ width: 120 }}
													/>
												)}
											/>
										</Box>
									</Collapse>
								</Box>
							</div>
						</Card>

						{/* Attachments Section */}
						<Card variant="beveled" padding="none" style={{ maxWidth: 600, overflow: 'hidden' }}>
							<div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>Attachments</div>
							<div style={{ padding: 16 }}>
								<Box display="flex" alignItems="center" gap={1.5}>
									<Button
										variant="outlined"
										size="small"
										startIcon={<IconPaperclip size={20} />}
										onClick={() => setShowDocSelector(true)}
										disabled={inTransition || isPlaceholder}
									>
										{attachedDoc ? 'Change Document' : 'Add Document'}
									</Button>
									{attachedDoc && (
										<Box sx={styles.attachmentChip}>
											<span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
												{attachedDoc.title || attachedDoc.alias}
											</span>
											{attachedDoc.mime_type?.startsWith('image/') ? (
												<ImageTooltip
													imageUrl={`/api/download?docId=${attachedDoc.id}`}
													description={attachedDoc.title ?? undefined}
												/>
											) : (
												<DocumentIconWithPreview document={attachedDoc} />
											)}
											<IconButton
												size="small"
												onClick={handleRemoveDocument}
												disabled={inTransition}
												sx={{ padding: '2px' }}
											>
												<IconX size={14} />
											</IconButton>
										</Box>
									)}
								</Box>
							</div>
						</Card>
					</Box>
				</Form>
			</Fade>
			{showActionDialog && <UserActionsDialog />}

			{showDocSelector && (
				<DocumentSelectorDialog
					onClose={() => setShowDocSelector(false)}
					onSelectDocument={handleSelectDocument}
					filterByType="all"
					title="Add Document to Answer"
					relationshipData={{ answer_id: selectedAnswerData.id }}
				/>
			)}
		</Box>
	);
}

const styles = {
	container: {
		width: '100%',
		height: '100%',
		display: 'flex',
		flexDirection: 'column',
		p: 2.5,
		minWidth: 500,
		overflow: 'auto',
	},
	divider: {
		width: '100%',
		mb: 3,
	},
	formContainer: {
		display: 'flex',
		flexDirection: 'column',
		gap: 2.5,
		width: '100%',
	},
	fieldRow: {
		mb: 2,
		'&:last-child': {
			mb: 0,
		},
	},
	checkboxRow: {
		display: 'flex',
		alignItems: 'center',
		gap: 0.5,
	},
	attachmentChip: {
		display: 'flex',
		alignItems: 'center',
		gap: 1,
		bgcolor: BG_TERTIARY,
		border: `1px solid ${BORDER_COLOR}`,
		borderRadius: '8px',
		px: 1.5,
		py: 0.75,
	},
};
