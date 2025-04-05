export interface Answer {
	id: number;
	a_text: string;
	a_order: number;
	a_type: string;
	calls_page_id: number | null;
	doc_id: number | null;
	filename: string | null;
	alias: string | null;
}
