import { RequestInternal } from 'next-auth';

export function getIP(req?: Pick<RequestInternal, 'query' | 'body' | 'headers' | 'method'>): string | undefined {
	return req?.headers?.['x-forwarded-for'];
}

export function getUserAgent(req?: Pick<RequestInternal, 'query' | 'body' | 'headers' | 'method'>): string | undefined {
	return req?.headers?.['user-agent'];
}
