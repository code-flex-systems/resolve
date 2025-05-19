import fs from 'fs';
import csv from 'csv-parser';

export interface FlatRow {
	pageId?: number;
	pageName?: string;
	questionPosition?: number;
	questionId?: number;
	questionText?: string;
	answerPosition: number;
	answerId: number;
	answerText: string;
	linkedPageId?: number;
	linkedPageName?: string;
}

export async function parseTabulaCsvToFlatRows(csvPath: string): Promise<FlatRow[]> {
	const rows: FlatRow[] = [];
	let lastRow: FlatRow | null = null;

	// Context tracking
	let currentPageId: number | undefined;
	let currentPageName: string | undefined;
	let currentQuestionId: number | undefined;
	let currentQuestionPosition: number | undefined;
	let currentQuestionText: string | undefined;

	return new Promise((resolve, reject) => {
		fs.createReadStream(csvPath)
			.pipe(csv({ mapHeaders: ({ header }) => header.trim() }))
			.on('data', (raw: Record<string, string>) => {
				const ansId = raw['Ans Id']?.trim();

				if (raw['Page Id']) {
					currentPageId = Number(raw['Page Id']);
					currentPageName = raw['Name']?.trim();
				}

				if (raw['Q Id']) {
					currentQuestionId = Number(raw['Q Id']);
					currentQuestionPosition = raw['Q #'] ? Number(raw['Q #']) : undefined;
					currentQuestionText = raw['Question']?.trim();
				}

				const rawAnswerText = raw['Title']?.trim() ?? '';
				let normalizedAnswerText = rawAnswerText.replace(/\s*\t*\n\t*\s*/g, ' ');
				normalizedAnswerText = normalizedAnswerText.replace('0', '');
				normalizedAnswerText = normalizedAnswerText.replace('Ans', '').trim();
				console.log(normalizedAnswerText);

				const linkedPageIdRaw = raw['Page Id1']?.trim();
				const linkedPageNameRaw = raw['Linked Page']?.trim();

				const spilloverAnswers = splitAnswerCluster(normalizedAnswerText);

				if (spilloverAnswers.length > 0) {
					for (const answer of spilloverAnswers) {
						rows.push({
							pageId: currentPageId,
							pageName: currentPageName,
							questionPosition: currentQuestionPosition,
							questionId: currentQuestionId,
							questionText: currentQuestionText,
							answerPosition: answer.answerPosition,
							answerId: answer.answerId,
							answerText: answer.answerText,
							linkedPageId: linkedPageIdRaw ? parseInt(linkedPageIdRaw.split(/\s+/)[0], 10) : undefined,
							linkedPageName: linkedPageNameRaw?.trim(),
						});
					}
				} else if (ansId && /^\d+\s+\d+$/.test(ansId)) {
					const [posStr, idStr] = ansId.split(/\s+/);
					const answerPosition = parseInt(posStr, 10);
					const answerId = parseInt(idStr, 10);

					const flatRow: FlatRow = {
						pageId: currentPageId,
						pageName: currentPageName,
						questionPosition: currentQuestionPosition,
						questionId: currentQuestionId,
						questionText: currentQuestionText,
						answerPosition,
						answerId,
						answerText: normalizedAnswerText,
						linkedPageId: linkedPageIdRaw ? parseInt(linkedPageIdRaw.split(/\s+/)[0], 10) : undefined,
						linkedPageName: linkedPageNameRaw?.trim(),
					};

					rows.push(flatRow);
					lastRow = flatRow;
				} else if (lastRow) {
					for (const field of ['pageName', 'questionText', 'answerText', 'linkedPageName'] as const) {
						const extra = getContinuationValue(raw, field);
						if (extra) {
							lastRow[field] = lastRow[field] ? `${lastRow[field]} ${extra}`.trim() : extra;
							console.log(`📎 Merged continuation into: [${field}]`);
						}
					}
				}
			})
			.on('end', () => resolve(rows))
			.on('error', reject);
	});
}

function getContinuationValue(row: Record<string, string>, field: keyof FlatRow): string | undefined {
	switch (field) {
		case 'pageName':
			return row['Name']?.trim();
		case 'questionText':
			return row['Question']?.trim();
		case 'answerText':
			return row['Title']?.trim();
		case 'linkedPageName':
			return row['Linked Page']?.trim();
		default:
			return undefined;
	}
}

function splitAnswerCluster(answerText: string): {
	answerText: string;
	answerPosition: number;
	answerId: number;
}[] {
	const match = answerText.match(/^(.*?)(\s+Ans\s+Id\s+)(\d+\s+\d+(?:\s+\d+\s+\d+)*)$/i);
	if (!match) return [];

	const prefix = match[1].trim();
	const pairsRaw = match[3].trim();
	const chunks = [...pairsRaw.matchAll(/(\d+)\s+(\d+)/g)];

	return chunks.map(([_, pos, id]) => ({
		answerText: prefix,
		answerPosition: parseInt(pos, 10),
		answerId: parseInt(id, 10),
	}));
}
