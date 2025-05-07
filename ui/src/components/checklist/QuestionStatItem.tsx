import { Accordion, AccordionDetails, AccordionSummary, Link, Typography } from '@mui/material';
import { QuestionStat } from '../../types';
import { ArrowDropDown, ContactSupport } from '@mui/icons-material';
import theme from '../../styles/theme';

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
	let expanded = expandedIdx === idx;

	return (
		<Accordion
			expanded={expanded}
			onChange={(_, expanded) => setExpandedIdx(expanded ? idx : null)}
			elevation={0}
			sx={{
				...styles.accordion,
				backgroundColor: bgColor,
			}}
		>
			<AccordionSummary sx={styles.accordionSummary} expandIcon={<ArrowDropDown />}>
				<ContactSupport sx={styles.icon} />
				<Typography fontStyle="italic">
					{question_text} (p{pageId}.q{question_id})
				</Typography>
			</AccordionSummary>
			<AccordionDetails>
				{answers.map((a) => (
					<div key={a.answer_id} style={styles.container} className="flex-col-left">
						<div style={styles.container} className="flex-row-left">
							<div
								style={{
									...styles.dot,
									backgroundColor:
										selectedAnswerId === a.answer_id
											? theme.palette.secondary.main
											: theme.palette.primary.main,
								}}
								className="flex-row-center badge"
							>
								<Typography fontSize={12} color="white">
									{a.answer_count.toLocaleString()}
								</Typography>
							</div>
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
	accordion: {
		outline: `1px solid #E8E8F3`,
	},
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
		boxShadow: '0 2px 4px rgba(0, 0, 0, 0.25)',
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
