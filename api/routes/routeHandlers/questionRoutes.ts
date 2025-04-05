import { Request, Response } from 'express';
import questionController from '../../controllers/questionController';
import { getId } from '../route-utils';

export default {
	createQuestion,
	deleteQuestion,
	getQuestion,
	getQuestions,
	modifyQuestion,
};

async function createQuestion(req: Request, res: Response) {
	try {
		let ret = await questionController.createQuestion(getId(req, 'page'), req.body);
		res.status(200).send(ret);
	} catch (e) {
		console.error(e);
	}
}

async function deleteQuestion(req: Request, res: Response) {
	try {
		let ret = await questionController.deleteQuestion(getId(req, 'question'));
		res.status(200).send(ret);
	} catch (e) {
		console.error(e);
	}
}

async function getQuestion(req: Request, res: Response) {
	try {
		let ret = await questionController.getQuestion(getId(req, 'question'));
		res.status(200).send(ret);
	} catch (e) {
		console.error(e);
	}
}

async function getQuestions(req: Request, res: Response) {
	try {
		let ret = await questionController.getQuestions(getId(req, 'page'));
		res.status(200).send(ret);
	} catch (e) {
		console.error(e);
	}
}

async function modifyQuestion(req: Request, res: Response) {
	try {
		let ret = await questionController.modifyQuestion(getId(req, 'question'), req.body);
		res.status(200).send(ret);
	} catch (e) {
		console.error(e);
	}
}
