import { Request, Response } from 'express';
import checklistController from '../../controllers/checklistController';
import { getId } from '../route-utils';

export default {
	createChecklist,
	deleteChecklist,
	getChecklist,
	getChecklists,
	modifyChecklist,
};

async function createChecklist(req: Request, res: Response) {
	try {
		let ret = await checklistController.createChecklist(req.body);
		res.status(200).send(ret);
	} catch (e) {
		console.error(e);
	}
}

async function deleteChecklist(req: Request, res: Response) {
	try {
		let ret = await checklistController.deleteChecklist(getId(req, 'checklist'));
		res.status(200).send(ret);
	} catch (e) {
		console.error(e);
	}
}

async function getChecklist(req: Request, res: Response) {
	try {
		let ret = await checklistController.getChecklist(getId(req, 'checklist'));
		res.status(200).send(ret);
	} catch (e) {
		console.error(e);
	}
}

async function getChecklists(req: Request, res: Response) {
	try {
		let ret = await checklistController.getChecklists();
		res.status(200).send(ret);
	} catch (e) {
		console.error(e);
	}
}

async function modifyChecklist(req: Request, res: Response) {
	try {
		let ret = await checklistController.modifyChecklist(getId(req, 'checklist'), req.body);
		res.status(200).send(ret);
	} catch (e) {
		console.error(e);
	}
}
