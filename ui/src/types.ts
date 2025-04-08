import { JSX } from 'react';

export interface Answer {
	id: number;
	a_desc: string | null;
	a_text: string;
	a_order: number;
	a_type: string | null;
	a_freeform_lines: number | null;
	a_freeform_placeholder: string | null;
	calls_page_id: number | null;
	doc_id: number | null;
	filename: string | null;
	alias: string | null;
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
	id: number;
	title: string;
	children?: TreeNode[];
}

export interface Question {
	id: number;
	page_id: number;
	q_text: string;
	q_type: string | null;
	q_desc: string | null;
	doc_id: number | null;
	answers: Answer[];
	q_filename: string | null;
	q_alias: string | null;
}
