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
import { liabilityRouter } from './routers/liability';
import { pageRouter } from './routers/page';
import { partyRouter } from './routers/party';
import { questionRouter } from './routers/question';
import { recoveryRouter } from './routers/recovery';
import { referenceDataRouter } from './routers/referenceData';
import { settlementRouter } from './routers/settlement';
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
	liability: liabilityRouter,
	page: pageRouter,
	party: partyRouter,
	question: questionRouter,
	recovery: recoveryRouter,
	referenceData: referenceDataRouter,
	response: responseRouter,
	settlement: settlementRouter,
	task: taskRouter,
	user: userRouter,
});

export type AppRouter = typeof appRouter;
