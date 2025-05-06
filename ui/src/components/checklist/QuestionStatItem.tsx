import { Accordion, AccordionDetails, AccordionSummary, Link, Typography } from '@mui/material';
import { QuestionStat } from '../../types';
import useStore from '../../state/store';
import { useShallow } from 'zustand/react/shallow';
import * as selectors from '../../state/checklist/selectors';
import { ArrowDropDown, ContactSupport } from '@mui/icons-material';
import theme, { BACKDROP_COLOR, OFFWHITE_COLOR } from '../../styles/theme';

export default function QuestionStatItem(props: {
	expandedIdx: number | null;
	idx: number;
	item: QuestionStat;
	setExpandedIdx: (newIdx: number | null) => void;
}) {
	const { expandedIdx, idx, item, setExpandedIdx } = props;
	const { question_id, question_text, answers } = item;
	const selectedPageInfo = useStore(useShallow(selectors.selectedPageInfo));
	let expanded = expandedIdx === idx;

	return (
		<Accordion
			expanded={expanded}
			onChange={(_, expanded) => setExpandedIdx(expanded ? idx : null)}
			elevation={0}
			sx={styles.accordion}
		>
			<AccordionSummary sx={styles.accordionSummary} expandIcon={<ArrowDropDown />}>
				<ContactSupport sx={styles.icon} />
				<Typography fontStyle="italic">
					{question_text} (p{selectedPageInfo.pageId}.q{question_id})
				</Typography>
			</AccordionSummary>
			<AccordionDetails>
				{answers.map((a) => (
					<div key={a.answer_id} style={styles.container} className="flex-col-left">
						<div style={styles.container} className="flex-row-left">
							<div style={styles.dot} className="flex-row-center badge">
								<Typography fontSize={12} color="white">
									{a.answer_count.toLocaleString()}
								</Typography>
							</div>
							{a.answer_count > 0 ? (
								<Link className="link" marginLeft="10px">
									{a.answer_text} (p{selectedPageInfo.pageId}.q{question_id}.a{a.answer_id})
								</Link>
							) : (
								<Typography marginLeft="10px">
									{a.answer_text} (p{selectedPageInfo.pageId}.q{question_id}.a{a.answer_id})
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
		backgroundColor: OFFWHITE_COLOR,
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
	divider: {
		padding: '0px 20px',
		width: '100%',
		minWidth: 0,
		height: 1,
		flex: 3,
	},
	dot: {
		minWidth: 40,
		height: 21,
		backgroundColor: theme.palette.primary.main,
		borderRadius: 5,
		cursor: 'pointer',
		boxShadow: '0 2px 4px rgba(0, 0, 0, 0.25)',
	},
	icon: {
		marginRight: '5px',
	},
	responseRow: {
		width: '100%',
		height: 40,
		marginLeft: 15,
	},
};
