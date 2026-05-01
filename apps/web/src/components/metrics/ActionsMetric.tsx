import ExpandableTitle from '../common/ExpandableTitle';
import { useRouter } from 'next/navigation';
import { useActionTrpc } from '@/hooks/trpc/useActionTrpc';
import { ActionType } from '@/config/enums';
import { ActionDefinition } from '@/types/types';
import dayjs from 'dayjs';
import MetricValue from '../common/MetricValue';
import {
	IconBug,
	IconCalendar,
	IconClipboardCheck,
	IconInfoCircle,
	IconMail,
	IconMailbox,
	IconShare,
} from '@tabler/icons-react';
import Card from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';
import Divider from '@/components/ui/Divider';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';

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
		<Card variant="beveled" padding="md" style={{ width: METRIC_WIDTH, minHeight: METRIC_HEIGHT }}>
			{isFetching ? (
				<Skeleton width={METRIC_WIDTH - 32} height={METRIC_HEIGHT - 32} />
			) : (
				<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
					{/* Header */}
					<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
						<span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
							Popular Actions
						</span>
						<div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
							<Tooltip content="Actions are ranked by highest execution rate across unique checklist + claim combinations.">
								<Button variant="icon" size="sm" color="neutral">
									<IconInfoCircle size={16} />
								</Button>
							</Tooltip>
							<Tooltip content="Open in Inspector">
								<Button variant="icon" size="sm" color="neutral">
									<IconBug
										style={{ transform: 'scaleX(-1)', color: 'var(--text-accent)' }}
										size={16}
									/>
								</Button>
							</Tooltip>
						</div>
					</div>

					{/* Action list */}
					<div
						style={{
							display: 'flex',
							flexDirection: 'column',
							justifyContent: stats.length ? 'flex-start' : 'center',
							alignItems: stats.length ? 'stretch' : 'center',
							minHeight: 200,
						}}
					>
						{stats.length ? (
							stats.map((s) => {
								const type = s.type as ActionType;
								return (
									<div
										key={s.id}
										style={{
											display: 'flex',
											alignItems: 'center',
											gap: 10,
											padding: '8px 0',
											borderBottom: '1px solid var(--border-primary)',
										}}
									>
										<div style={{ minWidth: 32, color: 'var(--text-secondary)' }}>
											{getActionIcon(type)}
										</div>
										<div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
											<span
												style={{
													fontSize: 13,
													whiteSpace: 'nowrap',
													overflow: 'hidden',
													textOverflow: 'ellipsis',
													color: 'var(--text-primary)',
												}}
											>
												{getActionPrimaryContent(type, s.definition as ActionDefinition)}
											</span>
											<span
												style={{
													fontSize: 12,
													whiteSpace: 'nowrap',
													overflow: 'hidden',
													textOverflow: 'ellipsis',
													color: 'var(--text-muted)',
												}}
											>
												{getActionSecondaryContent(type, s.definition as ActionDefinition)}
											</span>
										</div>
										<span
											style={{
												fontSize: 13,
												fontWeight: 600,
												color: 'var(--text-primary)',
												minWidth: 24,
												textAlign: 'right',
											}}
										>
											{s.count.toLocaleString()}
										</span>
									</div>
								);
							})
						) : (
							<span style={{ fontSize: 13, color: 'var(--text-muted)' }}>No actions</span>
						)}
					</div>
				</div>
			)}
		</Card>
	);
}
