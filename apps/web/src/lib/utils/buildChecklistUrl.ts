export function buildChecklistUrl(args: {
	checklistId: string;
	claimId?: string;
	questionId?: string;
	instanceId?: string;
	focus?: 'comments' | 'change-log';
}) {
	const { checklistId, claimId, questionId, instanceId, focus } = args;
	const base = `/checklists/${checklistId}/claim/${claimId}`;
	const sp = new URLSearchParams();
	if (questionId) sp.set('question', String(questionId));
	if (instanceId) sp.set('instance', String(instanceId));
	if (focus) sp.set('focus', focus);
	const qs = sp.toString();
	return qs ? `${base}?${qs}` : base;
}
