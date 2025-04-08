import { Controller, Form, useForm } from 'react-hook-form';
import useStore, { useChecklistSlice } from '../../state/store';
import { useShallow } from 'zustand/react/shallow';
import * as selectors from '../../state/checklist/selectors';
import { Answer } from '../../types';
import {
	Button,
	Divider,
	FormControl,
	FormControlLabel,
	FormLabel,
	Radio,
	RadioGroup,
	TextField,
	Typography,
} from '@mui/material';
import { AnswerType } from '../../config/enums';
import { useEffect } from 'react';
import { Description } from '@mui/icons-material';
import Toolbar from '../common/Toolbar';
import { useAddUpdateAnswer, useDeleteAnswer, useQuestions } from '../../api/queries/page-queries';
import * as actions from '../../state/checklist/actions';

export default function FormAnswer() {
	const selectedPage = useChecklistSlice((state) => state.selectedPage);
	const selectedQuestion = useChecklistSlice((state) => state.selectedQuestion) ?? -1;
	const selectedAnswerData = useStore(useShallow(selectors.selectedAnswerData));
	const { isPending: updating, mutateAsync: addUpdateAnswer } = useAddUpdateAnswer(selectedQuestion);
	const { isPending: deleting, mutateAsync: deleteAnswer } = useDeleteAnswer(selectedAnswerData.id);
	const { isFetching: refetching, refetch } = useQuestions(selectedPage, false, actions.updatePage);
	const {
		control,
		handleSubmit,
		reset,
		formState: { errors },
	} = useForm<Answer>({
		defaultValues: {
			...selectedAnswerData,
		},
	});
	let isPlaceholder = selectedAnswerData.id === -1;
	let inTransition = updating || deleting || refetching;

	const onSubmit = handleSubmit(async (data) => {
		try {
			let newAnswer = await addUpdateAnswer({ answer: data });
			await refetch();
			actions.updateSelectedAnswer(selectedQuestion, newAnswer.id);
		} catch (e) {
			console.error(e);
		}
	});

	const onDelete = async () => {
		try {
			await deleteAnswer();
			actions.updateSelectedAnswer(selectedQuestion, null);
			await refetch();
		} catch (e) {
			console.error(e);
		}
	};

	useEffect(() => {
		reset({ ...selectedAnswerData });
	}, [selectedAnswerData]);

	return (
		<>
			<Toolbar
				left={
					<>
						<Description sx={styles.toolbar} />
						<Typography fontSize={20}>Page 2</Typography>
					</>
				}
				right={
					<>
						{!isPlaceholder && (
							<Button
								disabled={inTransition}
								variant="contained"
								color="error"
								onClick={onDelete}
								sx={{ height: 25, marginRight: '10px' }}
							>
								Delete
							</Button>
						)}
						<Button onClick={onSubmit} disabled={inTransition} variant="contained" sx={{ height: 25 }}>
							{isPlaceholder ? 'Add' : 'Save'}
						</Button>
					</>
				}
				padding={0}
			/>
			<div style={styles.divider}>
				<Divider />
			</div>
			<Form control={control} style={{ width: '100%' }}>
				<div style={styles.row} className="flex-row-left">
					<Controller
						name="a_text"
						control={control}
						rules={{ required: true }}
						render={({ field }) => (
							<TextField
								label="Answer text"
								placeholder="e.g. "
								variant="outlined"
								error={!!errors.a_text}
								{...field}
								sx={styles.textFieldOverrides}
								style={styles.item}
							/>
						)}
					/>

					<Controller
						name="a_desc"
						control={control}
						render={({ field }) => (
							<TextField
								label="Additional info (optional)"
								placeholder="e.g. "
								variant="outlined"
								{...field}
								value={field.value ?? ''}
								sx={styles.textFieldOverrides}
								style={styles.item}
							/>
						)}
					/>
				</div>
				<div style={styles.row} className="flex-row-left">
					<Controller
						name="a_type"
						control={control}
						render={({ field }) => (
							<FormControl style={styles.item}>
								<FormLabel>Answer type</FormLabel>
								<RadioGroup {...field} row>
									<FormControlLabel
										control={<Radio />}
										label="Free-form"
										value={AnswerType.FREEFORM}
									/>
								</RadioGroup>
							</FormControl>
						)}
					/>
				</div>
			</Form>
		</>
	);
}

const styles = {
	divider: {
		width: '100%',
		height: 1,
		marginBottom: 5,
	},
	item: {
		margin: 5,
	},
	row: {
		padding: 5,
	},
	textFieldOverrides: {
		width: 300,
		'& .MuiInputBase-root': {
			borderRadius: 0,
			padding: '3px 5px',
		},
		'& .MuiOutlinedInput-input': {
			borderRadius: 0,
			padding: '3px 5px',
		},
	},
	toolbar: {
		color: 'primary.main',
		fontSize: 20,
		marginRight: '5px',
	},
};
