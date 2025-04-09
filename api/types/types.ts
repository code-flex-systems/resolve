export interface Answer {
	id: number;
	a_desc: string | null;
	a_text: string;
	a_order: number;
	a_type: string;
	a_freeform_lines: number | null;
	a_freeform_placeholder: string | null;
	calls_page_id: number | null;
	doc_id: number | null;
	filename: string | null;
	alias: string | null;
}

export interface TreeNode {
	instanceId: number;
	parentInstanceId: number | null;
	pageId: number;
	title: string;
	children?: TreeNode[];
}
