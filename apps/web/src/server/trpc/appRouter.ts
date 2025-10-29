import { router } from './trpc';

import { answerRouter } from './routers/answer';
import { checklistRouter } from './routers/checklist';
import { claimRouter } from './routers/claim';
import { docRouter } from './routers/doc';
import { pageRouter } from './routers/page';
import { questionRouter } from './routers/question';
import { responseRouter } from './routers/response';
import { userRouter } from './routers/user';
import { feedRouter } from './routers/feed';
import { passwordResetRouter } from './routers/passwordReset';
import { actionRouter } from './routers/action';
import { commentRouter } from './routers/comment';
import { recoveryRouter } from './routers/recovery';

export const appRouter = router({
	action: actionRouter,
	answer: answerRouter,
	checklist: checklistRouter,
	claim: claimRouter,
	comment: commentRouter,
	doc: docRouter,
	feed: feedRouter,
	page: pageRouter,
	passwordReset: passwordResetRouter,
	question: questionRouter,
	recovery: recoveryRouter,
	response: responseRouter,
	user: userRouter,
});

export type AppRouter = typeof appRouter;
