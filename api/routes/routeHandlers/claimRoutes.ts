import { Request, Response } from 'express';
import { getId } from '../route-utils';
import claimController from '../../controllers/claimController';

export default {
	getClaim,
};

async function getClaim(req: Request, res: Response) {
	try {
		let ret = await claimController.getClaim(getId(req, 'checklist'), getId(req, 'claim'));
		res.status(200).send(ret);
	} catch (e) {
		console.error(e);
	}
}
