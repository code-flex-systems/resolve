import { ChecklistMode } from '../config/enums';
import { AnswerResponse, Checklist, PageTemplate, Question, QuestionResponse, TreeNode } from '../types';

export interface ChecklistSlice {
	answerResponses: Map<number, AnswerResponse[]>;
	claim: any;
	expandAll: boolean;
	maxPageInstancePosition: number;
	mode: ChecklistMode;
	pages: Map<number, Question[]>;
	pageTemplates: PageTemplate[];
	responses: Map<number, Record<number, QuestionResponse>>;
	selectedAnswer: number | null;
	selectedPageInstance: number | null;
	selectedPageInfo: TreeNode | null;
	selectedQuestion: number | null;
	tree: TreeNode[];
	// dialogs
	showStatsDialog: boolean;
}

export interface GlobalSlice {
	checklist: Checklist | null;
	navOpen: boolean;
	selectedPageInstance: string;
	user: number;
}

export interface HomeSlice {}
