import ExpandableTitle from '../common/ExpandableTitle';
import { BASE_COLOR, BASE_COLOR_LIGHT } from '@/styles/theme';
import BasicButtonStyled from '../common/BasicButtonStyled';
import { useRouter } from 'next/navigation';
import { useActionTrpc } from '@/hooks/trpc/useActionTrpc';
import { ActionType } from '@/config/enums';
import { ActionDefinition } from '@/types/types';
import dayjs from 'dayjs';
import MetricValue from '../common/MetricValue';
import { IconBug, IconCalendar, IconClipboardCheck, IconInfoCircle, IconMail, IconMailbox, IconShare } from '@tabler/icons-react';
import Skeleton from '@/components/ui/Skeleton';
import Divider from '@/components/ui/Divider';

const METRIC_WIDTH = 400;
const METRIC_HEIGHT = 300;

export default function ActionsMetric() {
	const router = useRouter();
	const { data: stats = [], isFetching } = useActionTrpc().stats();

	const getActionIcon = (type: ActionType) => {
		switch (type) {
			case ActionType.EMAIL:
				return <IconMail size={25} style={{ color: 'primary.main' }} />;
			case ActionType.EVENT:
				return <IconCalendar size={20} />;
			case ActionType.LETTER:
				return <IconMailbox size={20} />;
			case ActionType.TASK:
				return <IconClipboardCheck size={20} />;
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
		<div style={styles.paper}>
			{isFetching ? (
				<Skeleton width={METRIC_WIDTH} height={METRIC_HEIGHT} />
			) : (
				<div style={{ display: 'flex', width: METRIC_WIDTH, height: METRIC_HEIGHT, padding: '10px' }}>
					<div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-start' }}>
						<div
style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px' }}>
							<span style={{ fontSize: 14, fontWeight: 600 }}>
								Popular Actions
							</span>
							<div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
								<div style={{ marginRight: '5px' }}>
									<BasicButtonStyled
										buttonProps={{}}
										icon={<IconInfoCircle size={20} />}
										tooltipProps={{
											title: 'Actions are ranked by highest execution rate aross unique checklist + claim combinations.',
										}}
									/>
								</div>
								<BasicButtonStyled
									buttonProps={{
										onClick: () => router.push('/metrics/user-actions'),
									}}
									icon={
										<IconBug
										 style={{
												transform: 'scaleX(-1)',
												color: 'var(--text-accent)',
											}}
										/>
									}
									tooltipProps={{ title: 'Open in Inspector' }}
								/>
							</div>
						</div>
						<div
style={{ width: '100%', height: '100%', display: 'flex', justifyContent: stats.length ? 'flex-start' : 'center', alignItems: stats.length ? 'flex-start' : 'center' }}>
							{stats.length ? (
								<>
									{stats.map((s) => {
										const type = s.type as ActionType;
										return (
											<div
key={s.id}
												
												
												
												
												
												 style={{ width: '100%', display: 'flex', justifyContent: 'flex-start', alignItems: 'center', height: 60, padding: '0px 10px' }}>
												<div style={{ minWidth: 40, width: 40, paddingRight: '10px' }}>
													{getActionIcon(type)}
												</div>

												<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', width: 290, minWidth: 0, overflow: 'hidden' as const, textOverflow: 'ellipsis' }}>
													<span style={{ ...{ whiteSpace: 'nowrap', overflow: 'hidden' as const, textOverflow: 'ellipsis' }, fontSize: 14 }}>
														{getActionPrimaryContent(type, s.definition)}
													</span>
													<span
style={{ ...{ whiteSpace: 'nowrap', overflow: 'hidden' as const, textOverflow: 'ellipsis' }, fontSize: 13, color: BASE_COLOR_LIGHT }}>
														{getActionSecondaryContent(type, s.definition)}
													</span>
												</div>
												<div style={{ minWidth: 30, paddingLeft: '10px' }}>
													<MetricValue value={s.count.toLocaleString()} fontSize={13} />
												</div>
											</div>
										);
									})}
								</>
							) : (
								<span style={{ fontSize: 15, color: '#d9d9d9' }}>
									No actions
								</span>
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

const styles = {
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
