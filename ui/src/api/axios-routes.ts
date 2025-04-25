import { QuestionResponse } from '../types';
import { performAsyncDelete, performAsyncGet, performAsyncPost, performAsyncPut } from './axios-utils';

const ROUTES = {
	ANSWERS: '/answers',
	CHECKLISTS: '/checklists',
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
	return performAsyncGet(`/${checklistId}/claims/${claimId}`);
}
// DUMMY

export function createAnswer(questionId: number, answer: object) {
	return performAsyncPost(`/${questionId}${ROUTES.ANSWERS}`, answer);
}

export function copyAnswer(questionId: number, answerId: number) {
	return performAsyncPost(`/${questionId}${ROUTES.ANSWERS}/copy/${answerId}`, {});
}

export function deleteAnswer(answerId: number) {
	return performAsyncDelete(`${ROUTES.ANSWERS}/${answerId}`);
}

export function getAnswer(answerId: number) {
	return performAsyncGet(`${ROUTES.ANSWERS}/${answerId}`);
}

export function getAnswers(questionId: number) {
	return performAsyncGet(`/${questionId}${ROUTES.ANSWERS}`);
}

export function modifyAnswer(answerId: number, updates: object) {
	return performAsyncPut(`${ROUTES.ANSWERS}/${answerId}`, updates);
}

export function createChecklist(checklist: object) {
	return performAsyncPost(ROUTES.CHECKLISTS, checklist);
}

export function deleteChecklist(checklistId: number) {
	return performAsyncDelete(`${ROUTES.CHECKLISTS}/${checklistId}`);
}

export function getChecklist(checklistId: number) {
	return performAsyncGet(`${ROUTES.CHECKLISTS}/${checklistId}`);
}

export function getChecklists() {
	return performAsyncGet(ROUTES.CHECKLISTS);
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

export function getPageInstanceTree(checklistId: number) {
	return performAsyncGet(`/${checklistId}${ROUTES.PAGES}${ROUTES.INSTANCES}/tree`);
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

export function deleteQuestion(questionId: number) {
	return performAsyncDelete(`${ROUTES.QUESTIONS}/${questionId}`);
}

export function getQuestion(questionId: number) {
	return performAsyncGet(`${ROUTES.QUESTIONS}/${questionId}`);
}

export function getQuestions(pageId: number) {
	return performAsyncGet(`/${pageId}${ROUTES.QUESTIONS}`);
}

export function getQuestionStats(pageId: number) {
	return performAsyncGet(`/${pageId}${ROUTES.QUESTIONS}${ROUTES.STATS}`);
}

export function modifyQuestion(questionId: number, updates: object) {
	return performAsyncPut(`${ROUTES.QUESTIONS}/${questionId}`, updates);
}

export function getAllResponses(checklistId: number, claimId: number) {
	return performAsyncGet(`/${checklistId}/${claimId}${ROUTES.RESPONSES}`);
}

export function getResponses(checklistId: number, claimId: number, instanceId: number) {
	return performAsyncGet(`/${checklistId}/${claimId}/${instanceId}${ROUTES.RESPONSES}`);
}

export function getResponsesForAnswer(answerId: number) {
	return performAsyncGet(`/${answerId}${ROUTES.RESPONSES}`);
}

export function upsertResponses(responses: QuestionResponse[]) {
	return performAsyncPost(ROUTES.RESPONSES, { responses });
}
