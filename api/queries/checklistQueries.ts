import { sql } from 'kysely';
import { db } from '../database/kysely';
import { SummarySegment } from '../config/enums';
import { ChecklistSummaryRow } from '../types/types';

export default {
	createChecklist,
	deleteChecklist,
	getChecklist,
	getChecklists,
	getChecklistClaim,
	getChecklistSummary,
	getChecklistSummaryDetail,
	getRecentChecklistClaims,
	modifyChecklist,
};

async function createChecklist(claimId: number, params: object) {
	try {
		let newChecklist: any;
		await db.transaction().execute(async (trx) => {
			try {
				newChecklist = await trx
					.insertInto('checklist')
					.values({
						name: params.name,
						created_by: params.username,
					})
					.returningAll()
					.executeTakeFirstOrThrow();
				await trx
					.insertInto('checklist_claim')
					.values({
						claim_id: claimId,
						checklist_id: newChecklist.id,
					})
					.execute();
			} catch (e) {
				console.error(e);
			}
		});
		return newChecklist;
	} catch (e) {
		console.error(e);
	}
}

async function deleteChecklist(checklistId: number) {
	try {
		await db.deleteFrom('checklist').where('id', '=', checklistId).execute();
	} catch (e) {
		console.error(e);
	}
}

async function getChecklist(checklistId: number) {
	try {
		return await db.selectFrom('checklist').selectAll().where('id', '=', checklistId).executeTakeFirst();
	} catch (e) {
		console.error(e);
	}
}

async function getChecklists(searchTerm?: string) {
	try {
		let query = db
			.selectFrom('checklist as c')
			.innerJoin('page_instance as p', 'c.id', 'p.checklist_id')
			.selectAll('c')
			.select(({ fn }) => fn.countAll().as('page_count'))
			.groupBy('c.id')
			.orderBy('c.id');
		if (searchTerm) {
			query = query.where((eb) => eb(sql`lower(${eb.ref('name')})`, 'like', `${searchTerm.toLowerCase()}%`));
		}
		return await query.execute();
	} catch (e) {
		console.error(e);
	}
}

async function getChecklistClaim(checklistId: number, claimId: number) {
	try {
		return await db
			.selectFrom('checklist_claim')
			.selectAll()
			.where((eb) => eb.and([eb('checklist_id', '=', checklistId), eb('claim_id', '=', claimId)]))
			.executeTakeFirst();
	} catch (e) {
		console.error(e);
	}
}

async function getChecklistSummary(checklistId: number, claimId: number) {
	try {
		return await db
			.selectFrom('page_instance as pi')
			.innerJoin('question as q', 'q.page_id', 'pi.page_id')
			.leftJoin('question_response as qr', (join) =>
				join
					.onRef('qr.question_id', '=', 'q.id')
					.onRef('qr.instance_id', '=', 'pi.id')
					.onRef('qr.checklist_id', '=', 'pi.checklist_id')
					.on('qr.claim_id', '=', sql.lit(claimId))
			)
			.select([
				// All questions
				sql<number>`count(distinct q.id)`.as('total_questions'),
				// All answered questions
				sql<number>`count(distinct qr.id)
                    filter (
                    where qr.response_text is not null
                        or exists (
                            select 1 from question_response_answer qra
                            where qra.response_id = qr.id
                        )
                    )`.as('total_answered'),
				// All answers that do not include unknown
				sql<number>`count(distinct qr.id)
                    filter (
                        where exists (
                        select 1 from question_response_answer qra
                        join answer a on a.id = qra.answer_id
                        where qra.response_id = qr.id
                            and lower(a.text) not like '%unknown%'
                            and lower(coalesce(qr.response_text, '')) not like '%unknown%'
                        )
                    )`.as('total_known'),
				// All answers that include unknown
				// We cannot simply calculate this with answered - known
				// because a multiple-choice question can have both known and unknown answers
				sql<number>`count(distinct qr.id)
                    filter (
                        where exists (
                        select 1 from question_response_answer qra
                        join answer a on a.id = qra.answer_id
                        where qra.response_id = qr.id
                            and (lower(a.text) like '%unknown%' or lower(qr.response_text) like '%unknown%')
                        )
                    )`.as('total_unknown'),
			])
			.where('pi.checklist_id', '=', checklistId)
			.executeTakeFirst();
	} catch (e) {
		console.error(e);
	}
}

