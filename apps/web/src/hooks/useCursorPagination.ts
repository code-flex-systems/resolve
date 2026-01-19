'use client';

import { useEffect, useRef, useState } from 'react';

export default function useCursorPagination<TCursor>(filtersKey: string, initialPageSize = 25) {
	const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: initialPageSize });
	const cursorByPageRef = useRef<Map<number, TCursor | null>>(new Map([[0, null]]));

	useEffect(() => {
		cursorByPageRef.current = new Map([[0, null]]);
		setPaginationModel((prev) => ({ ...prev, page: 0 }));
	}, [filtersKey]);

	useEffect(() => {
		cursorByPageRef.current = new Map([[0, null]]);
		setPaginationModel((prev) => ({ ...prev, page: 0 }));
	}, [paginationModel.pageSize]);

	const cursor = cursorByPageRef.current.get(paginationModel.page) ?? null;

	return {
		paginationModel,
		setPaginationModel,
		cursorByPageRef,
		cursor,
	};
}
