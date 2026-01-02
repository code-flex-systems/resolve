import { z } from 'zod';
import { DocType, DocStatus, DocGroupType } from '@/config/enums';

// =====================================================================
// ENUMS
// =====================================================================

export const docTypeEnum = z.nativeEnum(DocType);
export const docStatusEnum = z.nativeEnum(DocStatus);
export const docGroupTypeEnum = z.nativeEnum(DocGroupType);

// =====================================================================
// DOC SCHEMAS
// =====================================================================

export const docParams = z.object({
	filename: z.string().min(1, 'Filename is required'),
	alias: z.string().min(1, 'Alias is required'),
	title: z.string().optional(),
	description: z.string().optional(),
	doc_type: docTypeEnum.default(DocType.OTHER),
	doc_status: docStatusEnum.default(DocStatus.APPROVED),
	doc_group_id: z.number().int().positive().optional(),
	claim_id: z.number().int().positive().optional(),
	recovery_event_id: z.number().int().positive().optional(),
	deadline_id: z.number().int().positive().optional(),
	page_instance_id: z.number().int().positive().optional(),
	question_id: z.number().int().positive().optional(),
	answer_id: z.number().int().positive().optional(),
	response_doc_id: z.number().int().positive().optional(),
	file_size: z.number().int().positive().optional(),
	mime_type: z.string().optional(),
	preview_url: z.string().url().optional(),
});
export type DocParams = z.infer<typeof docParams>;

export const updateDocParams = z.object({
	alias: z.string().min(1).optional(),
	title: z.string().optional(),
	description: z.string().optional(),
	doc_type: docTypeEnum.optional(),
	doc_status: docStatusEnum.optional(),
	doc_group_id: z.number().int().positive().nullable().optional(),
	claim_id: z.number().int().positive().nullable().optional(),
	recovery_event_id: z.number().int().positive().nullable().optional(),
	deadline_id: z.number().int().positive().nullable().optional(),
	page_instance_id: z.number().int().positive().nullable().optional(),
	question_id: z.number().int().positive().nullable().optional(),
	answer_id: z.number().int().positive().nullable().optional(),
	response_doc_id: z.number().int().positive().nullable().optional(),
});
export type UpdateDocParams = z.infer<typeof updateDocParams>;

export const createDocInput = z.object({
	params: docParams,
	storageKey: z.string().min(1),
	autoOrganize: z.boolean().default(false),
});
export type CreateDocInput = z.infer<typeof createDocInput>;

export const updateDocInput = z.object({
	docId: z.number().int().positive(),
	params: updateDocParams,
});
export type UpdateDocInput = z.infer<typeof updateDocInput>;

export const deleteDocInput = z.object({
	docId: z.number().int().positive(),
});
export type DeleteDocInput = z.infer<typeof deleteDocInput>;

export const getDocInput = z.object({
	docId: z.number().int().positive(),
});
export type GetDocInput = z.infer<typeof getDocInput>;

export const downloadDocInput = z.object({
	docId: z.number().int().positive(),
});
export type DownloadDocInput = z.infer<typeof downloadDocInput>;

export const listDocsInput = z.object({
	filters: z.object({
		claim_id: z.number().int().positive().optional(),
		doc_group_id: z.number().int().positive().nullable().optional(),
		doc_type: docTypeEnum.optional(),
		doc_status: docStatusEnum.optional(),
		is_current_version: z.boolean().optional(),
		question_id: z.number().int().positive().optional(),
		answer_id: z.number().int().positive().optional(),
	}).optional(),
	limit: z.number().int().positive().max(1000).optional(),
	offset: z.number().int().nonnegative().optional(),
});
export type ListDocsInput = z.infer<typeof listDocsInput>;

export const getDocCountByClaimIdInput = z.object({
	claimId: z.number().int().positive(),
});
export type GetDocCountByClaimIdInput = z.infer<typeof getDocCountByClaimIdInput>;

export const getDocCountByGroupIdInput = z.object({
	groupId: z.number().int().positive(),
});
export type GetDocCountByGroupIdInput = z.infer<typeof getDocCountByGroupIdInput>;

