import { Form, useForm } from 'react-hook-form';
import { useShallow } from 'zustand/react/shallow';
import useStore, { useChecklistSlice } from '../../state/store';
import * as selectors from '../../state/checklist/selectors';
import { QuestionType } from '../../config/enums';
import { Button, Divider, Fade, Typography } from '@mui/material';
import { Question } from '../../types';
import { useEffect } from 'react';
import Toolbar from '../common/Toolbar';
import { ChecklistQuestion } from './ChecklistQuestion';
import { Description } from '@mui/icons-material';

function generateDefaultValues(questions?: Question[]) {
	let defaults: Record<string, string[] | string> = {};
	if (!questions) return defaults;
	questions.forEach((q) => {
		switch (q.q_type) {
			case QuestionType.MULTI:
			case QuestionType.SINGLE:
				defaults[q.id.toString()] = [];
				break;
			case QuestionType.FREEFORM:
			default:
				defaults[q.id.toString()] = '';
				break;
		}
	});
	return defaults;
}

export default function Page() {
	const selectedPageData = useStore(useShallow(selectors.selectedPageData));
	const selectedPageInfo = useStore(useShallow(selectors.selectedPageInfo));
	const { control, resetField, reset, watch, handleSubmit } = useForm();

	useEffect(() => {
		reset({ ...generateDefaultValues(selectedPageData) });
	}, [selectedPageData]);

	const onSubmit = handleSubmit((data) => console.log(data));

	return (
		<div style={styles.container}>
			<Toolbar
				left={
					<>
						<Description sx={{ color: 'primary.main', fontSize: 20, marginRight: '5px' }} />
						<Typography fontSize={20}>{selectedPageInfo.title}</Typography>
					</>
				}
				right={
					<>
						<Button
							variant="outlined"
							onClick={() => reset({ ...generateDefaultValues(selectedPageData) })}
							sx={{ height: 25, marginRight: '10px' }}
						>
							Reset
						</Button>
						<Button variant="contained" onClick={onSubmit} sx={{ height: 25 }}>
							Save
						</Button>
					</>
				}
				padding={0}
			/>
			<div style={styles.divider}>
				<Divider />
			</div>
			<Fade in={!!selectedPageData}>
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
			</Fade>
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