async function getChecklistSummaryDetail({
	checklistId,
	claimId,
	segment,
	mode,
	limit,
	offset,
}: {
	checklistId: number;
	claimId: number;
	segment: SummarySegment;
	mode: 'rows' | 'count';
	limit?: number;
	offset?: number;
}) {
	try {
		let query = db
			.selectFrom('page_instance as pi')
			.innerJoin('page as p', 'p.id', 'pi.page_id')
			.innerJoin('question as q', 'q.page_id', 'p.id')
			.leftJoin('question_response as qr', (join) =>
				join
					.onRef('qr.question_id', '=', 'q.id')
					.onRef('qr.instance_id', '=', 'pi.id')
					.onRef('qr.checklist_id', '=', 'pi.checklist_id')
					.on('qr.claim_id', '=', sql.lit(claimId))
			)
			.where('pi.checklist_id', '=', checklistId);

		if (segment !== SummarySegment.UNANSWERED) {
			query = query
				.leftJoin('question_response_answer as qra', 'qra.response_id', 'qr.id')
				.leftJoin('answer as a', 'a.id', 'qra.answer_id');
		}

		switch (segment) {
			case SummarySegment.ANSWERED:
				query = query.where((qb) =>
					qb.or([qb('qr.response_text', 'is not', null), qb('qra.id', 'is not', null)])
				);
				break;
			case SummarySegment.UNANSWERED:
				query = query.where('qr.id', 'is', null);
				break;
			case SummarySegment.KNOWN:
				query = query.where((qb) =>
					qb.and([
						qb.or([qb('qr.response_text', 'is not', null), qb('qra.id', 'is not', null)]),
						sql<boolean>`lower(coalesce(qr.response_text, '')) not like '%unknown%'`,
						sql<boolean>`lower(a.text) not like '%unknown%'`,
					])
				);
				break;
			case SummarySegment.UNKNOWN:
				query = query.where(
					sql<boolean>`lower(qr.response_text) like '%unknown%' or lower(a.text) like '%unknown%'`
				);
				break;
			default:
				break;
		}

		if (mode === 'count') {
			const result = await query.select(sql<number>`count(distinct q.id)`.as('count')).executeTakeFirst();
			return Number(result?.count ?? 0);
		} else {
			const baseSelect = [
				'pi.id as page_id',
				'p.title as page_title',
				'q.id as question_id',
				'q.text as question_text',
			];
			const fullSelect = [
				...baseSelect,
				'qr.response_text as response_text',
				sql<string>`string_agg(distinct a.text, ', ')`.as('answer_texts'),
			];
			const rows = await query
				.select(segment === SummarySegment.UNANSWERED ? baseSelect : fullSelect)
				.groupBy(['pi.id', 'p.title', 'q.id', 'q.text', 'qr.response_text'])
				.orderBy('pi.id')
				.limit(limit ?? 50)
				.offset(offset ?? 0)
				.execute();

			return rows;
		}
	} catch (e) {
		console.error(e);
	}
}

async function getRecentChecklistClaims() {
	try {
		return await db
			.selectFrom('checklist as c')
			.innerJoin('checklist_claim as cc', 'c.id', 'cc.checklist_id')
			.innerJoin('claim as cl', 'cl.id', 'cc.claim_id')
			.selectAll('cc')
			.select(['c.name as checklist_name', 'cl.claim_number', 'cl.client'])
			.orderBy('cc.last_opened desc')
			.limit(15)
			.execute();
	} catch (e) {
		console.error(e);
	}
}

async function modifyChecklist(checklistId: number, params: object) {
	try {
		return await db
			.updateTable('checklist')
			.set({
				...params,
			})
			.where('id', '=', checklistId)
			.returningAll()
			.executeTakeFirst();
	} catch (e) {
		console.error(e);
	}
}
