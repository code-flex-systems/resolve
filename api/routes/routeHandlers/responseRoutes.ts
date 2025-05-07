import { Request, Response } from 'express';
import responseController from '../../controllers/responseController';
import { getId } from '../route-utils';
import { Interval } from '../../types/types';

export default {
	evaluateResponses,
	getResponsesForAnswer,
	getResponsesForClaimChecklist,
	getResponsesForInstance,
	upsertQuestionResponses,
};

async function evaluateResponses(req: Request, res: Response) {
	try {
		let ret = await responseController.evaluateResponses(
			getId(req, 'checklist'),
			getId(req, 'claim'),
			getId(req, 'instance')
		);
		res.status(200).send(ret);
	} catch (e) {
		console.error(e);
	}
}

async function getResponsesForAnswer(req: Request, res: Response) {
	try {
		const interval: Interval<string> | undefined =
			req.query.from || req.query.to
				? { from: req.query.from?.toString(), to: req.query.to?.toString() }
				: undefined;
		let ret = await responseController.getResponsesForAnswer(getId(req, 'answer'), interval);
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
		let ret = await responseController.upsertQuestionResponses(req.body);
		res.status(200).send(ret);
	} catch (e) {
		console.error(e);
	}
}
