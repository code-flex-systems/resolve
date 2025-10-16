// 'use client';


// import { useShallow } from 'zustand/react/shallow';
// import { Fade } from '@mui/material';
// import { HighlightItemData, PieChart, PieValueType } from '@mui/x-charts-pro';
// import { useState } from 'react';

// export default function BreakdownChart() {
// 	const selectedQuestion = useStore(useShallow(selectors.selectedQuestion));
// 	const [selectedAnswer, setSelectedAnswer] = useState<(PieValueType & HighlightItemData) | null>(null);
// 	const answers: PieValueType[] = (selectedQuestion?.answers ?? []).map((a) => ({
// 		id: a.answer_id,
// 		label: a.answer_text,
// 		value: a.answer_count,
// 	}));

// 	return (
// 		<Fade in={!!selectedQuestion} unmountOnExit>
// 			<span>
// 				<PieChart
// 					series={[
// 						{
// 							id: 'data',
// 							data: answers,
// 							highlightScope: { fade: 'global', highlight: 'item' },
// 							faded: { innerRadius: 30, additionalRadius: -3, color: 'gray' },
// 							valueFormatter: (arc) => `${arc.value} responses`,
// 						},
// 					]}
// 					slotProps={{
// 						legend: {
// 							direction: 'horizontal',
// 							position: { vertical: 'top', horizontal: 'start' },
// 						},
// 					}}
// 					onItemClick={(_, arc) => {
// 						if (selectedAnswer?.dataIndex === arc.dataIndex) {
// 							setSelectedAnswer(null);
// 							return;
// 						}
// 						if (answers[arc.dataIndex]) {
// 							setSelectedAnswer({
// 								...answers[arc.dataIndex],
// 								seriesId: arc.seriesId,
// 								dataIndex: arc.dataIndex,
// 							});
// 						}
// 					}}
// 					highlightedItem={selectedAnswer}
// 					colors={[
// 						'#219EC4',
// 						'#FA7601',
// 						'#2137C4',
// 						'#216BC4',
// 						'#F17100',
// 						'#CF6100',
// 						'#21C4B6',
// 						'#4021C4',
// 						'#638FC4',
// 						'#8B4100',
// 					]}
// 					width={300}
// 					height={300}
// 					sx={{ padding: '20px' }}
// 				/>
// 			</span>
// 		</Fade>
// 	);
// }
