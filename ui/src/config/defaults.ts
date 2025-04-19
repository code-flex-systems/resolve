import { Answer, Question, TreeNode } from '../types';
import { QuestionType } from './enums';

export const DEFAULT_ANSWER: Answer = {
	id: -1,
	question_id: -1,
	text: '',
	position: -1,
	grade: null,
	description_text: '',
	description_image_url: '',
	has_additional_info: false,
	additional_info_placeholder: null,
	additional_info_num_lines: null,
	hidden: false,
	calls_instance_id: null,
};

export const DEFAULT_TREE_NODE: TreeNode = {
	instanceId: -1,
	parentInstanceId: null,
	pageId: -1,
	position: -1,
	title: '',
};

export const DEFAULT_QUESTION: Question = {
	answers: [],
	description_image_url: null,
	description_text: '',
	hidden: false,
	id: -1,
	text: '',
	position: 1,
	page_id: -1,
	placeholder: '',
	type: QuestionType.SINGLE,
};