export const getDocCountsByGroupIdsInput = z.object({
	groupIds: z.array(z.number().int().positive()),
});
export type GetDocCountsByGroupIdsInput = z.infer<typeof getDocCountsByGroupIdsInput>;

// =====================================================================
// DOC GROUP SCHEMAS
// =====================================================================

export const docGroupParams = z.object({
	name: z.string().min(1, 'Group name is required'),
	description: z.string().optional(),
	parent_group_id: z.number().int().positive().optional(),
	group_type: docGroupTypeEnum.default(DocGroupType.CUSTOM),
	claim_id: z.number().int().positive().optional(),
	color: z.string().optional(),
	icon: z.string().optional(),
	sort_order: z.number().int().default(0),
	system: z.boolean().default(false),
	user_id: z.string().uuid().optional(),
});
export type DocGroupParams = z.infer<typeof docGroupParams>;

export const updateDocGroupParams = z.object({
	name: z.string().min(1).optional(),
	description: z.string().optional(),
	parent_group_id: z.number().int().positive().nullable().optional(),
	color: z.string().optional(),
	icon: z.string().optional(),
	sort_order: z.number().int().optional(),
});
export type UpdateDocGroupParams = z.infer<typeof updateDocGroupParams>;

export const createDocGroupInput = z.object({
	params: docGroupParams,
});
export type CreateDocGroupInput = z.infer<typeof createDocGroupInput>;

export const updateDocGroupInput = z.object({
	groupId: z.number().int().positive(),
	params: updateDocGroupParams,
});
export type UpdateDocGroupInput = z.infer<typeof updateDocGroupInput>;

export const deleteDocGroupInput = z.object({
	groupId: z.number().int().positive(),
});
export type DeleteDocGroupInput = z.infer<typeof deleteDocGroupInput>;

export const getDocGroupInput = z.object({
	groupId: z.number().int().positive(),
});
export type GetDocGroupInput = z.infer<typeof getDocGroupInput>;

// =====================================================================
// FILE UPLOAD SCHEMAS
// =====================================================================

export const fileUploadSchema = z.object({
	file: z.any(), // File object from browser/multipart form data
	alias: z.string().min(1, 'Alias is required'),
	title: z.string().optional(),
	description: z.string().optional(),
	doc_type: docTypeEnum.default(DocType.OTHER),
	doc_status: docStatusEnum.default(DocStatus.APPROVED),
	doc_group_id: z.number().int().positive().optional(),
	claim_id: z.number().int().positive().optional(),
	recovery_event_id: z.number().int().positive().optional(),
	deadline_id: z.number().int().positive().optional(),
	page_instance_id: z.number().int().positive().optional(),
});
export type FileUploadSchema = z.infer<typeof fileUploadSchema>;

// =====================================================================
// FILTER SCHEMAS
// =====================================================================

export const docFilterSchema = z.object({
	claim_id: z.number().int().positive().optional(),
	doc_group_id: z.number().int().positive().optional(),
	doc_type: docTypeEnum.optional(),
	doc_status: docStatusEnum.optional(),
	is_current_version: z.boolean().optional(),
});
export type DocFilterSchema = z.infer<typeof docFilterSchema>;

// =====================================================================
// DOC REQUIREMENT SCHEMAS (For Future Use)
// =====================================================================

export const docRequirementParams = z.object({
	requirement_name: z.string().min(1, 'Requirement name is required'),
	description: z.string().optional(),
	required_doc_type: docTypeEnum,
	is_required: z.boolean().default(true),
	checklist_id: z.number().int().positive().optional(),
	claim_id: z.number().int().positive().optional(),
});
export type DocRequirementParams = z.infer<typeof docRequirementParams>;

export const docRequirementFulfillmentParams = z.object({
	doc_requirement_id: z.number().int().positive(),
	doc_id: z.number().int().positive().optional(),
	manually_marked_complete: z.boolean().default(false),
	notes: z.string().optional(),
});
export type DocRequirementFulfillmentParams = z.infer<typeof docRequirementFulfillmentParams>;
