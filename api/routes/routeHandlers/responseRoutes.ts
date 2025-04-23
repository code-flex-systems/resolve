import { Request, Response } from 'express';
import responseController from '../../controllers/responseController';
import { getId } from '../route-utils';

export default {
	getResponsesForAnswer,
	getResponsesForClaimChecklist,
	getResponsesForInstance,
	upsertQuestionResponses,
};

async function getResponsesForAnswer(req: Request, res: Response) {
	try {
		let ret = await responseController.getResponsesForAnswer(getId(req, 'answer'));
		res.status(200).send(ret);
	} catch (e) {
		console.error(e);
	}
}

async function getResponsesForClaimChecklist(req: Request, res: Response) {
	try {
		let ret = await responseController.getResponsesForClaimChecklist(getId(req, 'checklist'), getId(req, 'claim'));
		res.status(200).send(ret);
	} catch (e) {
		console.error(e);
	}
}

async function getResponsesForInstance(req: Request, res: Response) {
	try {
		let ret = await responseController.getResponsesForClaimChecklist(
			getId(req, 'checklist'),
			getId(req, 'claim'),
			getId(req, 'instance')
		);
		res.status(200).send(ret);
	} catch (e) {
		console.error(e);
	}
}

async function upsertQuestionResponses(req: Request, res: Response) {
	try {
		await responseController.upsertQuestionResponses(req.body);
		res.status(200).send();
	} catch (e) {
		console.error(e);
	}
}
