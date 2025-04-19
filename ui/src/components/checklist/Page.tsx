import { Form, useForm } from 'react-hook-form';
import { useShallow } from 'zustand/react/shallow';
import useStore, { useChecklistSlice, useGlobalSlice } from '../../state/store';
import * as selectors from '../../state/checklist/selectors';
import { QuestionType } from '../../config/enums';
import { Button, Divider, Fade, Typography } from '@mui/material';
import { Question, QuestionResponse } from '../../types';
import { useEffect, useState } from 'react';
import Toolbar from '../common/Toolbar';
import { ChecklistQuestion } from './ChecklistQuestion';
import { Description, TaskAlt } from '@mui/icons-material';
import ClaimInfo from './ClaimInfo';
import { upsertResponses } from '../../api/axios-routes';
import { useAllResponses, useResponses } from '../../api/queries/response-queries';
import * as actions from '../../state/checklist/actions';
import PageToolbar from './PageToolbar';

function generateDefaultValues(questions?: Question[], responses?: Record<number, QuestionResponse>) {
	let defaults: Record<string, number[] | string> = {};
	if (!questions) return defaults;
	questions.forEach((q) => {
		switch (q.type) {
			case QuestionType.DROPDOWN:
			case QuestionType.MULTI:
			case QuestionType.SINGLE:
				if (responses?.[q.id]) {
					let answers = responses[q.id].selected_answers ?? [];
					let answerOther = q.answers.find((a) => a.has_additional_info);
					defaults[q.id.toString()] = answers.map((a) => a.answer_id);
					if (answerOther) {
						defaults[`${q.id}-${answerOther.id}-${QuestionType.FREEFORM}`] =
							answers.find((a) => a.answer_id === answerOther.id)?.additional_info ?? '';
					}
				} else {
					defaults[q.id.toString()] = [];
				}
				break;
			case QuestionType.FREEFORM:
				defaults[q.id.toString()] = responses?.[q.id]?.response_text ?? '';
				break;
			default:
				defaults[q.id.toString()] = '';
				break;
		}
	});
	return defaults;
}

export default function Page() {
	const checklist = useGlobalSlice((state) => state.checklist);
	const claim = useChecklistSlice((state) => state.claim);
	const responses = useChecklistSlice((state) => state.responses);
	const selectedPageInstance = useChecklistSlice((state) => state.selectedPageInstance);
	const selectedPageData = useStore(useShallow(selectors.selectedPageData));
	const selectedPageInfo = useStore(useShallow(selectors.selectedPageInfo));

	const { control, resetField, reset, watch, handleSubmit } = useForm();

	const { isFetching: loadingAll } = useAllResponses(
		claim?.id ?? -1,
		actions.updateAllResponses,
		!Object.keys(responses).length
	);
	const { refetch, isFetching: loading } = useResponses(
		claim?.id ?? -1,
		selectedPageInstance ?? -1,
		actions.updateInstanceResponses,
		false
	);

	const [showUpdateMsg, setShowUpdateMsg] = useState(false);

	useEffect(() => {
		reset({ ...generateDefaultValues(selectedPageData, responses) });
	}, [selectedPageData, responses]);

	const onSubmit = handleSubmit(async (data) => {
		try {
			let responses: QuestionResponse[] = Object.keys(data)
				.filter((field) => !field.endsWith(QuestionType.FREEFORM))
				.map((field) => {
					let questionId = parseInt(field);
					let response: QuestionResponse = {
						checklist_id: checklist?.id ?? -1,
						instance_id: selectedPageInstance ?? -1,
						claim_id: claim.id,
						question_id: questionId,
						response_text: typeof data[field] === 'string' ? data[field] : undefined,
						selected_answers: Array.isArray(data[field])
							? data[field].map((id) => ({
									answer_id: id,
									additional_info: data[`${questionId}-${id}-${QuestionType.FREEFORM}`],
							  }))
							: [],
					};
					return response;
				});
			await upsertResponses(responses);
			await refetch();
			setShowUpdateMsg(true);
			setTimeout(() => setShowUpdateMsg(false), 1000);
		} catch (e) {
			console.error(e);
		}
	});

	return (
		<div style={styles.container}>
			<ClaimInfo />
			<PageToolbar />
			{!selectedPageData && (
				<div style={{ width: '100%', height: '100%' }} className="flex-col-center">
					<Typography fontStyle="italic">
						{selectedPageInstance ? 'Loading...' : 'No page selected'}
					</Typography>
				</div>
			)}
			{!!selectedPageData && (
				<>
					<Toolbar
						left={
							<>
								<Description sx={{ color: 'primary.main', fontSize: 20, marginRight: '10px' }} />
								<Typography lineHeight={'21px'} fontSize={19}>
									{selectedPageInfo.title}
								</Typography>
								<Fade in={showUpdateMsg} timeout={500}>
									<div style={{ marginLeft: 10 }} className="flex-row-left">
										<TaskAlt sx={{ color: 'success.main', marginRight: '5px' }} />
										<Typography color="success" fontStyle="italic">
											Saved!
										</Typography>
									</div>
								</Fade>
							</>
						}
						leftWidth="70%"
						right={
							<>
								<Button
									variant="outlined"
									onClick={() => reset({ ...generateDefaultValues(selectedPageData, responses) })}
									sx={{ height: 25, marginRight: '10px' }}
								>
									Reset
								</Button>
								<Button variant="contained" onClick={onSubmit} sx={{ height: 25 }}>
									Save
								</Button>
							</>
						}
						rightWidth="30%"
						height={60}
						padding={'10px 0px'}
					/>
					<div style={styles.divider}>
						<Divider />
					</div>
					<Form control={control} style={styles.form}>
						{(selectedPageData ?? []).map((question, i) => (
							<ChecklistQuestion
								key={question.id}
								control={control}
								resetField={resetField}
								watch={watch}
								question={question}
								idx={i}
							/>
						))}
					</Form>
				</>
			)}
		</div>
	);
}

const styles = {
	container: {
		width: '100%',
		height: '100%',
		display: 'flex',
		flexDirection: 'column' as const,
		justifyContent: 'flex-start',
		alignItems: 'flex-start',
		padding: 20,
	},
	divider: {
		width: '100%',
		height: 1,
		marginBottom: 5,
	},
	form: {
		width: '100%',
		height: '100%',
		overflow: 'auto',
	},
};
