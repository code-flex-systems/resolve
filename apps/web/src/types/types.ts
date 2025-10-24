import { ButtonOwnProps } from '@mui/material';
import { JSX } from 'react';
import config from '@/config/config';
import { PageInstanceStatus } from '@/config/enums';

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
	id: number;
}

export interface AnswerStat {
	answer_count: number;
	answer_id: number;
	answer_text: string;
}

export interface Claim {
	id: number;
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
	expected_recovery: number | null;
}

export interface Checklist {
	id: number;
	created_at: string;
	created_by: string;
	name: string;
	page_count?: number;
	updated_at: string;
}

export interface ChecklistClaim {
	checklist_id: number;
	checklist_name: string;
	claim_id: number;
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
	answer_id: number;
	page_id: number;
	page_title: string;
	question_id: number;
	question_text: string;
	response_text?: string;
	answer_texts?: string;
}

export interface Comment {
	checklistId: number;
	claimId: number;
	instanceId?: number;
	questionId?: number;
	body: string;
}

export interface CommentFilters {
	userId?: string;
	checklistId?: number;
	claimId?: number;
	instanceId?: number;
	questionId?: number;
}

export type DateRange = [Date | null, Date | null];

export type DateRangeStrict = [Date, Date];

export interface DialogAction {
	label: string;
	onClick: () => void;
	disabled?: boolean;
	hidden?: boolean;
	color?: ButtonOwnProps['color'];
	icon?: JSX.Element;
}

export interface InstanceListItem {
	title: string;
	instanceId: number;
	pageId: number;
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
	id: number;
	title: string;
	parent_id: number | null;
	instance_id: number;
}

export interface PageTemplate {
	hidden: boolean;
	id: number;
	title: string;
	version: number;
}

export interface Question {
	answers: Answer[];
	description_image_url: string | null;
	description_text: string | null;
	hidden: boolean | null;
	id: number;
	text: string;
	position: number;
	page_id: number;
	placeholder: string | null;
	type: string;
}

export interface QuestionResponse {
	checklist_id: number;
	instance_id: number;
	claim_id: number;
	question_id: number;
	response_text?: string | null;
	selected_answers: QuestionResponseAnswer[];
}

export interface QuestionResponseAnswer {
	answer_id: number;
	additional_info?: string;
}

export interface QuestionStat {
	question_id: number;
	question_text: string;
	answers: AnswerStat[];
}

export type Role = (typeof config.ROLES)[keyof typeof config.ROLES];

export interface TreeNode {
	instanceId: number;
	parentInstanceId: number | null;
	pageId: number;
	position: number;
	title: string;
	children?: TreeNode[];
	status: PageInstanceStatus;
	template_version: number | null;
}

export interface User {
	email: string;
	roles: UserRole[];
	userid: number;
	username: string;
}

export type UserRole = (typeof config.ROLES)[keyof typeof config.ROLES];
