import { Answer, Question } from '../types';
import { QuestionType } from './enums';

export const DEFAULT_ANSWER: Answer = {
	id: -1,
	a_desc: '',
	a_text: '',
	a_order: -1,
	a_type: null,
	a_freeform_lines: null,
	a_freeform_placeholder: null,
	calls_page_id: null,
	doc_id: null,
	filename: null,
	alias: null,
};

export const DEFAULT_QUESTION: Question = {
	id: -1,
	page_id: -1,
	q_text: '',
	q_type: QuestionType.SINGLE,
	q_desc: '',
	answers: [],
	doc_id: null,
	q_filename: null,
	q_alias: null,
};
