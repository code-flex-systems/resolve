import { TreeViewBaseItem } from '@mui/x-tree-view';
import { ChecklistMode } from '../config/enums';
import { Question, TreeNode } from '../types';

export interface ChecklistSlice {
	expanded: Map<number, boolean>;
	expandAll: boolean;
	mode: ChecklistMode;
	pages: Map<number, Question[]>;
	selectedPage: number | null;
	tree: TreeNode[];
}

export interface GlobalSlice {
	navOpen: boolean;
	selectedPage: string;
	user: number;
}

export interface HomeSlice {}
