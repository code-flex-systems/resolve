import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import { useChecklistParams } from '@/hooks/useChecklistParams';
import { Paper, Popper, PopperProps, Fade } from '@mui/material';
import { useState } from 'react';
import BasicButtonStyled from '../common/BasicButtonStyled';
import { StackedRow } from '../common/StackedRow';
import { formatMDY } from '@/lib/utils/utils';
import useIsAdmin from '@/hooks/useIsAdmin';
import useIsSuperAdmin from '@/hooks/useIsSuperAdmin';
import { IconChecklist } from '@tabler/icons-react';

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
					startIcon: <IconChecklist size={20} />,
				}}>
				{checklist.name}
			</BasicButtonStyled>
			<Popper
				open={!!checklistAnchorEl}
				anchorEl={checklistAnchorEl}
				placement="bottom-start"
				sx={{ zIndex: 100 }}
				transition>
				{({ TransitionProps }) => (
					<Fade {...TransitionProps} timeout={350}>
						<span>
							<Paper sx={styles.container} className="flex-col-start">
								<div style={{ width: '100%', display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-start' }}>
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
								</div>
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
		padding: '0px 20px 10px',
		height: 'fit-content',
		marginTop: 5,
	},
};
