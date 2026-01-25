'use client';
import { Pagination } from '@mui/material';
import {
	gridPaginationMetaSelector,
	gridPaginationModelSelector,
	gridRowCountSelector,
	useGridApiContext,
	useGridSelector,
} from '@mui/x-data-grid-pro';

export default function CustomPagination() {
	const apiRef = useGridApiContext();
	const paginationModel = useGridSelector(apiRef, gridPaginationModelSelector);
	const paginationMeta = useGridSelector(apiRef, gridPaginationMetaSelector);
	const rowCount = useGridSelector(apiRef, gridRowCountSelector);

	// For cursor-based pagination, hasNextPage is explicitly set as a boolean.
	// For traditional pagination, hasNextPage is undefined and we use rowCount.
	const hasNextPage = paginationMeta?.hasNextPage;
	const pageCount =
		typeof hasNextPage === 'boolean'
			? paginationModel.page + (hasNextPage ? 2 : 1)
			: Math.max(1, Math.ceil((rowCount || 0) / paginationModel.pageSize));

	const handleChange = (_event: React.ChangeEvent<unknown>, value: number) => {
		apiRef.current.setPage(value - 1);
	};

	return (
		<div style={{ width: '100%' }} className="flex-row-center">
			<Pagination
				color="primary"
				count={pageCount}
				page={paginationModel.page + 1}
				onChange={handleChange}
				variant="outlined"
				size="small"
			/>
		</div>
	);
}
