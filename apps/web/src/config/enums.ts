export enum ActionLogStatus {
	FAILURE = 'failure',
	SUCCESS = 'Success',
}

export enum ActionType {
	EMAIL = 'email',
	EVENT = 'event',
	LETTER = 'letter',
	TASK = 'task',
}

export enum AdminActionLogType {
	DELETE = 'delete',
	GET = 'get',
	PATCH = 'patch',
	POST = 'post',
}

export enum AnswerType {
	FREEFORM = 'freeform',
	STANDARD = 'standard',
}

export enum AuthEventType {
	LoginSuccess = 'login_success',
	LoginFailure = 'login_failure',
	PasswordResetRequested = 'password_reset_requested',
	PasswordChanged = 'password_changed',
	MfaSetupStarted = 'mfa_setup_started',
	MfaVerified = 'mfa_verified',
	MissingCredentials = 'missing_credentials',
	AccountCreated = 'account_created',
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

export enum ClaimStatus {
	BLOCKED = 'Blocked',
	SUBMITTED = 'Submitted',
	IN_PROGRESS = 'In Progress',
	UNWORKED = 'Unworked',
}

export enum ClaimSubstatus {
	INVESTIGATION = 'investigation',
	DEMAND_SENT = 'demand_sent',
	NEGOTIATION = 'negotiation',
	SETTLEMENT_REACHED = 'settlement_reached',
	LITIGATION = 'litigation',
	CLOSED_RECOVERED = 'closed_recovered',
	CLOSED_NO_RECOVERY = 'closed_no_recovery',
	CANCELLED = 'cancelled',
}

export enum DeadlineStatus {
	PENDING = 'pending',
	MET = 'met',
	MISSED = 'missed',
	EXTENDED = 'extended',
}

export enum DocType {
	POLICE_REPORT = 'police_report',
	MEDICAL_RECORD = 'medical_record',
	INVOICE = 'invoice',
	CORRESPONDENCE = 'correspondence',
	SETTLEMENT = 'settlement',
	PHOTO = 'photo',
	ESTIMATE = 'estimate',
	REPAIR_INVOICE = 'repair_invoice',
	PROOF_OF_PAYMENT = 'proof_of_payment',
	DEMAND_LETTER = 'demand_letter',
	LEGAL_FILING = 'legal_filing',
	OTHER = 'other',
}

export enum DocStatus {
	DRAFT = 'draft',
	PENDING_REVIEW = 'pending_review',
	APPROVED = 'approved',
	ARCHIVED = 'archived',
}

export enum DocGroupType {
	CLAIM_FOLDER = 'claim_folder',
	CATEGORY = 'category',
	CUSTOM = 'custom',
	USER = 'user',
}

export enum RecoveryStatus {
	PENDING = 'pending',
	IN_PROGRESS = 'in_progress',
	RECOVERED = 'recovered',
	CLOSED_NO_RECOVERY = 'closed_no_recovery',
}

export enum FeedStatus {
	ONLINE = 'Online',
	OFFLINE = 'Offline',
	MUTED = 'Muted',
	INACTIVE = 'Inactive',
}

export enum FeedType {
	DATABASE = 'database',
	REST_API = 'rest_api',
	SFTP = 'sftp',
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
	ACTION_REQUIRED = 'action required',
	NO_ACTION_REQUIRED = 'no action required',
	UNKNOWN = 'unknown', // Specific segment for answer.text containing "unknown"
}

export enum QuestionType {
	DROPDOWN = 'dropdown',
	FREEFORM = 'freeform',
	MULTI = 'multi',
	SINGLE = 'single',
}

export enum PartyType {
	ENTITY = 'entity',
	FACILITATOR = 'facilitator',
}

export enum FacilitatorCategory {
	ADVERSE_CARRIER = 'adverse_carrier',
	ATTORNEY = 'attorney',
	EXPERT = 'expert',
	VENDOR = 'vendor',
}

export enum EntityCategory {
	RESPONSIBLE_PARTY = 'responsible_party',
	CLAIMANT = 'claimant',
	WITNESS = 'witness',
	PROPERTY_OWNER = 'property_owner',
}

export enum ClaimPartyRole {
	ADVERSE_CARRIER = 'adverse_carrier',
	OUR_ATTORNEY = 'our_attorney',
	THEIR_ATTORNEY = 'their_attorney',
	EXPERT = 'expert',
	RESPONSIBLE_PARTY = 'responsible_party',
	WITNESS = 'witness',
	PROPERTY_OWNER = 'property_owner',
	CLAIMANT = 'claimant',
	OTHER = 'other',
}

export enum UserStatus {}
