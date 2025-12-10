/**
 * Page, Question, Answer Fixtures
 */

import { Kysely } from 'kysely';
import type { DB } from '@/api/database/types';

/**
 * Create a test page
 */
export async function createTestPage(
	db: Kysely<DB>,
	overrides: {
		client_id: string;
		created_by: string;
		title?: string;
		hidden?: boolean;
	}
) {
	const data = {
		client_id: overrides.client_id,
		created_by: overrides.created_by,
		title: overrides.title || `Test Page ${Date.now()}`,
		hidden: overrides.hidden ?? false,
	};

	return db.insertInto('page').values(data).returningAll().executeTakeFirstOrThrow();
}

/**
 * Create a test page instance (links a page to a checklist)
 */
export async function createTestPageInstance(
	db: Kysely<DB>,
	overrides: {
		client_id: string;
		page_id: number;
		checklist_id: number;
		created_by: string;
		parent_instance_id?: number | null;
		position?: number;
	}
) {
	const data = {
		client_id: overrides.client_id,
		page_id: overrides.page_id,
		checklist_id: overrides.checklist_id,
		created_by: overrides.created_by,
		parent_instance_id: overrides.parent_instance_id ?? null,
		position: overrides.position ?? 0,
	};

	return db.insertInto('page_instance').values(data).returningAll().executeTakeFirstOrThrow();
}

/**
 * Create a test question
 */
export async function createTestQuestion(
	db: Kysely<DB>,
	overrides: {
		client_id: string;
		page_id: number;
		created_by: string;
		text?: string;
		position?: number;
		type?: 'multi' | 'single' | 'dropdown' | 'freeform';
		hidden?: boolean;
	}
) {
	const data = {
		client_id: overrides.client_id,
		page_id: overrides.page_id,
		created_by: overrides.created_by,
		text: overrides.text || `Test Question ${Date.now()}`,
		position: overrides.position ?? 0,
		type: overrides.type || 'single',
		hidden: overrides.hidden ?? false,
	};

	return db.insertInto('question').values(data).returningAll().executeTakeFirstOrThrow();
}

/**
 * Create a test answer
 */
export async function createTestAnswer(
	db: Kysely<DB>,
	overrides: {
		client_id: string;
		question_id: number;
		created_by: string;
		text?: string;
		position?: number;
		grade?: number | null;
		has_additional_info?: boolean;
		calls_instance_id?: number | null;
		requires_upload?: boolean;
		hidden?: boolean;
	}
) {
	const data = {
		client_id: overrides.client_id,
		question_id: overrides.question_id,
		created_by: overrides.created_by,
		text: overrides.text || `Test Answer ${Date.now()}`,
		position: overrides.position ?? 0,
		grade: overrides.grade ?? null,
		has_additional_info: overrides.has_additional_info ?? false,
		calls_instance_id: overrides.calls_instance_id ?? null,
		requires_upload: overrides.requires_upload ?? false,
		hidden: overrides.hidden ?? false,
	};

	return db.insertInto('answer').values(data).returningAll().executeTakeFirstOrThrow();
}

/**
 * Create a test question response
 */
export async function createTestQuestionResponse(
	db: Kysely<DB>,
	overrides: {
		client_id: string;
		checklist_id: number;
		instance_id: number;
		claim_id: number;
		created_by: string;
		question_id?: number | null;
		response_text?: string | null;
		response_doc_id?: number | null;
	}
) {
	const data = {
		client_id: overrides.client_id,
		checklist_id: overrides.checklist_id,
		instance_id: overrides.instance_id,
		claim_id: overrides.claim_id,
		created_by: overrides.created_by,
		question_id: overrides.question_id ?? null,
		response_text: overrides.response_text ?? null,
		response_doc_id: overrides.response_doc_id ?? null,
	};

	return db.insertInto('question_response').values(data).returningAll().executeTakeFirstOrThrow();
}

/**
 * Create a test question response answer (links a response to an answer choice)
 */
export async function createTestQuestionResponseAnswer(
	db: Kysely<DB>,
	overrides: {
		response_id: number;
		answer_id?: number | null;
		additional_info?: string | null;
	}
) {
	const data = {
		response_id: overrides.response_id,
		answer_id: overrides.answer_id ?? null,
		additional_info: overrides.additional_info ?? null,
	};

	return db.insertInto('question_response_answer').values(data).returningAll().executeTakeFirstOrThrow();
}
