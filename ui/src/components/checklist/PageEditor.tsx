import { useShallow } from 'zustand/react/shallow';
import useStore, { useChecklistSlice, useGlobalSlice } from '../../state/store';
import * as selectors from '../../state/checklist/selectors';
import { Divider, Typography } from '@mui/material';
import FormQuestion from './FormQuestion';
import FormAnswer from './FormAnswer';
import Toolbar from '../common/Toolbar';
import { ContentCopy, Delete, Description, East, SubdirectoryArrowRight } from '@mui/icons-material';
import ClaimInfo from './ClaimInfo';
import { useAddPage, useCopyPage, useDeletePage, usePageInstanceTree } from '../../api/queries/page-queries';
import BasicButton from '../common/BasicButton';
import * as actions from '../../state/checklist/actions';

export default function PageEditor() {
	const checklistId = useGlobalSlice((state) => state.checklist)?.id ?? -1;
	const selectedAnswer = useChecklistSlice((state) => state.selectedAnswer);
	const selectedQuestion = useChecklistSlice((state) => state.selectedQuestion);
	const selectedPageData = useStore(useShallow(selectors.selectedPageData));
	const selectedPageInfo = useStore(useShallow(selectors.selectedPageInfo));
	const { mutateAsync: addPage, isPending: adding } = useAddPage(checklistId ?? -1);
	const { mutateAsync: copyPage, isPending: copying } = useCopyPage(checklistId ?? -1, selectedPageInfo.pageId);
	const { mutateAsync: deletePage, isPending: deleting } = useDeletePage(selectedPageInfo.instanceId);
	const { isFetching, refetch } = usePageInstanceTree(actions.updateTree, false);
	let inTransition = adding || copying || deleting || isFetching;

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

	return (
		<div style={styles.container}>
			<ClaimInfo />
			{!!selectedPageData && !selectedQuestion && !selectedAnswer && (
				<>
					<Toolbar
						left={
							<>
								<Description sx={{ color: 'primary.main', fontSize: 20, marginRight: '5px' }} />
								<Typography lineHeight={'21px'} fontSize={19}>
									{selectedPageInfo.title} (p{selectedPageInfo.pageId})
								</Typography>
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
							color: 'secondary',
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
							color: 'error',
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
			{!selectedPageData && !selectedQuestion && <Typography fontStyle="italic">No page selected</Typography>}
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
};
