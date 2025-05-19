// src/hooks/useTrpcQuery.ts
import { useEffect } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';

/** Extract the `data` type from a UseQueryResult */
type DataOf<T> = T extends UseQueryResult<infer D, any> ? D : never;

/** Extract the `error` type from a UseQueryResult */
type ErrorOf<T> = T extends UseQueryResult<any, infer E> ? E : never;

export function useTrpcQuery<TQueryFn extends (...args: any[]) => UseQueryResult<any, any>>(
	useQueryFn: TQueryFn,
	/** the “input” you’d pass to the hook */
	input: Parameters<TQueryFn>[0],
	/** callbacks typed against the real data & error */
	callbacks?: {
		onSuccess?: (data: DataOf<ReturnType<TQueryFn>>) => void;
		onError?: (error: ErrorOf<ReturnType<TQueryFn>>) => void;
	}
): ReturnType<TQueryFn> {
	const result = useQueryFn(input) as ReturnType<TQueryFn>;
	const { data, isLoading, isError, error } = result;

	// fire onSuccess when data arrives
	useEffect(() => {
		if (!isLoading && data !== undefined) {
			callbacks?.onSuccess?.(data as DataOf<ReturnType<TQueryFn>>);
		}
		// only rerun when loading state or data changes
	}, [isLoading, data, callbacks]);

	// fire onError when an error appears
	useEffect(() => {
		if (isError && error !== undefined) {
			callbacks?.onError?.(error as ErrorOf<ReturnType<TQueryFn>>);
		}
	}, [isError, error, callbacks]);

	return result;
}
