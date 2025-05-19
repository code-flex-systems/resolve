export enum AnswerType {
	FREEFORM = 'freeform',
	STANDARD = 'standard',
}

export enum ChecklistMode {
	VIEW,
	TEST,
	EDIT,
}

export enum ClaimSearch {
	CLAIM_NUMBER = 'claim_number',
	INSURED = 'insured',
}

export enum PageInstanceStatus {
	UNSTARTED = 'unstarted',
	IN_PROGRESS = 'in-progress',
	COMPLETE = 'complete',
	STALE = 'stale',
}

export enum SummarySegment {
	ANSWERED = 'answered',
	UNANSWERED = 'unanswered',
	KNOWN = 'known',
	UNKNOWN = 'unknown',
}

export enum QuestionType {
	DROPDOWN = 'dropdown',
	FREEFORM = 'freeform',
	MULTI = 'multi',
	SINGLE = 'single',
}
