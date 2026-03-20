'use client';
import { Controller, Form, useForm } from 'react-hook-form';
import { useChecklistStore, getSelectedPageInfoOrDefault } from '@/stores/useChecklistStore';
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
import BasicIconButton from '../common/BasicIconButton';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import CustomCheckbox from '@/components/ui/Checkbox';
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
import Input from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Input';

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
		for (const edge of callGraphData) {
			const fromSet = graph.get(edge.from_instance_id);
			if (fromSet) {
				fromSet.add(edge.to_instance_id);
			}
		}
		return graph;
	}, [navigation.tree, callGraphData]);

	const pageInstanceOptions = useMemo(() => {
		return allPageInstanceOptions.filter((option) => {
			if (selectedAnswerData.calls_instance_id === option.instanceId) return true;
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

	useEffect(() => {
		if (attachedImages.length > 0) {
			setAttachedDoc(attachedImages[0]);
		} else {
			setAttachedDoc(null);
		}
	}, [attachedImages]);

	const onSubmit = handleSubmit(async (data) => {
		try {
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
					? await addAnswer({ questionId: selectedQuestion, pageId: selectedPageInfo.pageId, params })
					: await updateAnswer({ pageId: selectedPageInfo.pageId, answerId: selectedAnswerData.id, params });
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
			updateSelectedAnswer(selectedQuestion, null);
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
		if (attachedDoc && attachedDoc.id !== doc.id) {
			try {
				await updateDoc({ docId: attachedDoc.id, params: { answer_id: null } });
			} catch (e) {
				console.error('Failed to unlink previous image:', e);
			}
		}
		setAttachedDoc(doc);
		setShowDocSelector(false);
	};

	const handleRemoveDocument = async () => {
		if (!attachedDoc) return;
		try {
			await updateDoc({ docId: attachedDoc.id, params: { answer_id: null } });
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
		<div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: 20, minWidth: 500, overflow: 'auto' }}>
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
						{showUpdateMsg && (
							<span style={{ marginLeft: 10 }} className="flex-row-left">
								<IconCircleCheck size={20} style={{ color: 'var(--status-success)', marginRight: '5px' }} />
								<span style={{ color: 'var(--status-success)' }}>Saved!</span>
							</span>
						)}
					</>
				}
				leftWidth="60%"
				right={
					<>
						{!isPlaceholder && (
							<>
								<BasicButtonStyled
									buttonProps={{ onClick: onDelete, disabled: inTransition || isFreeform, startIcon: <IconTrash size={20} /> }}
									tooltipProps={{ title: isFreeform ? `Question ${scopedQuestionId} is free-form. Please change the question type to remove this answer.` : '' }}
								>
									Delete
								</BasicButtonStyled>
								<BasicButtonStyled
									buttonProps={{ onClick: onCopy, disabled: inTransition || isFreeform, startIcon: <IconCopy size={20} /> }}
									tooltipProps={{ title: isFreeform ? `Question ${scopedQuestionId} is free-form. Please change the question type to copy this answer.` : '' }}
								>
									Copy
								</BasicButtonStyled>
							</>
						)}
						<BasicButtonStyled
							buttonProps={{ onClick: onSubmit, disabled: inTransition || (isPlaceholder ? !isValid : !isDirty), color: 'primary', startIcon: <IconCircleCheck size={20} /> }}
						>
							{isPlaceholder ? 'Add' : 'Save'}
						</BasicButtonStyled>
					</>
				}
				rightWidth="40%"
				height={60}
				padding={'10px 0px'}
			/>
			<div style={{ width: '100%', marginBottom: 24 }}>
				<Divider />
			</div>
			{!!selectedAnswerData.id && !fetchingAction && (
				<Form control={control} style={{ width: '100%' }}>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%' }}>
						{/* Basic Information Section */}
						<Card variant="beveled" padding="none" style={{ maxWidth: 600, overflow: 'hidden' }}>
							<div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>Basic Information</div>
							<div style={{ padding: 16 }}>
								<div style={{ marginBottom: 16 }}>
									<Controller
										name="text"
										control={control}
										rules={{ required: true }}
										render={({ field }) => (
											<Input
												label="Answer text"
												placeholder="Water Damage"
												fullWidth
												error={!!errors.text}
												{...field}
												endAdornment={
													<>
														<BasicIconButton onClick={() => onCopyText(field.name, field.value)}>
															{copiedField === field.name ? (
																<IconCheck size={20} style={{ color: 'var(--status-success)' }} />
															) : (
																<IconCopy size={20} style={{ color: 'var(--text-muted)' }} />
															)}
														</BasicIconButton>
														<BasicIconButton onClick={() => field.onChange('')} disabled={!field.value}>
															<IconX size={20} style={{ color: 'var(--text-muted)' }} />
														</BasicIconButton>
													</>
												}
											/>
										)}
									/>
								</div>
								<div>
									<Controller
										name="description_text"
										control={control}
										render={({ field }) => (
											<Textarea
												label="Description (optional)"
												placeholder="Damage as a result of leaks or condensation"
												fullWidth
												{...field}
												value={field.value ?? ''}
												minRows={3}
												endAdornment={
													<>
														<BasicIconButton onClick={() => onCopyText(field.name, field.value ?? '')}>
															{copiedField === field.name ? (
																<IconCheck size={20} style={{ color: 'var(--status-success)' }} />
															) : (
																<IconCopy size={20} style={{ color: 'var(--text-muted)' }} />
															)}
														</BasicIconButton>
														<BasicIconButton onClick={() => field.onChange('')} disabled={!field.value}>
															<IconX size={20} style={{ color: 'var(--text-muted)' }} />
														</BasicIconButton>
													</>
												}
											/>
										)}
									/>
								</div>
							</div>
						</Card>

						{/* Organization Section */}
						<Card variant="beveled" padding="none" style={{ maxWidth: 600, overflow: 'hidden' }}>
							<div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>Organization</div>
							<div style={{ padding: 16 }}>
								<div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
									<Controller
										name="position"
										control={control}
										rules={{ required: true }}
										render={({ field }) => (
											<div>
												<label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>Display order</label>
												<select
													{...field}
													onChange={(e) => field.onChange(Number(e.target.value))}
													style={{ width: 100, padding: '8px', borderRadius: 6, border: errors.position ? '1px solid var(--status-error)' : '1px solid var(--border)', fontSize: 14, backgroundColor: 'var(--bg-white)' }}
												>
													{positionOptions.map((o) => (
														<option key={o} value={o}>{o}</option>
													))}
												</select>
											</div>
										)}
									/>
									<Controller
										name="grade"
										control={control}
										render={({ field }) => (
											<Input
												label="Grade"
												placeholder="1.1"
												type="number"
												{...field}
												value={field.value ?? ''}
												style={{ width: 100 }}
											/>
										)}
									/>
									<Controller
										name="calls_instance_id"
										control={control}
										render={({ field }) => (
											<div>
												<label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>Navigates to page</label>
												<select
													{...field}
													value={field.value ?? ''}
													onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
													style={{ minWidth: 200, padding: '8px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 14, backgroundColor: 'var(--bg-white)' }}
												>
													<option value="">None</option>
													{pageInstanceOptions
														.sort((a, b) => a.pageId - b.pageId)
														.map((o) => (
															<option key={o.instanceId} value={o.instanceId}>
																{o.title} (p{o.pageId}.i{o.instanceId})
															</option>
														))}
												</select>
											</div>
										)}
									/>
								</div>
							</div>
						</Card>

						{/* Behavior Section */}
						<Card variant="beveled" padding="none" style={{ maxWidth: 600, overflow: 'hidden' }}>
							<div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>Behavior</div>
							<div style={{ padding: 16 }}>
								<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
									<div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
										<Button
											disabled={inTransition || isFreeform}
											variant="outlined"
											size="sm"
											startIcon={<IconShare size={20} />}
											onClick={toggleActionDialog}
										>
											Configure User Actions
										</Button>
										{formatActionText(answerAction)}
									</div>

									<div style={{ display: 'flex', gap: 24 }}>
										<Controller
											name="has_additional_info"
											control={control}
											render={({ field }) => (
												<CustomCheckbox
													checked={Boolean(field?.value)}
													onChange={(checked) => field.onChange(checked)}
													disabled={Boolean(requiresUpload)}
													label="Requires additional text input"
												/>
											)}
										/>
										<Controller
											name="requires_upload"
											control={control}
											render={({ field }) => (
												<CustomCheckbox
													checked={Boolean(field?.value)}
													onChange={(checked) => field.onChange(checked)}
													disabled={Boolean(hasAdditionalInfo)}
													label="Requires file upload"
												/>
											)}
										/>
									</div>

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
													<div>
														<label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>Allowed file extensions</label>
														<div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, maxWidth: 350 }}>
															{allExtensions.map((ext) => (
																<label key={ext} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, cursor: 'pointer' }}>
																	<input
																		type="checkbox"
																		checked={selectedExtensions.includes(ext)}
																		onChange={(e) => {
																			const newExts = e.target.checked
																				? [...selectedExtensions, ext]
																				: selectedExtensions.filter((x: string) => x !== ext);
																			field.onChange(newExts.join(','));
																		}}
																	/>
																	{ext}
																</label>
															))}
														</div>
														{selectedExtensions.length === 0 && (
															<em style={{ fontSize: 12, color: '#999' }}>All file types allowed</em>
														)}
													</div>
												);
											}}
										/>
									</Collapse>

									<Collapse open={!!hasAdditionalInfo}>
										<div style={{ display: 'flex', gap: 16 }}>
											<Controller
												name="additional_info_placeholder"
												control={control}
												render={({ field }) => (
													<Input
														label="Placeholder text"
														placeholder="Please list"
														{...field}
														value={field.value ?? ''}
														style={{ width: 300 }}
														endAdornment={
															<>
																<BasicIconButton onClick={() => onCopyText(field.name, field.value ?? '')}>
																	{copiedField === field.name ? (
																		<IconCheck size={16} style={{ color: 'var(--status-success)' }} />
																	) : (
																		<IconCopy size={16} style={{ color: 'var(--text-muted)' }} />
																	)}
																</BasicIconButton>
																<BasicIconButton onClick={() => field.onChange('')} disabled={!field.value}>
																	<IconX size={16} style={{ color: 'var(--text-muted)' }} />
																</BasicIconButton>
															</>
														}
													/>
												)}
											/>
											<Controller
												name="additional_info_num_lines"
												control={control}
												render={({ field }) => (
													<Input
														label="Number of lines"
														placeholder="2"
														type="number"
														{...field}
														value={field.value ?? ''}
														style={{ width: 120 }}
													/>
												)}
											/>
										</div>
									</Collapse>
								</div>
							</div>
						</Card>

						{/* Attachments Section */}
						<Card variant="beveled" padding="none" style={{ maxWidth: 600, overflow: 'hidden' }}>
							<div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>Attachments</div>
							<div style={{ padding: 16 }}>
								<div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
									<Button
										variant="outlined"
										size="sm"
										startIcon={<IconPaperclip size={20} />}
										onClick={() => setShowDocSelector(true)}
										disabled={inTransition || isPlaceholder}
									>
										{attachedDoc ? 'Change Document' : 'Add Document'}
									</Button>
									{attachedDoc && (
										<div style={{ display: 'flex', alignItems: 'center', gap: 8, backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-strong)', borderRadius: 8, padding: '6px 12px' }}>
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
											<BasicIconButton onClick={handleRemoveDocument} disabled={inTransition}>
												<IconX size={14} />
											</BasicIconButton>
										</div>
									)}
								</div>
							</div>
						</Card>
					</div>
				</Form>
			)}
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
		</div>
	);
}
