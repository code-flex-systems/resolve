import { JSX } from 'react';

export interface Answer {
	id: number;
	question_id: number;
	text: string;
	position: number;
	description_text: string | null;
	description_image_url: string | null;
	has_additional_info: boolean;
	additional_info_placeholder: string | null;
	additional_info_num_lines: number | null;
	hidden: boolean;
	calls_instance_id: number | null;
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

export interface TreeNode {
	instanceId: number;
	parentInstanceId: number | null;
	pageId: number;
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
	num_lines: number | null;
	page_id: number;
	placeholder: string | null;
	type: string;
}
