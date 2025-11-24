import Phone from '@mui/icons-material/Phone';
import PhoneCallback from '@mui/icons-material/PhoneCallback';
import Send from '@mui/icons-material/Send';
import RequestPage from '@mui/icons-material/RequestPage';
import Gavel from '@mui/icons-material/Gavel';
import RateReview from '@mui/icons-material/RateReview';
import EventRepeat from '@mui/icons-material/EventRepeat';
import Mail from '@mui/icons-material/Mail';
import Task from '@mui/icons-material/Task';
import { TaskType } from '@/config/enums';

/**
 * Configuration for task types with labels and icons
 * Used by TaskTypeSelect and other task-related components
 */
export const TASK_TYPE_CONFIG: Record<
	TaskType,
	{
		label: string;
		icon: React.ReactElement;
		description: string;
	}
> = {
	[TaskType.GENERIC]: {
		label: 'Generic',
		icon: <Task fontSize="small" />,
		description: 'General task',
	},
	[TaskType.OUTBOUND_CALL]: {
		label: 'Outbound Call',
		icon: <Phone fontSize="small" />,
		description: 'Make an outbound phone call',
	},
	[TaskType.INBOUND_CALL]: {
		label: 'Inbound Call',
		icon: <PhoneCallback fontSize="small" />,
		description: 'Handle an inbound phone call',
	},
	[TaskType.SEND_DOCUMENT]: {
		label: 'Send Document',
		icon: <Send fontSize="small" />,
		description: 'Send a document to a party',
	},
	[TaskType.REQUEST_DOCUMENT]: {
		label: 'Request Document',
		icon: <RequestPage fontSize="small" />,
		description: 'Request a document from a party',
	},
	[TaskType.SEND_DEMAND]: {
		label: 'Send Demand',
		icon: <Gavel fontSize="small" />,
		description: 'Send a demand package',
	},
	[TaskType.REVIEW]: {
		label: 'Review',
		icon: <RateReview fontSize="small" />,
		description: 'Review claim or documentation',
	},
	[TaskType.FOLLOW_UP]: {
		label: 'Follow Up',
		icon: <EventRepeat fontSize="small" />,
		description: 'Follow up on previous action',
	},
	[TaskType.LETTER]: {
		label: 'Letter',
		icon: <Mail fontSize="small" />,
		description: 'Generate or send a letter',
	},
};

/**
 * Get the label for a task type
 */
export function getTaskTypeLabel(taskType: TaskType): string {
	return TASK_TYPE_CONFIG[taskType]?.label ?? taskType;
}

/**
 * Get the icon for a task type
 */
export function getTaskTypeIcon(taskType: TaskType): React.ReactElement {
	return TASK_TYPE_CONFIG[taskType]?.icon ?? <Task fontSize="small" />;
}
