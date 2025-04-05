import { ChecklistMode } from '../../config/enums';
import { ChecklistSlice } from '../storeTypes';

const checklistSlice: ChecklistSlice = Object.freeze({
	expanded: new Map(),
	expandAll: false,
	mode: ChecklistMode.VIEW,
	pages: new Map(),
	selectedPage: null,
	tree: [],
});

export default checklistSlice;
