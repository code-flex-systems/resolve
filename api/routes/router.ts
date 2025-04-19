'use strict';

// Router for /api/ routes

// external imports
import path from 'path';
import express from 'express';

// internal imports
import answerRoutes from './routeHandlers/answerRoutes';
import checklistRoutes from './routeHandlers/checklistRoutes';
import pageRoutes from './routeHandlers/pageRoutes';
import questionRoutes from './routeHandlers/questionRoutes';
import docRoutes from './routeHandlers/docRoutes';
import claimRoutes from './routeHandlers/claimRoutes';
import responseRoutes from './routeHandlers/responseRoutes';

export const router = express.Router();

router.use('/public', express.static(path.join(process.cwd(), 'public')));

//
// DELETE
//
router.delete('/answers/:answerId', answerRoutes.deleteAnswer);
router.delete('/checklists/:checklistId', checklistRoutes.deleteChecklist);
router.delete('/docs/:docId', docRoutes.deleteDoc);
router.delete('/pages/instances/:instanceId', pageRoutes.deletePageInstance);
router.delete('/questions/:questionId', questionRoutes.deleteQuestion);

//
// GET
//
// DUMMY CLAIM
router.get('/:checklistId/claims/:claimId', claimRoutes.getClaim);

// answers
router.get('/:questionId/answers', answerRoutes.getAnswers);
router.get('/answers/:answerId', answerRoutes.getAnswer);

// checklists
router.get('/checklists', checklistRoutes.getChecklists);
router.get('/checklists/:checklistId', checklistRoutes.getChecklist);

// pages
router.get('/pages', pageRoutes.getPages);
router.get('/pages/:pageId', pageRoutes.getPage);
router.get('/:checklistId/pages/instances/tree', pageRoutes.getPageInstanceTree);
router.get('/:checklistId/pages/instances/:instanceId', pageRoutes.getPageInstance);
router.get('/:checklistId/pages/:parentId', pageRoutes.getPageInstances);

// docs
router.get('/docs', docRoutes.getDocs);
router.get('/docs/:docId', docRoutes.getDoc);

// questions
router.get('/:pageId/questions', questionRoutes.getQuestions);
router.get('/questions/:questionId', questionRoutes.getQuestion);

// responses
router.get('/:checklistId/:claimId/responses', responseRoutes.getResponsesForClaimChecklist);
router.get('/:checklistId/:claimId/:instanceId/responses', responseRoutes.getResponsesForInstance);

//
// POST
//
router.post('/:questionId/answers', answerRoutes.createAnswer);
router.post('/:questionId/answers/copy/:answerId', answerRoutes.copyAnswer);
router.post('/checklists', checklistRoutes.createChecklist);
router.post('/docs', docRoutes.createDoc);
router.post('/:pageId/questions', questionRoutes.createQuestion);
router.post('/:pageId/questions/copy/:questionId', questionRoutes.copyQuestion);
router.post('/responses', responseRoutes.upsertQuestionResponses);

// pages
router.post('/:checklistId/pages', pageRoutes.createPage);
router.post('/:checklistId/pages/:pageId', pageRoutes.createPageInstance);

//
// PUT
//
router.put('/answers/:answerId', answerRoutes.modifyAnswer);
router.put('/checklists/:checklistId', checklistRoutes.modifyChecklist);
router.put('/pages/:pageId', pageRoutes.modifyPage);
router.put('/questions/:questionId', questionRoutes.modifyQuestion);
