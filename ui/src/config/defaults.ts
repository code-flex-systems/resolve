import { Answer, Question, TreeNode } from '../types';
import { AnswerType, QuestionType } from './enums';

export const DEFAULT_ANSWER: Answer = {
	id: -1,
	description_text: '',
	text: '',
	position: -1,
	a_type: AnswerType.STANDARD,
	a_freeform_lines: null,
	a_freeform_placeholder: null,
	calls_page_id: null,
	doc_id: null,
	filename: null,
	alias: null,
};

export const DEFAULT_TREE_NODE: TreeNode = {
	instanceId: -1,
	parentInstanceId: null,
	pageId: -1,
	title: '',
};

export const DEFAULT_QUESTION: Question = {
	id: -1,
	page_id: -1,
	text: '',
	type: QuestionType.SINGLE,
	description_text: '',
	answers: [],
	doc_id: null,
	q_filename: null,
	q_alias: null,
};
