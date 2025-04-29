import { useState } from 'react';
import { useQuestionStats } from '../../api/queries/page-queries';
import { Collapse } from '@mui/material';
import QuestionStatItem from '../checklist/QuestionStatItem';

export default function ChecklistPageBreakdown() {
	// const { isPending: loading, data = [] } = useQuestionStats(selectedPageInfo.pageId, true);
	const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
	{
		/* <Collapse in={!loading}>
                {data.map((stat, i) => (
                    <QuestionStatItem
                        key={i}
                        expandedIdx={expandedIdx}
                        idx={i}
                        item={stat}
                        setExpandedIdx={setExpandedIdx}
                    />
                ))}
            </Collapse> */
	}
	return <></>;
}
