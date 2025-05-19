import fs from 'fs';
import { parseTabulaCsvToFlatRows } from '@/api/legacy-pipeline/csv-parse-script';
import { NormalizedPage, groupFlatRowsToParsedPages, normalizeParsedPages } from '@/api/legacy-pipeline/migrate-legacy';

export function generateSqlFromNormalizedPages(pages: NormalizedPage[]): string {
	let sql = `-- Generated seed script for NormalizedPage[]\n\n`;

	pages.forEach((page, pageIdx) => {
		const pageIdent = `page_${pageIdx}`;
		const instanceIdent = `instance_${pageIdx}`;

		sql += `-- Page ${pageIdx + 1}: ${page.title}\n`;

		sql += `WITH ${pageIdent} AS (
  INSERT INTO page (title, hidden, version)
  VALUES ('${escapeSql(page.title)}', false, 0)
  RETURNING id
),\n${instanceIdent} AS (
  INSERT INTO page_instance (page_id, checklist_id, position)
  SELECT id, 1, ${page.position} FROM ${pageIdent}
  RETURNING id
)`;

		page.questions.forEach((q, qIdx) => {
			const qIdent = `q_${pageIdx}_${qIdx}`;
			sql += `,\n${qIdent} AS (
  INSERT INTO question (page_id, text, position, type)
  SELECT ${pageIdent}.id, '${escapeSql(q.text)}', ${q.position}, '${q.type}'
  FROM ${pageIdent}
  RETURNING id
)`;

			q.answers.forEach((a, aIdx) => {
				const aIdent = `a_${pageIdx}_${qIdx}_${aIdx}`;
				const cleanedText = cleanAnswerText(a.text);
				if (/\s\d{2,}$/.test(a.text)) {
					console.warn(`🧹 Trimmed suspicious trailing number: "${a.text}" → "${cleanedText}"`);
				}

				sql += `,\n${aIdent} AS (
  INSERT INTO answer (
    question_id, text, position,
    has_additional_info, additional_info_placeholder, additional_info_num_lines,
    calls_instance_id
  )
  SELECT
    ${qIdent}.id,
    '${escapeSql(cleanedText)}',
    ${a.position},
    ${a.hasAdditionalInfo},
    ${a.hasAdditionalInfo ? `'${escapeSql(a.additionalInfoPlaceholder ?? '')}'` : 'NULL'},
    ${a.hasAdditionalInfo ? a.additionalInfoNumLines : 'NULL'},
    NULL -- will be patched based on linkedPageId
  FROM ${qIdent}
  RETURNING id
)`;
			});
		});

		sql += `\nSELECT id FROM ${pageIdent};\n\n`;
	});

	return sql;
}

function escapeSql(input: string): string {
	return input.replace(/'/g, "''");
}

function cleanAnswerText(input: string): string {
	return input
		.trim()
		.replace(/(\s+\d+)+$/, '')
		.trim();
}

parseTabulaCsvToFlatRows('./tabula-chklist_6_4_07v2.csv')
	.then((data) => {
		const pages = groupFlatRowsToParsedPages(data);
		const normalizedPages = normalizeParsedPages(pages);
		console.log(normalizedPages[0].questions[0]?.answers);
		const sqlOutput = generateSqlFromNormalizedPages(normalizedPages);
		fs.writeFileSync('seed-checklist.sql', sqlOutput);
	})
	.catch((e) => console.error(e));
