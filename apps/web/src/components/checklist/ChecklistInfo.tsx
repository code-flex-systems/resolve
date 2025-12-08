import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import { useChecklistParams } from '@/hooks/useChecklistParams';
import { Fade, Paper, Popper, PopperProps, Stack } from '@mui/material';
import Checklist from '@mui/icons-material/Checklist';
import { useState } from 'react';
import BasicButtonStyled from '../common/BasicButtonStyled';
import { StackedRow } from '../common/StackedRow';
import { formatMDY } from '@/lib/utils/utils';
import useIsAdmin from '@/hooks/useIsAdmin';
import useIsSuperAdmin from '@/hooks/useIsSuperAdmin';
import theme from '@/styles/theme';

export default function ChecklistInfo() {
	const isAdmin = useIsAdmin();
	const isSuperAdmin = useIsSuperAdmin();
	const { checklistId = -1 } = useChecklistParams();
	const { data: checklist } = useChecklistTrpc().get({ id: checklistId }, { enabled: checklistId !== -1 });
	const [checklistAnchorEl, setChecklistAnchorEl] = useState<PopperProps['anchorEl']>(null);

	if (!checklist) return <></>;
	return (
		<div className="flex-row-left">
			<BasicButtonStyled
				buttonProps={{
					onMouseEnter: (e) => setChecklistAnchorEl(e.currentTarget),
					onMouseLeave: () => setChecklistAnchorEl(null),
					startIcon: <Checklist />,
				}}
			>
				{checklist.name}
			</BasicButtonStyled>
			<Popper
				open={!!checklistAnchorEl}
				anchorEl={checklistAnchorEl}
				placement="bottom-start"
				sx={{ zIndex: 100 }}
				transition
			>
				{({ TransitionProps }) => (
					<Fade {...TransitionProps} timeout={350}>
						<span>
							<Paper sx={styles.container} className="flex-col-start">
								<Stack width="100%" display="flex" justifyContent="flex-start" alignItems="flex-start">
									{(isAdmin || isSuperAdmin) && (
										<StackedRow
											primary="Status"
											secondary={checklist.published ? 'Published' : 'Unpublished'}
										/>
									)}
									<StackedRow
										primary="Last Update"
										secondary={formatMDY(checklist.updated_at ?? checklist.created_at)}
									/>
								</Stack>
							</Paper>
						</span>
					</Fade>
				)}
			</Popper>
		</div>
	);
}

const styles = {
	container: {
		width: 'fit-content',
		p: '0px 20px 10px',
		height: 'fit-content',
		borderTopRightRadius: 5,
		borderBottomLeftRadius: 5,
		borderBottomRightRadius: 5,
		border: `1px solid ${theme.palette.divider}`,
		mt: 0.625,
	},
};
