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

export interface TreeNode {
	instanceId: number;
	parentInstanceId: number | null;
	pageId: number;
	title: string;
	children?: TreeNode[];
}
