import { ClaimSearchType, Interval, QuestionResponse } from '../types';
import { buildQuery, performAsyncDelete, performAsyncGet, performAsyncPost, performAsyncPut } from './axios-utils';

const ROUTES = {
	ANSWERS: '/answers',
	CHECKLISTS: '/checklists',
	CLAIMS: '/claims',
	DOCS: '/docs',
	INSTANCES: '/instances',
	PAGES: '/pages',
	QUESTIONS: '/questions',
	RESPONSES: '/responses',
	STATS: '/stats',
	USERS: '/users',
};

// DUMMY
export function getClaim(checklistId: number, claimId: number) {
	return performAsyncGet(`${ROUTES.CLAIMS}/${claimId}?checklistId=${checklistId}`);
}

export function getClaims(searchTerm?: { type: ClaimSearchType; value: string }) {
	return performAsyncGet(`${ROUTES.CLAIMS}${buildQuery(searchTerm)}`);
}
// DUMMY

export function createAnswer(pageId: number, questionId: number, answer: object) {
	return performAsyncPost(`/${pageId}/${questionId}${ROUTES.ANSWERS}`, answer);
}

export function copyAnswer(pageId: number, questionId: number, answerId: number) {
	return performAsyncPost(`/${pageId}/${questionId}${ROUTES.ANSWERS}/copy/${answerId}`, {});
}

export function deleteAnswer(pageId: number, answerId: number) {
	return performAsyncDelete(`/${pageId}${ROUTES.ANSWERS}/${answerId}`);
}

export function getAnswer(answerId: number) {
	return performAsyncGet(`${ROUTES.ANSWERS}/${answerId}`);
}

export function getAnswers(questionId: number) {
	return performAsyncGet(`/${questionId}${ROUTES.ANSWERS}`);
}

export function modifyAnswer(pageId: number, answerId: number, updates: object) {
	return performAsyncPut(`/${pageId}${ROUTES.ANSWERS}/${answerId}`, updates);
}

export function createChecklist(claimId: number, checklist: object) {
	return performAsyncPost(`${ROUTES.CHECKLISTS}/${claimId}`, checklist);
}

export function deleteChecklist(checklistId: number) {
	return performAsyncDelete(`${ROUTES.CHECKLISTS}/${checklistId}`);
}

export function getChecklist(checklistId: number) {
	return performAsyncGet(`${ROUTES.CHECKLISTS}/${checklistId}`);
}

export function getChecklists(searchTerm?: string) {
	return performAsyncGet(`${ROUTES.CHECKLISTS}${buildQuery({ searchTerm })}`);
}

export function getChecklistClaim(checklistId: number, claimId: number) {
	return performAsyncGet(`${ROUTES.CHECKLISTS}/${checklistId}${ROUTES.CLAIMS}/${claimId}`);
}

export function getRecentChecklistClaims() {
	return performAsyncGet(`${ROUTES.CHECKLISTS}/recents`);
}

export function modifyChecklist(checklistId: number, updates: object) {
	return performAsyncPut(`${ROUTES.CHECKLISTS}/${checklistId}`, updates);
}

export function createDoc(doc: object) {
	return performAsyncPost(ROUTES.DOCS, doc);
}

export function deleteDoc(docId: number) {
	return performAsyncDelete(`${ROUTES.DOCS}/${docId}`);
}

export function getDoc(docId: number) {
	return performAsyncGet(`${ROUTES.DOCS}/${docId}`);
}

export function getDocs() {
	return performAsyncGet(ROUTES.DOCS);
}

export function createPage(checklistId: number, params: { title: string; parentId: number; position: number }) {
	return performAsyncPost(`/${checklistId}${ROUTES.PAGES}`, params);
}

export function createPageInstance(
	checklistId: number,
	pageId: number,
	params: { parentId: number; position: number }
) {
	return performAsyncPost(`/${checklistId}${ROUTES.PAGES}/${pageId}`, params);
}

export function deletePageInstance(instanceId: number) {
	return performAsyncDelete(`${ROUTES.PAGES}${ROUTES.INSTANCES}/${instanceId}`);
}

export function getPage(pageId: number) {
	return performAsyncGet(`${ROUTES.PAGES}/${pageId}`);
}

export function getPages() {
	return performAsyncGet(ROUTES.PAGES);
}

export function getPageInstance(checklistId: number, instanceId: number) {
	return performAsyncGet(`/${checklistId}${ROUTES.PAGES}${ROUTES.INSTANCES}/${instanceId}`);
}

export function getPageInstances(checklistId: number, parentId: number) {
	return performAsyncGet(`/${checklistId}${ROUTES.PAGES}/${parentId}`);
}

export function getPageInstanceTree(checklistId: number, claimId?: number) {
	return performAsyncGet(`/${checklistId}${ROUTES.PAGES}${ROUTES.INSTANCES}/tree${buildQuery({ claimId })}`);
}

export function getVisiblePageInstances(checklistId: number, claimId: number) {
	return performAsyncGet(`/${checklistId}/${claimId}${ROUTES.PAGES}${ROUTES.INSTANCES}`);
}

export function modifyPage(pageId: number, updates: object) {
	return performAsyncPut(`${ROUTES.PAGES}/${pageId}`, updates);
}

export function createQuestion(pageId: number, question: object) {
	return performAsyncPost(`/${pageId}${ROUTES.QUESTIONS}`, question);
}

export function copyQuestion(pageId: number, questionId: number) {
	return performAsyncPost(`/${pageId}${ROUTES.QUESTIONS}/copy/${questionId}`, {});
}

export function deleteQuestion(pageId: number, questionId: number) {
	return performAsyncDelete(`/${pageId}${ROUTES.QUESTIONS}/${questionId}`);
}

export function getQuestion(questionId: number) {
	return performAsyncGet(`${ROUTES.QUESTIONS}/${questionId}`);
}

export function getQuestions(pageId: number) {
	return performAsyncGet(`/${pageId}${ROUTES.QUESTIONS}`);
}

export function getQuestionStats(pageId: number, interval?: Interval<string>) {
	return performAsyncGet(`/${pageId}${ROUTES.QUESTIONS}${ROUTES.STATS}${buildQuery(interval)}`);
}

export function modifyQuestion(pageId: number, questionId: number, updates: object) {
	return performAsyncPut(`/${pageId}${ROUTES.QUESTIONS}/${questionId}`, updates);
}

export function evaluateResponses(checklistId: number, claimId: number, instanceId: number) {
	return performAsyncPut(`/${checklistId}/${claimId}/${instanceId}${ROUTES.RESPONSES}/evaluate`, {});
}

export function getAllResponses(checklistId: number, claimId: number) {
	return performAsyncGet(`/${checklistId}/${claimId}${ROUTES.RESPONSES}`);
}

export function getResponses(checklistId: number, claimId: number, instanceId: number) {
	return performAsyncGet(`/${checklistId}/${claimId}/${instanceId}${ROUTES.RESPONSES}`);
}

export function getResponsesForAnswer(answerId: number, interval?: Interval<string>) {
	return performAsyncGet(`/${answerId}${ROUTES.RESPONSES}${buildQuery(interval)}`);
}

export function upsertResponses(responses: QuestionResponse[]) {
	return performAsyncPost(ROUTES.RESPONSES, { responses });
}
