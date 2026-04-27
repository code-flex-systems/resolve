/**
 * Document & Document Group Fixtures
 */

import { Kysely } from 'kysely';
import type { DB } from '@/api/database/types';
import { DocType, DocStatus, DocGroupType } from '@/config/enums';

/**
 * Create a test document
 */
export async function createTestDoc(
	db: Kysely<DB>,
	overrides: {
		client_id: string;
		created_by: string;
		filename?: string;
		alias?: string;
		title?: string | null;
		description?: string | null;
		doc_type?: string;
		doc_status?: string;
		storage_key?: string;
		file_size?: number | null;
		mime_type?: string | null;
		preview_url?: string | null;
		doc_group_id?: string | null;
		claim_id?: string | null;
		recovery_event_id?: string | null;
		deadline_id?: string | null;
		page_instance_id?: string | null;
		question_id?: string | null;
		answer_id?: string | null;
		version?: number;
		is_current_version?: boolean;
	}
) {
	const timestamp = Date.now();
	const data = {
		client_id: overrides.client_id,
		created_by: overrides.created_by,
		filename: overrides.filename || `test-file-${timestamp}.pdf`,
		alias: overrides.alias || `test-alias-${timestamp}`,
		title: overrides.title ?? null,
		description: overrides.description ?? null,
		doc_type: overrides.doc_type || DocType.OTHER,
		doc_status: overrides.doc_status || DocStatus.APPROVED,
		storage_key: overrides.storage_key || `storage-key-${timestamp}`,
		file_size: overrides.file_size ?? 1024,
		mime_type: overrides.mime_type ?? 'application/pdf',
		preview_url: overrides.preview_url ?? null,
		doc_group_id: overrides.doc_group_id ?? null,
		claim_id: overrides.claim_id ?? null,
		recovery_event_id: overrides.recovery_event_id ?? null,
		deadline_id: overrides.deadline_id ?? null,
		page_instance_id: overrides.page_instance_id ?? null,
		question_id: overrides.question_id ?? null,
		answer_id: overrides.answer_id ?? null,
		version: overrides.version ?? 1,
		is_current_version: overrides.is_current_version ?? true,
	};

	return db.insertInto('doc').values(data).returningAll().executeTakeFirstOrThrow();
}

/**
 * Create a test document group (folder)
 */
export async function createTestDocGroup(
	db: Kysely<DB>,
	overrides: {
		client_id: string;
		created_by: string;
		name?: string;
		description?: string | null;
		parent_group_id?: string | null;
		group_type?: string;
		claim_id?: string | null;
		color?: string | null;
		icon?: string | null;
		sort_order?: number;
		system?: boolean;
		user_id?: string | null;
	}
) {
	const data = {
		client_id: overrides.client_id,
		created_by: overrides.created_by,
		name: overrides.name || `Test Folder ${Date.now()}`,
		description: overrides.description ?? null,
		parent_group_id: overrides.parent_group_id ?? null,
		group_type: overrides.group_type || DocGroupType.CUSTOM,
		claim_id: overrides.claim_id ?? null,
		color: overrides.color ?? null,
		icon: overrides.icon ?? null,
		sort_order: overrides.sort_order ?? 0,
		system: overrides.system ?? false,
		user_id: overrides.user_id ?? null,
	};

	return db.insertInto('doc_group').values(data).returningAll().executeTakeFirstOrThrow();
}
