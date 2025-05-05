import { PageInstanceStatus } from '../config/enums';

export function getUpdatedPageStatus(questionCount: number, responseCount: number) {
	if (questionCount === responseCount) return PageInstanceStatus.COMPLETE;
	if (responseCount > 0) return PageInstanceStatus.IN_PROGRESS;
	return PageInstanceStatus.UNSTARTED;
}
