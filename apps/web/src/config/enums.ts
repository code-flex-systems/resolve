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

export enum LineOfBusiness {
	AUTO = 'auto',
	PROPERTY = 'property',
	GENERAL_LIABILITY = 'general_liability',
	WORKERS_COMP = 'workers_comp',
	PROFESSIONAL_LIABILITY = 'professional_liability',
}

export enum LossType {
	COLLISION = 'collision',
	COMPREHENSIVE = 'comprehensive',
	FIRE = 'fire',
	THEFT = 'theft',
	WATER_DAMAGE = 'water_damage',
	WIND = 'wind',
	VANDALISM = 'vandalism',
	BODILY_INJURY = 'bodily_injury',
	PROPERTY_DAMAGE = 'property_damage',
	UNINSURED_MOTORIST = 'uninsured_motorist',
	MEDICAL_PAYMENTS = 'medical_payments',
	PERSONAL_INJURY_PROTECTION = 'personal_injury_protection',
	OTHER = 'other',
}

export enum CoverageType {
	COLLISION = 'collision',
	COMPREHENSIVE = 'comprehensive',
	LIABILITY = 'liability',
	UNINSURED_MOTORIST = 'uninsured_motorist',
	MEDICAL_PAYMENTS = 'medical_payments',
	PERSONAL_INJURY_PROTECTION = 'personal_injury_protection',
	DWELLING = 'dwelling',
	PERSONAL_PROPERTY = 'personal_property',
	LOSS_OF_USE = 'loss_of_use',
	OTHER = 'other',
}

/**
 * Entity types that can have deadlines linked to them
 */
export enum DeadlineEntityType {
	TASK = 'task',
	CLAIM = 'claim',
	CHECKLIST_CLAIM = 'checklist_claim',
	MANUAL = 'manual', // Standalone deadline not linked to any entity
}

/**
 * Status of a deadline
 */
export enum DeadlineStatus {
	PENDING = 'pending',
	MET = 'met',
	MISSED = 'missed',
	CANCELLED = 'cancelled',
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

// ============================================================================
// WORKFLOW MANAGEMENT ENUMS
// ============================================================================

/**
 * Task status stored in the database
 * Represents the workflow state of a task
 */
export enum TaskStatus {
	PENDING = 'pending', // Task created, not yet claimed
	IN_PROGRESS = 'in_progress', // Task claimed and being worked on
	COMPLETED = 'completed', // Task completed
	CANCELLED = 'cancelled', // Task cancelled
}

/**
 * Derived task status calculated from task fields + linked deadline
 * Used for display purposes to show if task was completed on time or late
 */
export enum DerivedTaskStatus {
	AVAILABLE = 'available', // status = 'pending' AND claimed_by IS NULL
	IN_PROGRESS = 'in_progress', // status = 'in_progress' OR (status = 'pending' AND claimed_by IS NOT NULL)
	COMPLETED_ON_TIME = 'completed_on_time', // status = 'completed' AND deadline.status = 'met'
	COMPLETED_LATE = 'completed_late', // status = 'completed' AND deadline.status = 'missed'
	CANCELLED = 'cancelled', // status = 'cancelled'
}

/**
 * Types of tasks that can be assigned
 * Add new task types here as business requirements emerge
 */
export enum TaskType {
	GENERIC = 'generic',
	OUTBOUND_CALL = 'outbound_call',
	INBOUND_CALL = 'inbound_call',
	SEND_DOCUMENT = 'send_document',
	REQUEST_DOCUMENT = 'request_document',
	SEND_DEMAND = 'send_demand',
	REVIEW = 'review',
	FOLLOW_UP = 'follow_up',
	LETTER = 'letter',
}

/**
 * Trigger types for workflow rules
 * Defines what event causes a rule to be evaluated
 */
export enum WorkflowTriggerType {
	MANUAL = 'manual', // Admin-initiated
	CLAIM_AGE = 'claim_age', // Days since loss date
	LOCATION_AGE = 'location_age', // Days in current desk location
	FIELD_CHANGE = 'field_change', // Specific field updated
	TASK_COMPLETED = 'task_completed', // Task marked complete
	// Add more as requirements emerge
}

/**
 * Action types for workflow rules
 * Defines what happens when a rule fires
 */
export enum WorkflowActionType {
	MOVE_CLAIM = 'move_claim', // Move to different desk location
	CREATE_TASK = 'create_task', // Create task for another desk
	NOTIFY_USER = 'notify_user', // Send notification
	UPDATE_PRIORITY = 'update_priority', // Change claim priority
	// Add more as requirements emerge
}

/**
 * Execution mode for workflow rules
 */
export enum WorkflowExecutionMode {
	SUGGEST = 'suggest', // Rule generates suggestions for admin approval
	AUTO = 'auto', // Rule executes automatically (future)
}

/**
 * Threshold types for workflow evaluation queries
 */
export enum WorkflowThresholdType {
	USER_CAPACITY = 'user_capacity', // Max claims per user
	LOCATION_AGE = 'location_age', // Max days in location before stale
	TASK_DUE = 'task_due', // Days before due date to warn
	// Add more as requirements emerge
}
