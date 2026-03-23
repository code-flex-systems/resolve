'use client';
import { useChecklistStore, getSelectedPageInfoOrDefault, findInstancesByTemplateId } from '@/stores/useChecklistStore';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import FormQuestion from './FormQuestion';
import FormAnswer from './FormAnswer';
import CopyPageDialog from './CopyPageDialog';
import BasicButton from '../common/BasicButton';
import { useEffect, useMemo, useState } from 'react';
import { useQuestionTrpc } from '@/hooks/trpc/useQuestionTrpc';
import { useChecklistParams } from '@/hooks/useChecklistParams';
import { usePageTrpc } from '@/hooks/trpc/usePageTrpc';
import Card from '@/components/ui/Card';
import { useCrudAlerts } from '@/hooks/useCrudAlerts';
import { IconArrowRight, IconCheck, IconCopy, IconCornerDownRight, IconDeviceFloppy, IconFileDescription, IconHelpCircle, IconQuote, IconTrash, IconX } from '@tabler/icons-react';

export default function PageEditor() {
	const { checklistId = '', claimId = '' } = useChecklistParams();
	const selectedAnswer = useChecklistStore((state) => state.selectedAnswer);
	const selectedQuestion = useChecklistStore((state) => state.selectedQuestion);
	const selectedPageInstance = useChecklistStore((state) => state.selectedPageInstance);
	const selectedPageInfo = getSelectedPageInfoOrDefault();
	const updateSelectedPage = useChecklistStore((state) => state.updateSelectedPage);
	const updateSelectedPageInfo = useChecklistStore((state) => state.updateSelectedPageInfo);
	const updateSelectedPageInfoSearch = useChecklistStore((state) => state.updateSelectedPageInfoSearch);
	const updateSelectedPageTitle = useChecklistStore((state) => state.updateSelectedPageTitle);

	const [pageTitle, setPageTitle] = useState('');

	const [copyDialogOpen, setCopyDialogOpen] = useState(false);
	const [copyType, setCopyType] = useState<'template' | 'instance'>('template');
	const [copiedField, setCopiedField] = useState<string | null>(null);

	const { data: questions = [] } = useQuestionTrpc().list({ pageId: selectedPageInfo.pageId }, { enabled: !!selectedPageInfo.pageId });
	const { createTemplate, copyTemplate, createInstance, removeInstance, updateTemplate, getInstanceTree } =
		usePageTrpc();
	const { mutateAsync: addPage, isPending: adding } = createTemplate;
	const { mutateAsync: copyPageTemplate, isPending: copyingTemplate } = copyTemplate;
	const { mutateAsync: copyPageInstance, isPending: copyingInstance } = createInstance;
	const { mutateAsync: deletePage, isPending: deleting } = removeInstance;
	const { mutateAsync: modifyPage, isPending: updating } = updateTemplate;
	const {
		isFetching,
		data = { tree: [], maxPosition: 0 },
		refetch: refetchTree,
	} = getInstanceTree(
		{
			checklistId,
			claimId,
		},
		{ enabled: !!checklistId && !!claimId }
	);

	const answerCount = questions.reduce((prev, curr) => prev + (curr.answers?.length ?? 0), 0);
	const inTransition = adding || copyingTemplate || copyingInstance || deleting || isFetching;
	const { showSuccess, showError } = useCrudAlerts('page');

	// Sync pageTitle state when selected page changes
	useEffect(() => {
		setPageTitle(selectedPageInfo.title);
	}, [selectedPageInfo.instanceId, selectedPageInfo.title]);

	const otherInstances = useMemo(() => {
		return findInstancesByTemplateId(selectedPageInfo.pageId, data.tree).filter(
			(node) => node.instanceId !== selectedPageInfo.instanceId
		);
	}, [selectedPageInfo, data.tree]);

	const onAddPage = async (passedParentId: string | null) => {
		try {
			const newInstance = await addPage({
				checklistId,
				params: {
					title: 'New Page',
					parentId: passedParentId ?? undefined,
					position: selectedPageInfo.position + 1,
				},
			});
			if (newInstance) {
				const { data: freshData } = await refetchTree();
				updateSelectedPage(newInstance.instance_id);
				if (freshData) {
					updateSelectedPageInfoSearch(newInstance.instance_id, freshData.tree);
				}
				showSuccess('create', 'Page created');
			}
		} catch (e) {
			showError('create', e, 'Failed to create page');
		}
	};

	const handleCopyWithParent = async (parentId: string | null, position: number) => {
		try {
			if (copyType === 'template') {
				const newPage = await copyPageTemplate({
					checklistId,
					pageId: selectedPageInfo.pageId,
					params: {
						parentId: parentId ?? undefined,
						position,
					},
				});
				if (newPage) {
					const { data: freshData } = await refetchTree();
					updateSelectedPage(newPage.instance_id);
					if (freshData) {
						updateSelectedPageInfoSearch(newPage.instance_id, freshData.tree);
					}
					showSuccess('copy', 'Page copied');
				}
			} else {
				const newInstance = await copyPageInstance({
					checklistId,
					pageId: selectedPageInfo.pageId,
					params: {
						parentId: parentId ?? undefined,
						position,
					},
				});
				if (newInstance) {
					const { data: freshData } = await refetchTree();
					updateSelectedPage(newInstance.id);
					if (freshData) {
						updateSelectedPageInfoSearch(newInstance.id, freshData.tree);
					}
					showSuccess('copy', 'Page copied');
				}
			}
		} catch (e) {
			showError('copy', e, 'Failed to copy page');
		}
	};

	const onDeletePage = async () => {
		try {
			await deletePage({ instanceId: selectedPageInfo.instanceId });
			await refetchTree();
			updateSelectedPage(null);
			updateSelectedPageInfo(null);
			showSuccess('delete', 'Page deleted');
		} catch (e) {
			showError('delete', e, 'Failed to delete page');
		}
	};

	const onModifyPage = async (newTitle?: string) => {
		const titleToSave = newTitle ?? pageTitle;
		try {
			const modifiedPage = await modifyPage({ id: selectedPageInfo.pageId, params: { title: titleToSave } });
			if (modifiedPage) {
				const { data: freshData } = await refetchTree();
				if (freshData) {
					updateSelectedPageTitle(selectedPageInfo.instanceId, modifiedPage.title, freshData.tree);
				}
				showSuccess('update', 'Page updated');
			}
		} catch (e) {
			showError('update', e, 'Failed to update page');
		}
	};

	const onCopyText = (field: string, text: string) => {
		navigator.clipboard.writeText(text);
		setCopiedField(field);
		setTimeout(() => setCopiedField(null), 2000);
	};

	const onClearField = () => {
		setPageTitle('');
	};

	return (
		<div style={pageStyles.container}>
			{!!selectedPageInstance && !selectedQuestion && !selectedAnswer && (
				<div style={pageStyles.formContainer}>
					<Card variant="beveled" padding="none" style={{ maxWidth: 600, overflow: 'hidden' }}>
						<div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>Information</div>
						<div style={{ padding: 16 }}>
							<div style={pageStyles.fieldRow}>
								<Input
									label="Page title"
									placeholder="New Page"
									fullWidth
									value={pageTitle}
									onChange={(e) => setPageTitle(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === 'Enter' && pageTitle && pageTitle !== selectedPageInfo.title) {
											onModifyPage();
										}
									}}
									disabled={updating}
									error={pageTitle === ''}
									endAdornment={
										<span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
											<Button
												variant="icon"
												size="sm"
												onClick={() => onCopyText('pageTitle', pageTitle)}>
												{copiedField === 'pageTitle' ? (
													<IconCheck size={20} style={{ color: 'var(--status-success)',
															fontSize: 18, }}
													/>
												) : (
													<IconCopy size={20} style={{ color: 'var(--text-muted)', fontSize: 18 }}
													/>
												)}
											</Button>
											<Button
												variant="icon"
												size="sm"
												onClick={onClearField}
												disabled={!pageTitle}>
												<IconX size={20} style={{ color: 'var(--text-muted)', fontSize: 18 }} />
											</Button>
											<Button
												variant="icon"
												size="sm"
												onClick={() => onModifyPage()}
												disabled={
													updating ||
													!pageTitle ||
													pageTitle === selectedPageInfo.title
												}>
												<IconDeviceFloppy size={20} style={{ color: !updating &&
															pageTitle &&
															pageTitle !== selectedPageInfo.title
																? 'var(--text-accent)'
																: 'var(--text-muted)',
														fontSize: 18, }}
												/>
											</Button>
										</span>
									}
								/>
							</div>
							<div style={pageStyles.statsRow}>
								<div style={pageStyles.statItem}>
									<IconHelpCircle size={18} style={{ color: 'var(--text-secondary)' }} />
									<span style={{ fontSize: 13 }}>
										<strong>{questions.length}</strong>{' '}
										{questions.length === 1 ? 'Question' : 'Questions'}
									</span>
								</div>
								<div style={pageStyles.statItem}>
									<IconQuote size={18} style={{ color: 'var(--text-secondary)' }} />
									<span style={{ fontSize: 13 }}>
										<strong>{answerCount}</strong> {answerCount === 1 ? 'Answer' : 'Answers'}
									</span>
								</div>
							</div>
						</div>
					</Card>

					{/* Related Instances Section */}
					{otherInstances.length> 0 && (
						<Card variant="beveled" padding="none" style={{ maxWidth: 600, overflow: 'hidden' }}>
							<div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>Related Instances</div>
							<div style={{ padding: 16 }}>
								<span style={{ fontSize: 13, color: 'text.secondary', marginBottom: 8 }}>
									{otherInstances.length === 1
										? 'Another page uses this template:'
										: `${otherInstances.length} other pages use this template:`}
								</span>
								<div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8 }}>
									{otherInstances.map((node) => (
										<button
											key={node.instanceId}
											onClick={() => {
												updateSelectedPage(node.instanceId);
												updateSelectedPageInfo(node);
											}}
											style={{ fontSize: 13, paddingLeft: 12, paddingRight: 12, paddingTop: 4, paddingBottom: 4, borderRadius: '6px', cursor: 'pointer', background: 'none', border: 'none', color: 'var(--text-accent)', font: 'inherit' }}>
											p{node.pageId}.i{node.instanceId}
										</button>
									))}
								</div>
							</div>
						</Card>
					)}

					{/* Actions Section */}
					<Card variant="beveled" padding="none" style={{ maxWidth: 600, overflow: 'hidden' }}>
						<div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>Actions</div>
						<div style={{ padding: 16 }}>
							<div style={pageStyles.actionsGrid}>
								<div style={pageStyles.actionGroup}>
									<span style={pageStyles.actionGroupTitle}>Copy</span>
									<div style={pageStyles.actionButtons}>
										<BasicButton
											buttonProps={{
												onClick: () => {
													setCopyType('template');
													setCopyDialogOpen(true);
												},
												disabled: inTransition,
												variant: 'outlined',
												size: 'small',
												startIcon: <IconCopy size={16} />,
											}}>
											Copy template
										</BasicButton>
										<BasicButton
											buttonProps={{
												onClick: () => {
													setCopyType('instance');
													setCopyDialogOpen(true);
												},
												disabled: inTransition,
												variant: 'outlined',
												size: 'small',
												startIcon: <IconCopy size={16} />,
											}}>
											Copy instance
										</BasicButton>
									</div>
								</div>

								<div style={pageStyles.actionGroup}>
									<span style={pageStyles.actionGroupTitle}>Create</span>
									<div style={pageStyles.actionButtons}>
										<BasicButton
											buttonProps={{
												onClick: () =>
													onAddPage(selectedPageInfo.parentInstanceId).catch((e) =>
														console.error(e)
													),
												disabled: inTransition,
												variant: 'outlined',
												size: 'small',
												startIcon: <IconArrowRight size={16} />,
											}}>
											New sibling
										</BasicButton>
										<BasicButton
											buttonProps={{
												onClick: () =>
													onAddPage(selectedPageInfo.instanceId).catch((e) =>
														console.error(e)
													),
												disabled: inTransition,
												variant: 'outlined',
												size: 'small',
												startIcon: <IconCornerDownRight size={16} />,
											}}>
											New child
										</BasicButton>
									</div>
								</div>

								<div style={pageStyles.actionGroup}>
									<span style={pageStyles.actionGroupTitle}>Delete</span>
									<div style={pageStyles.actionButtons}>
										<BasicButton
											buttonProps={{
												onClick: () => onDeletePage().catch((e) => console.error(e)),
												disabled: inTransition,
												variant: 'outlined',
												color: 'error',
												size: 'small',
												startIcon: <IconTrash size={16} />,
											}}>
											Delete page
										</BasicButton>
									</div>
								</div>
							</div>
						</div>
					</Card>
				</div>
			)}
			{!!selectedQuestion && !selectedAnswer && <FormQuestion />}
			{!!selectedAnswer && <FormAnswer />}
			{!selectedPageInstance && (
				<div className="flex-col-center" style={{ width: '100%', height: '100%' }}>
					<div style={{ width: 200, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
						<IconFileDescription size={20} style={{ color: 'var(--text-muted)', fontSize: 25 }} />
						<span style={{ color: 'var(--text-muted)', fontSize: 15, paddingLeft: '10px' }}>
							No page selected
						</span>
					</div>
				</div>
			)}
			{copyDialogOpen && (
				<CopyPageDialog
					onClose={() => setCopyDialogOpen(false)}
					onCopy={handleCopyWithParent}
					title={copyType === 'template' ? 'Copy Page Template' : 'Copy Page Instance'}
					tree={data.tree}
					currentInstanceId={selectedPageInfo.instanceId}
					currentParentId={selectedPageInfo.parentInstanceId ?? null}
					currentPosition={selectedPageInfo.position}
					isPending={inTransition}
				/>
			)}
		</div>
	);
}

