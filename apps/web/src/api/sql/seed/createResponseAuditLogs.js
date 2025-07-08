const userId = '375c7652-69db-4b16-9c35-d6ae06f7354c';
const clientId = '444be49a-110d-40c3-b09b-e81b1c59a274';
const statuses = ['insert', 'update', 'delete'];

export function createResponseAuditLogs() {
	const statements = [];
	for (let i = 0; i < 1000; i++) {
		statements.push(`
            insert into response_audit_logs(
                client_id,
                response_id,
                user_id,
                checklist_id,
                instance_id,
                claim_id,
                question_id,
                action,
                old_response_text,
                new_response_text,
                old_answer_ids,
                new_answer_ids,
                old_additional_info,
                new_additional_info,
                timestamp
            )
            values(
                '${clientId}',
                ${Math.round(Math.random() * 1900) + 500},
                '${userId}',
                1,
                ${Math.round(Math.random() * 13) + 1},
                ${Math.round(Math.random() * 49) + 1},
                ${Math.round(Math.random() * 48) + 1},
                '${statuses[Math.round(Math.random() * 2)]}',
                '',
                '',
                '{}',
                '{}',
                '{}',
                '{}',
                now()
            );
            `);
	}

	return statements;
}
