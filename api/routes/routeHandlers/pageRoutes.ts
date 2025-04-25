import { Request, Response } from 'express';
import pageController from '../../controllers/pageController';
import { getId } from '../route-utils';

export default {
	createPage,
	createPageInstance,
	deletePageInstance,
	getPage,
	getPages,
	getPageInstance,
	getPageInstances,
	getPageInstanceTree,
	getVisiblePageInstances,
	modifyPage,
};

async function createPage(req: Request, res: Response) {
	try {
		let ret = await pageController.createPage(getId(req, 'checklist'), req.body);
		res.status(200).send(ret);
	} catch (e) {
		console.error(e);
	}
}

async function createPageInstance(req: Request, res: Response) {
	try {
		let ret = await pageController.createPageInstance(getId(req, 'checklist'), getId(req, 'page'), req.body);
		res.status(200).send(ret);
	} catch (e) {
		console.error(e);
	}
}

async function deletePageInstance(req: Request, res: Response) {
	try {
		await pageController.deletePageInstance(getId(req, 'instance'));
		res.status(200).send();
	} catch (e) {
		console.error(e);
	}
}

async function getPage(req: Request, res: Response) {
	try {
		let ret = await pageController.getPage(getId(req, 'page'));
		res.status(200).send(ret);
	} catch (e) {
		console.error(e);
	}
}

async function getPages(req: Request, res: Response) {
	try {
		let ret = await pageController.getPages();
		res.status(200).send(ret);
	} catch (e) {
		console.error(e);
	}
}

async function getPageInstance(req: Request, res: Response) {
	try {
		let ret = await pageController.getPageInstance(getId(req, 'instance'));
		res.status(200).send(ret);
	} catch (e) {
		console.error(e);
	}
}

async function getPageInstances(req: Request, res: Response) {
	try {
		let ret = await pageController.getPageInstances(getId(req, 'checklist'), getId(req, 'parent'));
		res.status(200).send(ret);
	} catch (e) {
		console.error(e);
	}
}

async function getPageInstanceTree(req: Request, res: Response) {
	try {
		let ret = await pageController.getPageInstanceTree(getId(req, 'checklist'));
		res.status(200).send(ret);
	} catch (e) {
		console.error(e);
	}
}

async function getVisiblePageInstances(req: Request, res: Response) {
	try {
		let ret = await pageController.getVisibilePageInstances(getId(req, 'checklist'), getId(req, 'claim'));
		res.status(200).send(ret);
	} catch (e) {
		console.error(e);
	}
}

async function modifyPage(req: Request, res: Response) {
	try {
		let ret = await pageController.modifyPage(getId(req, 'page'), req.body);
		res.status(200).send(ret);
	} catch (e) {
		console.error(e);
	}
}
