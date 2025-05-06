import { useShallow } from 'zustand/react/shallow';
import useStore, { useChecklistSlice } from '../../state/store';
import * as selectors from '../../state/checklist/selectors';
import { Divider, Fade, TextField, Typography } from '@mui/material';
import FormQuestion from './FormQuestion';
import FormAnswer from './FormAnswer';
import Toolbar from '../common/Toolbar';
import { ContentCopy, Delete, Description, East, SubdirectoryArrowRight, TaskAlt } from '@mui/icons-material';
import {
	useAddPage,
	useCopyPage,
	useDeletePage,
	useModifyPage,
	usePageInstanceTree,
} from '../../api/queries/page-queries';
import BasicButton from '../common/BasicButton';
import * as actions from '../../state/checklist/actions';
import { useState } from 'react';
import { useParams } from 'react-router';

export default function PageEditor() {
	const checklistId = useChecklistSlice((state) => state.checklist)!.id;
	const claimId = useChecklistSlice((state) => state.claim)?.id;
	const selectedAnswer = useChecklistSlice((state) => state.selectedAnswer);
	const selectedQuestion = useChecklistSlice((state) => state.selectedQuestion);
	const selectedPageData = useStore(useShallow(selectors.selectedPageData));
	const selectedPageInfo = useStore(useShallow(selectors.selectedPageInfo));

	const { mutateAsync: addPage, isPending: adding } = useAddPage(checklistId);
	const { mutateAsync: copyPage, isPending: copying } = useCopyPage(checklistId, selectedPageInfo.pageId);
	const { mutateAsync: deletePage, isPending: deleting } = useDeletePage(selectedPageInfo.instanceId);
	const { mutateAsync: modifyPage, isPending: updating } = useModifyPage(selectedPageInfo.pageId);
	const { isFetching, refetch } = usePageInstanceTree(false, checklistId, claimId);
	let inTransition = adding || copying || deleting || isFetching;

	const [pageTitle, setPageTitle] = useState('');
	const [editingPageTitle, setEditingPageTitle] = useState(false);
	const [showUpdateMsg, setShowUpdateMsg] = useState(false);

	const onAddPage = async (passedParentId: number | null) => {
		try {
			let newInstance = await addPage({
				parentId: passedParentId ?? -1,
				title: 'New Page',
				position: selectedPageInfo.position + 1,
			});
			await refetch();
			actions.updateSelectedPage(newInstance.id);
		} catch (e) {
			console.error(e);
		}
	};

	const onCopyPage = async () => {
		try {
			let newInstance = await copyPage({
				parentId: selectedPageInfo.parentInstanceId ?? -1,
				position: selectedPageInfo.position + 1,
			});
			await refetch();
			actions.updateSelectedPage(newInstance.id);
		} catch (e) {
			console.error(e);
		}
	};

	const onDeletePage = async () => {
		try {
			await deletePage();
			await refetch();
			actions.updateSelectedPage(null);
		} catch (e) {
			console.error(e);
		}
	};

	const onModifyPage = async () => {
		try {
			let modifiedPage = await modifyPage({ title: pageTitle });
			actions.updateSelectedPageTitle(selectedPageInfo.instanceId, modifiedPage.title);
		} catch (e) {
			console.error(e);
		}
	};

	const startEditing = () => {
		if (!updating) {
			setEditingPageTitle(true);
			setPageTitle(selectedPageInfo.title);
		}
	};

	const stopEditing = async () => {
		if (!updating) {
			try {
				if (pageTitle && pageTitle !== selectedPageInfo.title) await onModifyPage();
				setEditingPageTitle(false);
				setPageTitle('');
				setShowUpdateMsg(true);
				setTimeout(() => setShowUpdateMsg(false), 1000);
			} catch (e) {
				console.error(e);
			}
		}
	};

	return (
		<div style={styles.container}>
			{!!selectedPageData && !selectedQuestion && !selectedAnswer && (
				<>
					<Toolbar
						left={
							<>
								<Description sx={{ color: 'secondary.main', fontSize: 25, marginRight: '5px' }} />
								{editingPageTitle ? (
									<TextField
										autoFocus
										value={pageTitle}
										onChange={(e) => setPageTitle(e.target.value)}
										placeholder="e.g. New Page"
										onBlur={stopEditing}
										error={!pageTitle}
										variant="outlined"
										disabled={updating}
										sx={styles.textFieldOverrides}
									/>
								) : (
									<Typography
										onClick={startEditing}
										className="text-hover"
										padding="5px"
										lineHeight={'21px'}
										fontSize={19}
										width={300}
									>
										{selectedPageInfo.title} (p{selectedPageInfo.pageId}.i
										{selectedPageInfo.instanceId})
									</Typography>
								)}
								<Fade in={showUpdateMsg} timeout={500}>
									<div style={{ marginLeft: 10 }} className="flex-row-left">
										<TaskAlt sx={{ color: 'warning.main', marginRight: '5px' }} />
										<Typography color="warning" fontStyle="italic">
											Updated!
										</Typography>
									</div>
								</Fade>
							</>
						}
						height={60}
						padding={'10px 0px'}
					/>
					<div style={styles.divider}>
						<Divider />
					</div>
					<Typography fontStyle="italic">Questions: {selectedPageData?.length ?? 0}</Typography>
				</>
			)}
			{!!selectedPageData && !selectedQuestion && (
				<div className="flex-col-left">
					<BasicButton
						buttonProps={{
							onClick: () => onCopyPage().catch((e) => console.error(e)),
							disabled: inTransition,
							variant: 'contained',
							color: 'primary',
							sx: styles.button,
							startIcon: <ContentCopy sx={{ color: 'white' }} />,
						}}
					>
						New page copy
					</BasicButton>
					<BasicButton
						buttonProps={{
							onClick: () => onAddPage(selectedPageInfo.parentInstanceId).catch((e) => console.error(e)),
							disabled: inTransition,
							variant: 'contained',
							color: 'secondary',
							sx: styles.button,
							startIcon: <East sx={{ color: 'white', fontSize: 17 }} />,
						}}
					>
						New sibling page
					</BasicButton>
					<BasicButton
						buttonProps={{
							onClick: () => onAddPage(selectedPageInfo.instanceId).catch((e) => console.error(e)),
							disabled: inTransition,
							variant: 'contained',
							color: 'secondary',
							sx: styles.button,
							startIcon: <SubdirectoryArrowRight sx={{ color: 'white' }} />,
						}}
					>
						New child page
					</BasicButton>
					<BasicButton
						buttonProps={{
							onClick: () => onDeletePage().catch((e) => console.error(e)),
							disabled: inTransition,
							variant: 'contained',
							color: 'warning',
							sx: styles.button,
							startIcon: <Delete sx={{ color: 'white' }} />,
						}}
					>
						Delete page
					</BasicButton>
				</div>
			)}
			{!!selectedQuestion && !selectedAnswer && <FormQuestion />}
			{!!selectedAnswer && <FormAnswer />}
			{!selectedPageData && !selectedQuestion && (
				<div style={{ width: '100%', height: '100%' }} className="flex-col-center">
					<Typography fontStyle="italic">No page selected</Typography>
				</div>
			)}
		</div>
	);
}

const styles = {
	button: {
		marginTop: '10px',
	},
	container: {
		width: '100%',
		height: '100%',
		display: 'flex',
		flexDirection: 'column' as const,
		justifyContent: 'flex-start',
		alignItems: 'flex-start',
		padding: 20,
	},
	divider: {
		width: '100%',
		height: 1,
		marginBottom: 5,
	},
	textFieldOverrides: {
		width: 300,
		'& .MuiInputBase-root': {
			fontSize: 19,
			lineHeight: '21px',
			borderRadius: 0,
			padding: '2px',
		},
		'& .MuiOutlinedInput-input': {
			borderRadius: 0,
			padding: '2px 10px',
		},
	},
};
