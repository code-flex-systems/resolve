'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface CursorPaginationResult<TCursor> {
	paginationModel: { page: number; pageSize: number };
	setPaginationModel: (model: { page: number; pageSize: number }) => void;
	cursor: TCursor | null;
	/**
	 * Register a cursor from a completed fetch response.
	 * This uses the internally tracked queryPage (captured when cursor changed)
	 * to correctly associate the response with the page that initiated the request.
	 */
	registerCursor: (nextCursor: TCursor | null | undefined) => void;
}

export default function useCursorPagination<TCursor>(
	filtersKey: string,
	initialPageSize = 25
): CursorPaginationResult<TCursor> {
	const [paginationModel, setPaginationModelInternal] = useState({
		page: 0,
		pageSize: initialPageSize,
	});
	const cursorByPageRef = useRef<Map<number, TCursor | null>>(new Map([[0, null]]));

	// Track which page the current query is for. Updated synchronously when cursor changes.
	// This is read by registerCursor to correctly associate responses with pages.
	const queryPageRef = useRef(0);
	const prevCursorRef = useRef<TCursor | null | undefined>(undefined);

	// Reset when filters change
	useEffect(() => {
		cursorByPageRef.current = new Map([[0, null]]);
		queryPageRef.current = 0;
		prevCursorRef.current = undefined;
		setPaginationModelInternal((prev) => ({ ...prev, page: 0 }));
	}, [filtersKey]);

	// Reset when page size changes
	useEffect(() => {
		cursorByPageRef.current = new Map([[0, null]]);
		queryPageRef.current = 0;
		prevCursorRef.current = undefined;
		setPaginationModelInternal((prev) => ({ ...prev, page: 0 }));
	}, [paginationModel.pageSize]);

	const cursor = cursorByPageRef.current.get(paginationModel.page) ?? null;

	// Update queryPage synchronously when cursor changes (before effects run).
	// This captures the page at the moment a new fetch starts.
	if (cursor !== prevCursorRef.current) {
		queryPageRef.current = paginationModel.page;
		prevCursorRef.current = cursor;
	}

	// Guarded setPaginationModel that prevents navigation to pages without known cursors.
	// This fixes the issue where navigating to a page before its cursor is known
	// would fall back to null and fetch page 0 again.
	const setPaginationModel = useCallback(
		(model: { page: number; pageSize: number }) => {
			// Page size changes always allowed (triggers reset via useEffect)
			if (model.pageSize !== paginationModel.pageSize) {
				setPaginationModelInternal(model);
				return;
			}

			// Only allow navigation to pages we have cursors for
			const maxKnownPage = Math.max(...cursorByPageRef.current.keys());
			if (model.page <= maxKnownPage) {
				setPaginationModelInternal(model);
			}
			// Silently ignore navigation attempts beyond known pages
		},
		[paginationModel.pageSize]
	);

	// Register cursor from a completed fetch.
	// Uses queryPageRef which was captured when the cursor changed (fetch started).
	// This ensures the correct page is used even if navigation happened during the fetch.
	const registerCursor = useCallback((nextCursor: TCursor | null | undefined) => {
		if (nextCursor != null) {
			cursorByPageRef.current.set(queryPageRef.current + 1, nextCursor);
		}
	}, []);

	return {
		paginationModel,
		setPaginationModel,
		cursor,
		registerCursor,
	};
}
