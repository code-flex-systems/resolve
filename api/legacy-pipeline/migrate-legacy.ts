import { FlatRow } from './csv-parse-script';

// One top-level page in the checklist (i.e., a future page_template + page_instance)
export interface ParsedPage {
	legacyPageId: number; // e.g. 1965 (used for mapping, not persisted as PK)
	name: string; // Unique page name (used to identify templates)
	position: number; // Order in checklist
	questions: ParsedQuestion[];
}

// A question within a page
export interface ParsedQuestion {
	legacyQuestionId: number; // Internal legacy ID
	text: string;
	position: number;
	answers: ParsedAnswer[];
}

// An answer within a question
export interface ParsedAnswer {
	legacyAnswerId: number;
	text: string;
	position: number;
	linkedPageId?: number; // legacyPageId of the page this answer links to
	linkedPageName?: string;
}

export interface NormalizedPage {
	title: string;
	position: number;
	questions: NormalizedQuestion[];
}

export interface NormalizedQuestion {
	text: string;
	position: number;
	type: 'single' | 'multi';
	answers: NormalizedAnswer[];
}

export interface NormalizedAnswer {
	text: string;
	position: number;
	hasAdditionalInfo: boolean;
	additionalInfoPlaceholder: string | null;
	additionalInfoNumLines: number | null;
	legacyLinkedPageId?: number;
}

const hasAdditionalInfo = (answerText: string) => answerText.toLowerCase().includes('other');

function inferQuestionType(q: ParsedQuestion): 'single' | 'multi' {
	const lowerAnswers = q.answers.map((a) => a.text.toLowerCase());
	const hasYes = lowerAnswers.includes('yes');
	const hasNo = lowerAnswers.includes('no');
	if (hasYes && hasNo) return 'single';
	return 'multi';
}

function normalizeAnswer(a: ParsedAnswer): NormalizedAnswer {
	const isOther = hasAdditionalInfo(a.text);
	return {
		text: a.text.trim(),
		position: a.position,
		hasAdditionalInfo: isOther,
		additionalInfoPlaceholder: isOther ? 'Please specify' : null,
		additionalInfoNumLines: isOther ? 1 : null,
		legacyLinkedPageId: a.linkedPageId,
	};
}

export function normalizeParsedPages(parsed: ParsedPage[]): NormalizedPage[] {
	return parsed.map((page) => ({
		title: page.name.trim(),
		position: page.position,
		questions: page.questions.map((q) => ({
			text: q.text.trim(),
			position: q.position,
			type: inferQuestionType(q),
			answers: q.answers.map(normalizeAnswer),
		})),
	}));
}

export function groupFlatRowsToParsedPages(rows: FlatRow[]): ParsedPage[] {
	const pages: ParsedPage[] = [];
	const pageMap = new Map<number, ParsedPage>();
	const questionMap = new Map<string, ParsedQuestion>(); // key = `${pageId}-${questionId}`

	for (const row of rows) {
		if (!row.pageId || !row.questionId) continue;

		// Create or retrieve the page
		let page = pageMap.get(row.pageId);
		if (!page) {
			page = {
				legacyPageId: row.pageId,
				name: row.pageName ?? `Untitled Page ${row.pageId}`,
				position: pages.length + 1,
				questions: [],
			};
			pages.push(page);
			pageMap.set(row.pageId, page);
		}

		// Create or retrieve the question
		const qKey = `${row.pageId}-${row.questionId}`;
		let question = questionMap.get(qKey);
		if (!question) {
			question = {
				legacyQuestionId: row.questionId,
				position: row.questionPosition ?? page.questions.length + 1,
				text: row.questionText ?? `Untitled Q${row.questionId}`,
				answers: [],
			};
			page.questions.push(question);
			questionMap.set(qKey, question);
		}

		// Add the answer
		question.answers.push({
			legacyAnswerId: row.answerId,
			position: row.answerPosition,
			text: row.answerText,
			linkedPageId: row.linkedPageId,
			linkedPageName: row.linkedPageName,
		});
	}

	return pages;
}
