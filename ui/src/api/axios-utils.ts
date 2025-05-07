import axios from 'axios';

const axiosInstance = axios.create({
	withCredentials: false,
	baseURL: 'http://localhost:8080/api',
	timeout: 100000,
});

export function buildQuery(params?: Record<string, any>) {
	if (!params) return '';
	let query: any[] = [];
	Object.keys(params).forEach((key) => {
		if (params[key]) query.push(`${key}=${params[key]}`);
	});
	return query.length ? `?${query.join('&')}` : '';
}

export function performAsyncDelete(route: string, config?: any) {
	return axiosInstance.delete(route, config);
}

export function performAsyncGet(route: string) {
	return axiosInstance.get(route);
}

export function performAsyncPost(route: string, data: any, config?: any) {
	return axiosInstance.post(route, data, config);
}

export function performAsyncPut(route: string, data: any, config?: any) {
	return axiosInstance.put(route, data, config);
}
