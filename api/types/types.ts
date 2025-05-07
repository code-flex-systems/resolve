import { PageInstanceStatus } from '../config/enums';

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

export type ClaimSearchType = 'claim_number' | 'insured';

export type Interval<T> = {
	from?: T;
	to?: T;
};

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

export interface QuestionResponse {
	checklist_id: number;
	instance_id: number;
	claim_id: number;
	question_id: number;
	response_text: string | null;
	selected_answers: QuestionResponseAnswer[];
}

export interface QuestionResponseAnswer {
	answer_id: number;
	additional_info: string | null;
}

export interface QuestionStat {
	question_id: number;
	question_text: string;
	answers: AnswerStat[];
}
