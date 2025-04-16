import { ChecklistMode } from '../../config/enums';
import { ChecklistSlice } from '../storeTypes';

const checklistSlice: ChecklistSlice = Object.freeze({
	claim: null,
	expanded: new Map(),
	expandAll: false,
	mode: ChecklistMode.EDIT,
	pages: new Map(),
	responses: {},
	selectedAnswer: null,
	selectedPageInstance: null,
	selectedPageInfo: null,
	selectedQuestion: null,
	tree: [],
});

export default checklistSlice;
