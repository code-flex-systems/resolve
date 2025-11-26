import { router } from './trpc';

import { actionRouter } from './routers/action';
import { activityLogsRouter } from './routers/activityLogs';
import { adminLogsRouter } from './routers/adminLogs';
import { answerRouter } from './routers/answer';
import { checklistRouter } from './routers/checklist';
import { claimRouter } from './routers/claim';
import { commentRouter } from './routers/comment';
import { coverageRouter } from './routers/coverage';
import { deadlineRouter } from './routers/deadline';
import { deskRouter } from './routers/desk';
import { docRouter } from './routers/doc';
import { feedRouter } from './routers/feed';
import { pageRouter } from './routers/page';
import { partyRouter } from './routers/party';
import { passwordResetRouter } from './routers/passwordReset';
import { questionRouter } from './routers/question';
import { recoveryRouter } from './routers/recovery';
import { responseRouter } from './routers/response';
import { taskRouter } from './routers/task';
import { userRouter } from './routers/user';

export const appRouter = router({
	action: actionRouter,
	activityLogs: activityLogsRouter,
	adminLogs: adminLogsRouter,
	answer: answerRouter,
	checklist: checklistRouter,
	claim: claimRouter,
	comment: commentRouter,
	coverage: coverageRouter,
	deadline: deadlineRouter,
	desk: deskRouter,
	doc: docRouter,
	feed: feedRouter,
	page: pageRouter,
	party: partyRouter,
	passwordReset: passwordResetRouter,
	question: questionRouter,
	recovery: recoveryRouter,
	response: responseRouter,
	task: taskRouter,
	user: userRouter,
});

export type AppRouter = typeof appRouter;