const pageStyles = {
	container: {
		width: '100%',
		height: '100%',
		display: 'flex',
		flexDirection: 'column' as const,
		padding: 20,
		minWidth: 500,
		overflow: 'auto' as const,
	},
	formContainer: {
		display: 'flex',
		flexDirection: 'column' as const,
		gap: 20,
		padding: 20,
		width: '100%',
	},
	fieldRow: {
		marginBottom: 16,
	},
	statsRow: {
		display: 'flex',
		gap: 24,
	},
	statItem: {
		display: 'flex',
		alignItems: 'center',
		gap: 8,
	},
	instanceLink: {
		fontSize: 13,
paddingLeft: 12, paddingRight: 12,
		paddingTop: 4, paddingBottom: 4,
		borderRadius: '6px',
		cursor: 'pointer',
},
	actionsGrid: {
		display: 'flex',
		flexDirection: 'column' as const,
		gap: 20,
	},
	actionGroup: {
		display: 'flex',
		flexDirection: 'column' as const,
		gap: 8,
	},
	actionGroupTitle: {
		fontSize: 12,
		fontWeight: 500,
		color: 'var(--text-secondary)',
		textTransform: 'uppercase' as const,
		letterSpacing: '0.5px',
	},
	actionButtons: {
		display: 'flex',
		gap: 8,
		flexWrap: 'wrap' as const,
	},
};
