'use client';
import { Accordion, AccordionDetails, AccordionSummary } from '@mui/material';
import { QuestionStat } from '@/types/types';
import { IconChevronDown, IconHelp } from '@tabler/icons-react';

export default function QuestionStatItem(props: {
	bgColor?: string;
	expandedIdx: number | null;
	idx: number;
	item: QuestionStat;
	onAnswerClick: (id: number) => void;
	pageId: number;
	selectedAnswerId?: number;
	setExpandedIdx: (newIdx: number | null) => void;
}) {
	const { bgColor, expandedIdx, idx, item, onAnswerClick, pageId, selectedAnswerId, setExpandedIdx } = props;
	const { question_id, question_text, answers } = item;
	const expanded = expandedIdx === idx;

	return (
		<Accordion
			expanded={expanded}
			onChange={(_, expanded) => setExpandedIdx(expanded ? idx : null)}
			elevation={0}
			sx={{
				backgroundColor: bgColor,
				borderTopLeftRadius: idx === 0 ? 6 : undefined,
				borderTopRightRadius: idx === 0 ? 6 : undefined,
			}}
		>
			<AccordionSummary sx={styles.accordionSummary} expandIcon={<IconChevronDown size={20} />}>
				<span>
					{question_text} (p{pageId}.q{question_id})
				</span>
			</AccordionSummary>
			<AccordionDetails>
				{answers.map((a) => (
					<div key={a.answer_id}  className="flex-col-left" style={styles.container}>
						<div  className="flex-row-left" style={styles.container}>
							<div
								
								
								
								 style={{ ...{
									...styles.dot,
									backgroundColor:
										selectedAnswerId === a.answer_id ? 'var(--text-accent)' : '#EBEBEB',
									transition: 'background-color 300ms ease',
								}, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
							>
								<span
									
									 style={{ fontSize: 12, color: selectedAnswerId === a.answer_id ? 'white' : undefined }}
								>
									{a.answer_count.toLocaleString()}
								</span>
							</div>
							{a.answer_count > 0 ? (
								<button
									className="link"
									style={{ marginLeft: '10px', background: 'none', border: 'none', padding: 0, font: 'inherit', color: selectedAnswerId === a.answer_id ? 'var(--status-success)' : 'var(--text-accent)', cursor: 'pointer' }}
									onClick={() => onAnswerClick(a.answer_id)}
								>
									{a.answer_text} (p{pageId}.q{question_id}.a{a.answer_id})
								</button>
							) : (
								<span  style={{ marginLeft: '10px' }}>
									{a.answer_text} (p{pageId}.q{question_id}.a{a.answer_id})
								</span>
							)}
						</div>
					</div>
				))}
			</AccordionDetails>
		</Accordion>
	);
}

const styles = {
	accordionSummary: {
		minHeight: 40,
		'& .MuiAccordionSummary-content': {
			margin: '5px 0px',
		},
		'& .MuiAccordionSummary-content.Mui-expanded': {
			margin: '5px 0px',
		},
	},
	container: {
		width: '100%',
		height: 30,
	},
	dot: {
		minWidth: 40,
		height: 21,
		borderRadius: 5,
		cursor: 'pointer',
	},
	icon: {
		color: 'primary.main',
		marginRight: '5px',
	},
	responseRow: {
		width: '100%',
		height: 40,
		marginLeft: 15,
	},
};
