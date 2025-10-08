export function buildChecklistUrl(args: {
	checklistId: number;
	claimId?: number;
	questionId?: number;
	instanceId?: number;
	focus?: 'comments' | 'change-log';
}) {
	const { checklistId, claimId, questionId, instanceId, focus } = args;
	const base = `/checklist/${checklistId}/claim/${claimId}`;
	const sp = new URLSearchParams();
	if (questionId) sp.set('question', String(questionId));
	if (instanceId) sp.set('instance', String(instanceId));
	if (focus) sp.set('focus', focus);
	const qs = sp.toString();
	return qs ? `${base}?${qs}` : base;
}
