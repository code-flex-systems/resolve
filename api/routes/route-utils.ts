import { Request } from 'express';

export function getId(req: Request, key: string) {
	let id = req.params[`${key}Id`];
	if (!id || isNaN(parseInt(id))) {
		throw new Error(`Invalid ${key}`);
	}
	return parseInt(id);
}
