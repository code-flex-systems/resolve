import { ChecklistMode } from '../config/enums';
import { Checklist, Question, QuestionResponse, TreeNode } from '../types';

export interface ChecklistSlice {
	claim: any;
	expandAll: boolean;
	maxPageInstancePosition: number;
	mode: ChecklistMode;
	pages: Map<number, Question[]>;
	responses: Map<number, Record<number, QuestionResponse>>;
	selectedAnswer: number | null;
	selectedPageInstance: number | null;
	selectedPageInfo: TreeNode | null;
	selectedQuestion: number | null;
	tree: TreeNode[];
}

export interface GlobalSlice {
	checklist: Checklist | null;
	navOpen: boolean;
	selectedPageInstance: string;
	user: number;
}

export interface HomeSlice {}
