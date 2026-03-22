import { z } from 'zod';

export const pageParams = z
        .object({
                title: z.string().min(1),
                parentId: z.string().uuid().nullable().optional(),
                position: z.number().int(),
        })
        .strict();
export type PageParams = z.infer<typeof pageParams>;

export const pageUpdateParams = z
        .object({
                title: z.string().min(1).optional(),
                hidden: z.boolean().optional(),
        })
        .strict();
export type PageUpdateParams = z.infer<typeof pageUpdateParams>;

export const pageInstanceParams = z.object({
        parentId: z.string().uuid().nullable().optional(),
        position: z.number().int(),
});
export type PageInstanceParams = z.infer<typeof pageInstanceParams>;

export const createPageInput = z.object({
        checklistId: z.string().uuid(),
        params: pageParams,
});
export type CreatePageInput = z.infer<typeof createPageInput>;

export const copyPageTemplateInput = z.object({
	checklistId: z.string().uuid(),
	pageId: z.string().uuid(),
	params: pageInstanceParams,
});
export type CopyPageTemplateInput = z.infer<typeof copyPageTemplateInput>;

export const createPageInstanceInput = z.object({
	checklistId: z.string().uuid(),
	pageId: z.string().uuid(),
	params: pageInstanceParams,
});
export type CreatePageInstanceInput = z.infer<typeof createPageInstanceInput>;

export const deletePageInstanceInput = z.object({
	instanceId: z.string().uuid(),
});
export type DeletePageInstanceInput = z.infer<typeof deletePageInstanceInput>;

export const getPageInput = z.object({
	pageId: z.string().uuid(),
});
export type GetPageInput = z.infer<typeof getPageInput>;

export const getPageInstanceInput = z.object({
	instanceId: z.string().uuid(),
});
export type GetPageInstanceInput = z.infer<typeof getPageInstanceInput>;

export const getPageInstancesInput = z.object({
	checklistId: z.string().uuid(),
	parentId: z.string().uuid().nullable().optional(),
});
export type GetPageInstancesInput = z.infer<typeof getPageInstancesInput>;

export const getPageInstanceTreeInput = z.object({
	checklistId: z.string().uuid(),
	claimId: z.string().uuid().optional(),
});
export type GetPageInstanceTreeInput = z.infer<typeof getPageInstanceTreeInput>;

export const getVisiblePageInstancesInput = z.object({
	checklistId: z.string().uuid(),
	claimId: z.string().uuid(),
});
export type GetVisiblePageInstancesInput = z.infer<typeof getVisiblePageInstancesInput>;

export const modifyPageInput = z.object({
        id: z.string().uuid(),
        params: pageUpdateParams,
});
export type ModifyPageInput = z.infer<typeof modifyPageInput>;
