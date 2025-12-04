interface RequestHeaders {
	headers?: Record<string, string | undefined>;
}

export function getIP(req?: RequestHeaders): string | undefined {
	return req?.headers?.['x-forwarded-for'];
}

export function getUserAgent(req?: RequestHeaders): string | undefined {
	return req?.headers?.['user-agent'];
}
