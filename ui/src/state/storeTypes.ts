import { ChecklistMode } from '../config/enums';
import {
	AnswerResponse,
	Checklist,
	ChecklistClaim,
	Claim,
	PageTemplate,
	Question,
	QuestionResponse,
	TreeNode,
	User,
} from '../types';

export interface ChecklistSlice {
	answerResponses: Map<number, AnswerResponse[]>;
	checklist: Checklist | null;
	claim: Claim | null;
	expandAll: boolean;
	maxPageInstancePosition: number;
	mode: ChecklistMode;
	pages: Map<number, { version: number; questions: Question[] }>;
	pageTemplates: PageTemplate[];
	responses: Map<number, { version: number; responses: Record<number, QuestionResponse> }>;
	selectedAnswer: number | null;
	selectedPageInstance: number | null;
	selectedPageInfo: TreeNode | null;
	selectedQuestion: number | null;
	tree: TreeNode[];
	visibleInstanceIds: number[];
	// dialogs
	showStatsDialog: boolean;
}

export interface ChecklistsSlice {
	recentChecklistClaims: ChecklistClaim[];
	selectedChecklist: Checklist | null;
	selectedClaim: Claim | null;
	// dialogs
	showChecklistClaimDialog: boolean;
}

export interface GlobalSlice {
	navOpen: boolean;
	selectedPage: string;
	user: User;
}

export interface HomeSlice {}
