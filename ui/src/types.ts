import { ButtonOwnProps } from '@mui/material';
import { JSX } from 'react';

export interface Answer {
	id: number;
	question_id: number;
	text: string;
	position: number;
	grade: number | null;
	description_text: string | null;
	description_image_url: string | null;
	has_additional_info: boolean;
	additional_info_placeholder: string | null;
	additional_info_num_lines: number | null;
	hidden: boolean;
	calls_instance_id: number | null;
}

export interface AnswerStat {
	answer_count: number;
	answer_id: number;
	answer_text: string;
}

export interface AnswerResponse {
	created_at: Date | null;
	additional_info: string | null;
	claim_number: string | null;
	client: string | null;
	id: number;
}

export interface Checklist {
	id: number;
	name: string;
}

export interface DialogAction {
	label: string;
	onClick: () => void;
	disabled?: boolean;
	hidden?: boolean;
	color?: ButtonOwnProps['color'];
}

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
}

export interface TreeNode {
	instanceId: number;
	parentInstanceId: number | null;
	pageId: number;
	position: number;
	title: string;
	children?: TreeNode[];
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
	response_text?: string;
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
