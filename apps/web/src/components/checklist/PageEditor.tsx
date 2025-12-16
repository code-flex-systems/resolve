'use client';
import { useChecklistStore, getSelectedPageInfoOrDefault, findInstancesByTemplateId } from '@/stores/useChecklistStore';
import { Box, Divider, Fade, IconButton, InputAdornment, Link, TextField, Typography } from '@mui/material';
import FormQuestion from './FormQuestion';
import FormAnswer from './FormAnswer';
import CopyPageDialog from './CopyPageDialog';
import Check from '@mui/icons-material/Check';
import Clear from '@mui/icons-material/Clear';
import ContentCopy from '@mui/icons-material/ContentCopy';
import Delete from '@mui/icons-material/Delete';
import East from '@mui/icons-material/East';
import Description from '@mui/icons-material/Description';
import Save from '@mui/icons-material/Save';
import SubdirectoryArrowRight from '@mui/icons-material/SubdirectoryArrowRight';
import TaskAlt from '@mui/icons-material/TaskAlt';
import BasicButton from '../common/BasicButton';
import { useEffect, useMemo, useState } from 'react';
import { useQuestionTrpc } from '@/hooks/trpc/useQuestionTrpc';
import { useChecklistParams } from '@/hooks/useChecklistParams';
import { usePageTrpc } from '@/hooks/trpc/usePageTrpc';
import theme, { BASE_COLOR_LIGHT, BG_TERTIARY, BORDER_COLOR, HOVERED_COLOR, TEXT_MUTED, TEXT_PRIMARY, TEXT_SECONDARY, containerStyles } from '@/styles/theme';
import HelpOutline from '@mui/icons-material/HelpOutline';
import FormatQuote from '@mui/icons-material/FormatQuote';

