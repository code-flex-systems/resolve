import { Request, Response } from 'express';
import docController from '../../controllers/docController';
import { getId } from '../route-utils';

export default {
	createDoc,
	deleteDoc,
	getDoc,
	getDocs,
};

async function createDoc(req: Request, res: Response) {
	try {
		let ret = await docController.createDoc(req.body);
		res.status(200).send(ret);
	} catch (e) {
		console.error(e);
	}
}

async function deleteDoc(req: Request, res: Response) {
	try {
		let ret = await docController.deleteDoc(getId(req, 'doc'));
		res.status(200).send(ret);
	} catch (e) {
		console.error(e);
	}
}

async function getDoc(req: Request, res: Response) {
	try {
		let ret = await docController.getDoc(getId(req, 'doc'));
		res.status(200).send(ret);
	} catch (e) {
		console.error(e);
	}
}

async function getDocs(req: Request, res: Response) {
	try {
		let ret = await docController.getDocs();
		res.status(200).send(ret);
	} catch (e) {
		console.error(e);
	}
}
