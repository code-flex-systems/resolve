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

export interface Checklist {
	id: number;
	name: string;
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
