import { Answer, Question, TreeNode } from '@/types/types';
import { PageInstanceStatus, QuestionType } from '@/config/enums';

export const DEFAULT_ANSWER: Answer = {
	id: '',
	question_id: '',
	text: '',
	position: -1,
	grade: null,
	description_text: null,
	description_image_url: null,
	has_additional_info: false,
	additional_info_placeholder: null,
	additional_info_num_lines: null,
	hidden: false,
	calls_instance_id: null,
	requires_upload: false,
	allowed_extensions: null,
};

export const DEFAULT_TREE_NODE: TreeNode = {
	instanceId: '',
	parentInstanceId: null,
	pageId: '',
	position: -1,
	title: '',
	status: PageInstanceStatus.UNSTARTED,
	template_version: -1,
};

export const DEFAULT_QUESTION: Question = {
	answers: [],
	description_image_url: null,
	description_text: '',
	hidden: false,
	id: '',
	text: '',
	position: 1,
	page_id: '',
	placeholder: '',
	type: QuestionType.SINGLE,
};
