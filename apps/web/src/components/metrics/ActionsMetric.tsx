import { Box, Divider, Paper, Skeleton, Stack, Typography } from '@mui/material';
import AssignmentTurnedIn from '@mui/icons-material/AssignmentTurnedIn';
import Email from '@mui/icons-material/Email';
import Event from '@mui/icons-material/Event';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import MarkunreadMailbox from '@mui/icons-material/MarkunreadMailbox';
import Share from '@mui/icons-material/Share';
import Troubleshoot from '@mui/icons-material/Troubleshoot';
import ExpandableTitle from '../common/ExpandableTitle';
import theme, { BASE_COLOR, BASE_COLOR_LIGHT } from '@/styles/theme';
import BasicButtonStyled from '../common/BasicButtonStyled';
import { useRouter } from 'next/navigation';
import { useActionTrpc } from '@/hooks/trpc/useActionTrpc';
import { ActionType } from '@/config/enums';
import { ActionDefinition } from '@/types/types';
import dayjs from 'dayjs';
import MetricValue from '../common/MetricValue';

const METRIC_WIDTH = 400;
const METRIC_HEIGHT = 300;

export default function ActionsMetric() {
	const router = useRouter();
	const { data: stats = [], isFetching } = useActionTrpc().stats();

	const getActionIcon = (type: ActionType) => {
		switch (type) {
			case ActionType.EMAIL:
				return <Email sx={{ fontSize: 25, color: 'primary.main' }} />;
			case ActionType.EVENT:
				return <Event />;
			case ActionType.LETTER:
				return <MarkunreadMailbox />;
			case ActionType.TASK:
				return <AssignmentTurnedIn />;
		}
	};

	const getActionPrimaryContent = (type: ActionType, definition: ActionDefinition) => {
		switch (type) {
			case ActionType.EMAIL:
			case ActionType.LETTER:
			case ActionType.EVENT:
				return definition.title;
			case ActionType.TASK:
				return definition.task_type;
		}
	};

	const getActionSecondaryContent = (type: ActionType, definition: ActionDefinition) => {
		switch (type) {
			case ActionType.EMAIL:
			case ActionType.LETTER:
				return (definition.message ?? '').slice(0, 100);
			case ActionType.EVENT:
				return definition.schedule ? dayjs(definition.schedule).format('MMM D, YYYY') : '';
			case ActionType.TASK:
				return `${definition.dept}, ${definition.desk_type}, ${definition.desk}`;
		}
	};

	return (
		<Paper elevation={0} sx={styles.paper}>
			{isFetching ? (
				<Skeleton width={METRIC_WIDTH} height={METRIC_HEIGHT} animation="wave" sx={styles.skeleton} />
			) : (
				<Box display="flex" width={METRIC_WIDTH} height={METRIC_HEIGHT} borderRadius={3} padding="10px">
					<Stack flex={1} display="flex" justifyContent="flex-start" alignItems="flex-start">
						<Box
							width="100%"
							display="flex"
							justifyContent="space-between"
							alignItems="center"
							padding="0px 5px"
						>
							<Typography variant="subtitle1" fontSize={14} fontWeight={600}>
								Popular Actions
							</Typography>
							<Box display="flex" justifyContent="flex-end" alignItems="center">
								<Box marginRight="5px">
									<BasicButtonStyled
										buttonProps={{}}
										icon={<InfoOutlined />}
										tooltipProps={{
											title: 'Actions are ranked by highest execution rate aross unique checklist + claim combinations.',
										}}
									/>
								</Box>
								<BasicButtonStyled
									buttonProps={{
										onClick: () => router.push('/metrics/user-actions'),
									}}
									icon={
										<Troubleshoot
											sx={{
												transform: 'scaleX(-1)',
												color: theme.palette.primary.main,
											}}
										/>
									}
									tooltipProps={{ title: 'Open in Inspector' }}
								/>
							</Box>
						</Box>
						<Stack
							width="100%"
							height="100%"
							display="flex"
							justifyContent={stats.length ? 'flex-start' : 'center'}
							alignItems={stats.length ? 'flex-start' : 'center'}
						>
							{stats.length ? (
								<>
									{stats.map((s) => {
										const type = s.type as ActionType;
										return (
											<Box
												key={s.id}
												width="100%"
												display="flex"
												justifyContent="flex-start"
												alignItems="center"
												height={60}
												padding="0px 10px"
											>
												<Box minWidth={40} width={40} paddingRight="10px">
													{getActionIcon(type)}
												</Box>

												<Stack
													display="flex"
													justifyContent="center"
													alignItems="flex-start"
													width={290}
													minWidth={0}
													overflow="hidden"
													textOverflow={'ellipsis'}
												>
													<Typography fontSize={14} textOverflow="ellipsis" noWrap>
														{getActionPrimaryContent(type, s.definition)}
													</Typography>
													<Typography
														fontSize={13}
														color={BASE_COLOR_LIGHT}
														textOverflow="ellipsis"
														noWrap
													>
														{getActionSecondaryContent(type, s.definition)}
													</Typography>
												</Stack>
												<Box minWidth={30} paddingLeft="10px">
													<MetricValue value={s.count.toLocaleString()} fontSize={13} />
												</Box>
											</Box>
										);
									})}
								</>
							) : (
								<Typography fontSize={15} color="#d9d9d9">
									No actions
								</Typography>
							)}
						</Stack>
					</Stack>
				</Box>
			)}
		</Paper>
	);
}

const styles = {
	divider: {
		width: '100%',
		height: 1,
		marginTop: 5,
	},
	paper: {
		borderRadius: 3,
		margin: '15px',
		width: METRIC_WIDTH,
		height: METRIC_HEIGHT,
	},
	skeleton: {
		borderRadius: 3,
	},
};