export default function PageEditor() {
	const { checklistId = -1, claimId = -1 } = useChecklistParams();
	const selectedAnswer = useChecklistStore((state) => state.selectedAnswer);
	const selectedQuestion = useChecklistStore((state) => state.selectedQuestion);
	const selectedPageInstance = useChecklistStore((state) => state.selectedPageInstance);
	const selectedPageInfo = getSelectedPageInfoOrDefault();
	const updateSelectedPage = useChecklistStore((state) => state.updateSelectedPage);
	const updateSelectedPageInfo = useChecklistStore((state) => state.updateSelectedPageInfo);
	const updateSelectedPageInfoSearch = useChecklistStore((state) => state.updateSelectedPageInfoSearch);
	const updateSelectedPageTitle = useChecklistStore((state) => state.updateSelectedPageTitle);

	const [pageTitle, setPageTitle] = useState('');
	const [showUpdateMsg, setShowUpdateMsg] = useState(false);
	const [copyDialogOpen, setCopyDialogOpen] = useState(false);
	const [copyType, setCopyType] = useState<'template' | 'instance'>('template');
	const [copiedField, setCopiedField] = useState<string | null>(null);

	const { data: questions = [] } = useQuestionTrpc().list({ pageId: selectedPageInfo.pageId });
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
		{ enabled: checklistId !== -1 && claimId !== -1 }
	);

	const answerCount = questions.reduce((prev, curr) => prev + (curr.answers?.length ?? 0), 0);
	const inTransition = adding || copyingTemplate || copyingInstance || deleting || isFetching;

	// Sync pageTitle state when selected page changes
	useEffect(() => {
		setPageTitle(selectedPageInfo.title);
	}, [selectedPageInfo.instanceId, selectedPageInfo.title]);

	const otherInstances = useMemo(() => {
		return findInstancesByTemplateId(selectedPageInfo.pageId, data.tree).filter(
			(node) => node.instanceId !== selectedPageInfo.instanceId
		);
	}, [selectedPageInfo, data.tree]);

	const onAddPage = async (passedParentId: number | null) => {
		try {
			const newInstance = await addPage({
				checklistId,
				params: {
					title: 'New Page',
					parentId: passedParentId ?? -1,
					position: selectedPageInfo.position + 1,
				},
			});
			if (newInstance) {
				const { data: freshData } = await refetchTree();
				updateSelectedPage(newInstance.instance_id);
				if (freshData) {
					updateSelectedPageInfoSearch(newInstance.instance_id, freshData.tree);
				}
			}
		} catch (e) {
			console.error(e);
		}
	};

	const handleCopyWithParent = async (parentId: number | null, position: number) => {
		try {
			if (copyType === 'template') {
				const newPage = await copyPageTemplate({
					checklistId,
					pageId: selectedPageInfo.pageId,
					params: {
						parentId: parentId ?? -1,
						position,
					},
				});
				if (newPage) {
					const { data: freshData } = await refetchTree();
					updateSelectedPage(newPage.instance_id);
					if (freshData) {
						updateSelectedPageInfoSearch(newPage.instance_id, freshData.tree);
					}
				}
			} else {
				const newInstance = await copyPageInstance({
					checklistId,
					pageId: selectedPageInfo.pageId,
					params: {
						parentId: parentId ?? -1,
						position,
					},
				});
				if (newInstance) {
					const { data: freshData } = await refetchTree();
					updateSelectedPage(newInstance.id);
					if (freshData) {
						updateSelectedPageInfoSearch(newInstance.id, freshData.tree);
					}
				}
			}
		} catch (e) {
			console.error(e);
		}
	};

	const onDeletePage = async () => {
		try {
			await deletePage({ instanceId: selectedPageInfo.instanceId });
			await refetchTree();
			updateSelectedPage(null);
			updateSelectedPageInfo(null);
		} catch (e) {
			console.error(e);
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
				setShowUpdateMsg(true);
				setTimeout(() => setShowUpdateMsg(false), 1000);
			}
		} catch (e) {
			console.error(e);
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
		<Box sx={styles.container}>
			{!!selectedPageInstance && !selectedQuestion && !selectedAnswer && (
				<Box sx={styles.formContainer}>
					{/* Page Header */}
					<Box sx={styles.headerSection}>
						<Box sx={styles.titleRow}>
							<Typography sx={styles.pageTitle}>{pageTitle}</Typography>
							<Typography sx={styles.pageId}>
								p{selectedPageInfo.pageId}.i{selectedPageInfo.instanceId}
							</Typography>
							<Fade in={showUpdateMsg} timeout={500}>
								<Box sx={{ ml: 1.5 }} className="flex-row-left">
									<TaskAlt sx={{ color: 'success.main', fontSize: 18, mr: 0.5 }} />
									<Typography color="success.main" fontSize={13}>
										Saved
									</Typography>
								</Box>
							</Fade>
						</Box>
					</Box>
					<Box sx={styles.divider}>
						<Divider />
					</Box>

					{/* Page Information Section */}
					<Box sx={styles.section}>
						<Typography sx={styles.sectionTitle}>Information</Typography>
						<Box sx={styles.sectionContent}>
							<Box sx={styles.fieldRow}>
								<TextField
									label="Page title"
									placeholder="New Page"
									variant="outlined"
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
									slotProps={{
										input: {
											endAdornment: (
												<InputAdornment position="end">
													<IconButton
														disableRipple
														size="small"
														onClick={() => onCopyText('pageTitle', pageTitle)}
													>
														{copiedField === 'pageTitle' ? (
															<Check
																sx={{
																	color: theme.palette.success.light,
																	fontSize: 18,
																}}
															/>
														) : (
															<ContentCopy
																sx={{ color: BASE_COLOR_LIGHT, fontSize: 18 }}
															/>
														)}
													</IconButton>
													<IconButton
														disableRipple
														size="small"
														onClick={onClearField}
														disabled={!pageTitle}
													>
														<Clear sx={{ color: BASE_COLOR_LIGHT, fontSize: 18 }} />
													</IconButton>
													<IconButton
														disableRipple
														size="small"
														onClick={() => onModifyPage()}
														disabled={
															updating ||
															!pageTitle ||
															pageTitle === selectedPageInfo.title
														}
													>
														<Save
															sx={{
																color:
																	!updating &&
																	pageTitle &&
																	pageTitle !== selectedPageInfo.title
																		? theme.palette.primary.main
																		: BASE_COLOR_LIGHT,
																fontSize: 18,
															}}
														/>
													</IconButton>
												</InputAdornment>
											),
										},
									}}
								/>
							</Box>
							<Box sx={styles.statsRow}>
								<Box sx={styles.statItem}>
									<HelpOutline sx={{ fontSize: 18, color: TEXT_SECONDARY }} />
									<Typography fontSize={13}>
										<strong>{questions.length}</strong>{' '}
										{questions.length === 1 ? 'Question' : 'Questions'}
									</Typography>
								</Box>
								<Box sx={styles.statItem}>
									<FormatQuote sx={{ fontSize: 18, color: TEXT_SECONDARY }} />
									<Typography fontSize={13}>
										<strong>{answerCount}</strong> {answerCount === 1 ? 'Answer' : 'Answers'}
									</Typography>
								</Box>
							</Box>
						</Box>
					</Box>

					{/* Related Instances Section */}
					{otherInstances.length > 0 && (
						<Box sx={styles.section}>
							<Typography sx={styles.sectionTitle}>Related Instances</Typography>
							<Box sx={styles.sectionContent}>
								<Typography fontSize={13} color="text.secondary" mb={1}>
									{otherInstances.length === 1
										? 'Another page uses this template:'
										: `${otherInstances.length} other pages use this template:`}
								</Typography>
								<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
									{otherInstances.map((node) => (
										<Link
											key={node.instanceId}
											onClick={() => {
												updateSelectedPage(node.instanceId);
												updateSelectedPageInfo(node);
											}}
											sx={styles.instanceLink}
										>
											p{node.pageId}.i{node.instanceId}
										</Link>
									))}
								</Box>
							</Box>
						</Box>
					)}

					{/* Actions Section */}
					<Box sx={styles.section}>
						<Typography sx={styles.sectionTitle}>Actions</Typography>
						<Box sx={styles.sectionContent}>
							<Box sx={styles.actionsGrid}>
								<Box sx={styles.actionGroup}>
									<Typography sx={styles.actionGroupTitle}>Copy</Typography>
									<Box sx={styles.actionButtons}>
										<BasicButton
											buttonProps={{
												onClick: () => {
													setCopyType('template');
													setCopyDialogOpen(true);
												},
												disabled: inTransition,
												variant: 'outlined',
												size: 'small',
												startIcon: <ContentCopy sx={{ fontSize: 16 }} />,
											}}
										>
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
												startIcon: <ContentCopy sx={{ fontSize: 16 }} />,
											}}
										>
											Copy instance
										</BasicButton>
									</Box>
								</Box>

								<Box sx={styles.actionGroup}>
									<Typography sx={styles.actionGroupTitle}>Create</Typography>
									<Box sx={styles.actionButtons}>
										<BasicButton
											buttonProps={{
												onClick: () =>
													onAddPage(selectedPageInfo.parentInstanceId).catch((e) =>
														console.error(e)
													),
												disabled: inTransition,
												variant: 'outlined',
												size: 'small',
												startIcon: <East sx={{ fontSize: 16 }} />,
											}}
										>
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
												startIcon: <SubdirectoryArrowRight sx={{ fontSize: 16 }} />,
											}}
										>
											New child
										</BasicButton>
									</Box>
								</Box>

								<Box sx={styles.actionGroup}>
									<Typography sx={styles.actionGroupTitle}>Delete</Typography>
									<Box sx={styles.actionButtons}>
										<BasicButton
											buttonProps={{
												onClick: () => onDeletePage().catch((e) => console.error(e)),
												disabled: inTransition,
												variant: 'outlined',
												color: 'error',
												size: 'small',
												startIcon: <Delete sx={{ fontSize: 16 }} />,
											}}
										>
											Delete page
										</BasicButton>
									</Box>
								</Box>
							</Box>
						</Box>
					</Box>
				</Box>
			)}
			{!!selectedQuestion && !selectedAnswer && <FormQuestion />}
			{!!selectedAnswer && <FormAnswer />}
			{!selectedPageInstance && (
				<Box sx={{ width: '100%', height: '100%' }} className="flex-col-center">
					<Box width={200} display="flex" justifyContent="center" alignItems="center">
						<Description sx={{ color: BASE_COLOR_LIGHT, fontSize: 25 }} />
						<Typography color={BASE_COLOR_LIGHT} fontSize={15} paddingLeft="10px">
							No page selected
						</Typography>
					</Box>
				</Box>
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
	formContainer: {
		display: 'flex',
		flexDirection: 'column',
		gap: 2.5,
		p: 2.5,
		width: '100%',
	},
	headerSection: {
		mb: 0,
	},
	divider: {
		width: '100%',
		mb: 3,
	},
	titleRow: {
		display: 'flex',
		alignItems: 'center',
		gap: 1.5,
	},
	pageTitle: {
		fontSize: 20,
		fontWeight: 600,
		color: TEXT_PRIMARY,
	},
	pageId: {
		fontSize: 13,
		color: TEXT_MUTED,
		bgcolor: BG_TERTIARY,
		px: 1,
		py: 0.25,
		borderRadius: '4px',
	},
	fieldRow: {
		mb: 2,
	},
	section: {
		...containerStyles.section,
		maxWidth: 600,
	},
	sectionTitle: containerStyles.sectionTitle,
	sectionContent: containerStyles.sectionContent,
	statsRow: {
		display: 'flex',
		gap: 3,
	},
	statItem: {
		display: 'flex',
		alignItems: 'center',
		gap: 1,
	},
	instanceLink: {
		fontSize: 13,
		bgcolor: BG_TERTIARY,
		px: 1.5,
		py: 0.5,
		borderRadius: '6px',
		cursor: 'pointer',
		'&:hover': {
			bgcolor: HOVERED_COLOR,
		},
	},
	actionsGrid: {
		display: 'flex',
		flexDirection: 'column',
		gap: 2.5,
	},
	actionGroup: {
		display: 'flex',
		flexDirection: 'column',
		gap: 1,
	},
	actionGroupTitle: {
		fontSize: 12,
		fontWeight: 500,
		color: TEXT_SECONDARY,
		textTransform: 'uppercase',
		letterSpacing: '0.5px',
	},
	actionButtons: {
		display: 'flex',
		gap: 1,
		flexWrap: 'wrap',
	},
};
