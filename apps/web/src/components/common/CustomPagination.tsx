'use client';
import { Pagination } from '@mui/material';
import {
	gridPageCountSelector,
	gridPaginationModelSelector,
	useGridApiContext,
	useGridSelector,
} from '@mui/x-data-grid';

export function CustomPagination() {
	const apiRef = useGridApiContext();
	const pageCount = useGridSelector(apiRef, gridPageCountSelector);
	const paginationModel = useGridSelector(apiRef, gridPaginationModelSelector);

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
				shape="rounded"
			/>
		</div>
	);
}
