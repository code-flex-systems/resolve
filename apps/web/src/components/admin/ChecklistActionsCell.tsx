'use client';

import { IconButton, Tooltip, Typography } from '@mui/material';
import Archive from '@mui/icons-material/Archive';
import OpenInNew from '@mui/icons-material/OpenInNew';
import Unarchive from '@mui/icons-material/Unarchive';
import { GridRenderCellParams } from '@mui/x-data-grid-pro';
import { useRouter } from 'next/navigation';
import theme from '@/styles/theme';
import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import { useState } from 'react';
import BasicDialog from '../common/BasicDialog';

export default function ChecklistActionsCell(params: GridRenderCellParams) {
	const router = useRouter();
	const [updating, setUpdating] = useState(false);
	const { mutate: updateChecklist, isPending } = useChecklistTrpc().update;
	const published = params.row.published;

	return (
		<>
			<div style={styles.container} className="flex-row-right">
				<Tooltip title="Open checklist">
					<IconButton
						onClick={() => router.push(`/checklist/${params.id}`)}
						sx={{ ...styles.button, bgcolor: theme.palette.primary.main }}
					>
						<OpenInNew sx={{ color: 'white' }} />
					</IconButton>
				</Tooltip>
				<Tooltip title={`${published ? 'Unpublish' : 'Publish'}`}>
					<IconButton
						disabled={isPending}
						onClick={() => setUpdating(true)}
						sx={{
							...styles.button,
							bgcolor: published ? theme.palette.error.main : theme.palette.success.main,
						}}
					>
						{published ? <Archive sx={{ color: 'white' }} /> : <Unarchive sx={{ color: 'white' }} />}
					</IconButton>
				</Tooltip>
			</div>

			{updating && (
				<BasicDialog
					title={`${published ? 'Unpublish' : 'Publish'} ${params.row.name}`}
					primaryAction={{
						label: 'Confirm',
						onClick: () => {
							updateChecklist({ id: params.row.id, params: { published: !published } });
							setUpdating(false);
						},
						color: published ? 'error' : 'success',
					}}
					secondaryActions={[
						{
							label: 'Cancel',
							onClick: () => setUpdating(false),
						},
					]}
					onClose={() => setUpdating(false)}
					width={500}
				>
					<Typography fontStyle="italic" fontWeight="bold">
						Are you sure you want to {published ? 'unpublish' : 'publish'} this checklist?
					</Typography>
					<Typography paddingTop="10px" fontStyle="italic">
						{published
							? 'Users will no longer have access to this checklist or be able to open it with new or associated claims.'
							: 'Users will now have access to this checklist and be able to open it with new or associated claims.'}
					</Typography>
				</BasicDialog>
			)}
		</>
	);
}

const styles = {
	button: {
		// opacity: 0,
		// transition: 'opacity 200ms',
		// '.MuiDataGrid-row:hover &': {
		// 	opacity: 1,
		// },
		marginLeft: '15px',
	},
	container: {
		width: '100%',
		height: '100%',
		padding: '10px',
	},
};
