import { JSX } from 'react';
import config from '@/config/config';
import { PageInstanceStatus } from '@/config/enums';

type ButtonColor = 'inherit' | 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning';

// Plain Answer interface for runtime use (matches query output)
export interface Answer {
	id: string;
	text: string;
	position: number;
	question_id?: string;
	description_text: string | null;
	description_image_url: string | null;
	grade: string | null;
	additional_info_num_lines: number | null;
	additional_info_placeholder: string | null;
	has_additional_info: boolean | null;
	hidden?: boolean | null;
	calls_instance_id: string | null;
	requires_upload: boolean | null;
	allowed_extensions: string | null;
	has_action?: boolean;
	client_id?: string;
	created_at?: string;
	created_by?: string;
	updated_at?: string;
	updated_by?: string | null;
}

export interface ActionDefinition {
	dept?: string;
	desk_type?: string;
	desk?: string;
	message?: string;
	recipients?: string[];
	schedule?: Date;
	task_type?: string;
	template_id?: string;
	title?: string;
}

export interface AnswerResponse {
	created_at: Date | null;
	additional_info: string | null;
	claim_number: string | null;
	client: string | null;
	id: string;
}

export interface AnswerStat {
	answer_count: number;
	answer_id: string;
	answer_text: string;
}

export interface Claim {
	id: string;
	claim_number: string | null;
	client: string | null;
	client_adjuster: string | null;
	insured: string | null;
	claim_amount: number | null;
	total_incurred: number | null;
	date_of_loss: Date | null;
	loss_location: string | null;
	last_updated_by: string | null;
	last_update: Date | null;
	reserved_recovery: number | null; // Client's expected recovery (from feed/manual)
	paid_recovery: number | null; // Client's reported paid amount (from feed/manual)
	expected_recovery: number | null; // Team's forecasted recovery (manual, eventually auto-calculated)
	actual_recovery: number | null; // Team's meaningful payments (calculated from recovery events)
	line_of_business: string | null;
	loss_type: string | null;
	recovery_status: string | null;
	substatus: string | null;
}

export interface Checklist {
	id: string;
	created_at: string;
	created_by: string;
	name: string;
	page_count?: number;
	updated_at: string;
}

export interface ChecklistClaim {
	checklist_id: string;
	checklist_name: string;
	claim_id: string;
	claim_number: string;
	client: string;
	last_opened: Date;
}

export interface ChecklistSummary {
	total_answered: string;
	total_questions: string;
	total_known: string;
	total_unknown: string;
}

export interface ChecklistSummaryCache {
	rows: ChecklistSummaryRow[];
	totalCount: number;
	fetchedAt: Date;
}

export interface ChecklistSummaryRow {
	answer_id: string;
	page_id: string;
	page_title: string;
	question_id: string;
	question_text: string;
	response_text?: string;
	answer_texts?: string;
}

export interface Comment {
	checklistId: string;
	claimId: string;
	instanceId?: string;
	questionId?: string;
	body: string;
}

export interface CommentFilters {
	userId?: string;
	checklistId?: string;
	claimId?: string;
	instanceId?: string;
	questionId?: string;
}

export type DateRange = [Date | null, Date | null];

export type DateRangeStrict = [Date, Date];

export interface DialogAction {
	label: string;
	onClick: () => void;
	disabled?: boolean;
	hidden?: boolean;
	color?: ButtonColor;
	icon?: JSX.Element;
}

export interface InstanceListItem {
	title: string;
	instanceId: string;
	pageId: string;
	position: number;
}

export type Interval<T> = {
	from?: T;
	to?: T;
};

export interface NavListItem {
	color?: string;
	icon?: JSX.Element;
	label: string;
	route: string;
}

export interface PageInstance {
	id: string;
	title: string;
	parent_id: string | null;
	instance_id: string;
}

export interface PageTemplate {
	hidden: boolean;
	id: string;
	title: string;
	version: number;
}

export interface Question {
	answers: Answer[];
	description_image_url: string | null;
	description_text: string | null;
	hidden: boolean | null;
	id: string;
	text: string;
	position: number;
	page_id: string;
	placeholder: string | null;
	type: string;
}

export interface QuestionResponse {
	checklist_id: string;
	instance_id: string;
	claim_id: string;
	question_id: string;
	response_text?: string | null;
	response_doc_id?: string | null;
	selected_answers: QuestionResponseAnswer[];
}

export interface QuestionResponseAnswer {
	answer_id: string;
	additional_info?: string;
}

export interface QuestionStat {
	question_id: string;
	question_text: string;
	answers: AnswerStat[];
}

export type Role = (typeof config.ROLES)[keyof typeof config.ROLES];

export interface TreeNode {
	instanceId: string;
	parentInstanceId: string | null;
	pageId: string;
	position: number;
	title: string;
	children?: TreeNode[];
	status: PageInstanceStatus;
	template_version: number | null;
}

export interface User {
	email: string;
	roles: UserRole[];
	userid: string;
	username: string;
}

export type UserRole = (typeof config.ROLES)[keyof typeof config.ROLES];
