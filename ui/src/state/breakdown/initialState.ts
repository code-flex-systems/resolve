import { BreakdownSlice } from '../storeTypes';

const breakdownSlice: BreakdownSlice = Object.freeze({
	answerBreakdowns: new Map(),
	breakdownInterval: {},
	pageInstance: null,
	selectedAnswerId: null,
	selectedQuestionId: null,
	questionStats: new Map(),
});

export default breakdownSlice;
