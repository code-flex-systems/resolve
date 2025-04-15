import { Request, Response } from 'express';
import answerController from '../../controllers/answerController';
import { getId } from '../route-utils';

export default {
	createAnswer,
	copyAnswer,
	deleteAnswer,
	getAnswer,
	getAnswers,
	modifyAnswer,
};

async function createAnswer(req: Request, res: Response) {
	try {
		let ret = await answerController.createAnswer(getId(req, 'question'), req.body);
		res.status(200).send(ret);
	} catch (e) {
		console.error(e);
	}
}

async function copyAnswer(req: Request, res: Response) {
	try {
		let ret = await answerController.copyAnswer(getId(req, 'question'), getId(req, 'answer'));
		res.status(200).send(ret);
	} catch (e) {
		console.error(e);
	}
}

async function deleteAnswer(req: Request, res: Response) {
	try {
		let ret = await answerController.deleteAnswer(getId(req, 'answer'));
		res.status(200).send(ret);
	} catch (e) {
		console.error(e);
	}
}

async function getAnswer(req: Request, res: Response) {
	try {
		let ret = await answerController.getAnswer(getId(req, 'answer'));
		res.status(200).send(ret);
	} catch (e) {
		console.error(e);
	}
}

async function getAnswers(req: Request, res: Response) {
	try {
		let ret = await answerController.getAnswers(getId(req, 'question'));
		res.status(200).send(ret);
	} catch (e) {
		console.error(e);
	}
}

async function modifyAnswer(req: Request, res: Response) {
	try {
		let ret = await answerController.modifyAnswer(getId(req, 'answer'), req.body);
		res.status(200).send(ret);
	} catch (e) {
		console.error(e);
	}
}
