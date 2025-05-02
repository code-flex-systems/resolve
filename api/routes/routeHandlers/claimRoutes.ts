import { Request, Response } from 'express';
import { getId, getQueryId } from '../route-utils';
import claimController from '../../controllers/claimController';
import { ClaimSearchType } from '../../types/types';

export default {
	getClaim,
	getClaims,
};

async function getClaim(req: Request, res: Response) {
	try {
		let ret = await claimController.getClaim(getQueryId(req, 'checklist'), getId(req, 'claim'));
		res.status(200).send(ret);
	} catch (e) {
		console.error(e);
	}
}

async function getClaims(req: Request, res: Response) {
	try {
		const searchTerm =
			typeof req.query.value === 'string' &&
			typeof req.query.type === 'string' &&
			['claim_number', 'insured'].includes(req.query.type)
				? { type: req.query.type as ClaimSearchType, value: req.query.value }
				: undefined;
		let ret = await claimController.getClaims(searchTerm);
		res.status(200).send(ret);
	} catch (e) {
		console.error(e);
	}
}
