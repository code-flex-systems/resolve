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

export const appRouter = router({
	answer: answerRouter,
	checklist: checklistRouter,
	claim: claimRouter,
	doc: docRouter,
	feed: feedRouter,
	page: pageRouter,
	question: questionRouter,
	response: responseRouter,
	user: userRouter,
});

export type AppRouter = typeof appRouter;
