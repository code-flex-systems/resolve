import {
	IconPhone,
	IconPhoneIncoming,
	IconSend,
	IconFileText,
	IconGavel,
	IconEye,
	IconCalendarRepeat,
	IconMail,
	IconChecklist,
} from '@tabler/icons-react';
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
		icon: <IconChecklist size={18} />,
		description: 'General task',
	},
	[TaskType.OUTBOUND_CALL]: {
		label: 'Outbound Call',
		icon: <IconPhone size={18} />,
		description: 'Make an outbound phone call',
	},
	[TaskType.INBOUND_CALL]: {
		label: 'Inbound Call',
		icon: <IconPhoneIncoming size={18} />,
		description: 'Handle an inbound phone call',
	},
	[TaskType.SEND_DOCUMENT]: {
		label: 'Send Document',
		icon: <IconSend size={18} />,
		description: 'Send a document to a party',
	},
	[TaskType.REQUEST_DOCUMENT]: {
		label: 'Request Document',
		icon: <IconFileText size={18} />,
		description: 'Request a document from a party',
	},
	[TaskType.SEND_DEMAND]: {
		label: 'Send Demand',
		icon: <IconGavel size={18} />,
		description: 'Send a demand package',
	},
	[TaskType.REVIEW]: {
		label: 'Review',
		icon: <IconEye size={18} />,
		description: 'Review claim or documentation',
	},
	[TaskType.FOLLOW_UP]: {
		label: 'Follow Up',
		icon: <IconCalendarRepeat size={18} />,
		description: 'Follow up on previous action',
	},
	[TaskType.LETTER]: {
		label: 'Letter',
		icon: <IconMail size={18} />,
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
	return TASK_TYPE_CONFIG[taskType]?.icon ?? <IconChecklist size={18} />;
}
