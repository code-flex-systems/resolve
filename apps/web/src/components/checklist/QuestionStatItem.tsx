'use client';
import { Accordion, AccordionDetails, AccordionSummary, Box, Link, Typography } from '@mui/material';
import { QuestionStat } from '@/types/types';
import ArrowDropDown from '@mui/icons-material/ArrowDropDown';
import Help from '@mui/icons-material/Help';
import theme from '@/styles/theme';

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
			<AccordionSummary sx={styles.accordionSummary} expandIcon={<ArrowDropDown />}>
				<Typography>
					{question_text} (p{pageId}.q{question_id})
				</Typography>
			</AccordionSummary>
			<AccordionDetails>
				{answers.map((a) => (
					<div key={a.answer_id} style={styles.container} className="flex-col-left">
						<div style={styles.container} className="flex-row-left">
							<Box
								display="flex"
								justifyContent="center"
								alignItems="center"
								style={{
									...styles.dot,
									backgroundColor:
										selectedAnswerId === a.answer_id ? theme.palette.primary.main : '#EBEBEB',
									transition: 'background-color 300ms ease',
								}}
							>
								<Typography
									fontSize={12}
									color={selectedAnswerId === a.answer_id ? 'white' : undefined}
								>
									{a.answer_count.toLocaleString()}
								</Typography>
							</Box>
							{a.answer_count > 0 ? (
								<Link
									className="link"
									marginLeft="10px"
									color={selectedAnswerId === a.answer_id ? 'secondary' : 'primary'}
									onClick={() => onAnswerClick(a.answer_id)}
								>
									{a.answer_text} (p{pageId}.q{question_id}.a{a.answer_id})
								</Link>
							) : (
								<Typography marginLeft="10px">
									{a.answer_text} (p{pageId}.q{question_id}.a{a.answer_id})
								</Typography>
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
