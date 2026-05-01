'use client';

import Chip from '@/components/ui/Chip';
import React, { useEffect, useMemo, useState } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import { useResponseTrpc } from '@/hooks/trpc/useResponseTrpc';
import { GetUserOutput } from '@/hooks/trpc/useUserTrpc';
import type { DateRange } from '@/types/dateTypes';
import { formatUser } from '@/lib/utils/utils';
import { useClerkSession } from '@/lib/auth/use-clerk-session';
import DataTable, { type ColumnDef } from '@/components/ui/DataTable';

function DescriptionCell({ row, compact }: { row: any; value?: any } & { compact: boolean }) {
	const { data: session } = useClerkSession();
	const getLogText = () => {
		switch (row.action) {
			case 'insert':
				return (
					<>
						<div
							style={{
								display: 'flex',
								justifyContent: 'flex-start',
								alignItems: 'center',
								padding: '2px 0px',
								flexWrap: 'wrap',
							}}
						>
							<span style={{ fontStyle: 'italic', fontSize: 13, marginRight: '5px' }}>
								Responded to the question
							</span>
							<Chip size="sm">{row.question_text}</Chip>
						</div>
						<div
							style={{
								display: 'flex',
								justifyContent: 'flex-start',
								alignItems: 'center',
								padding: '2px 0px',
								flexWrap: 'wrap',
							}}
						>
							<span style={{ fontStyle: 'italic', fontSize: 13, marginRight: '5px' }}>
								with answer(s)
							</span>
							{row.new_response_text ? (
								<Chip size="sm">{row.new_response_text}</Chip>
							) : (
								row.new_answers.map((a: any, i: number) => (
									<Chip key={i} size="sm">
										{a.label}
									</Chip>
								))
							)}
						</div>
					</>
				);
			case 'update':
				return (
					<>
						<div
							style={{
								display: 'flex',
								justifyContent: 'flex-start',
								alignItems: 'center',
								padding: '2px 0px',
								flexWrap: 'wrap',
							}}
						>
							<span style={{ fontStyle: 'italic', fontSize: 13, marginRight: '5px' }}>
								Changed their response to the question
							</span>
							<Chip size="sm">{row.question_text}</Chip>
						</div>
						<div
							style={{
								display: 'flex',
								justifyContent: 'flex-start',
								alignItems: 'center',
								padding: '2px 0px',
								flexWrap: 'wrap',
							}}
						>
							<span style={{ fontStyle: 'italic', fontSize: 13, marginRight: '5px' }}>
								from answer(s)
							</span>
							{row.old_response_text ? (
								<Chip size="sm">{row.old_response_text}</Chip>
							) : (
								row.old_answers.map((a: any, i: number) => (
									<Chip key={i} size="sm">
										{a.label}
									</Chip>
								))
							)}
						</div>
						<div
							style={{
								display: 'flex',
								justifyContent: 'flex-start',
								alignItems: 'center',
								padding: '2px 0px',
								flexWrap: 'wrap',
							}}
						>
							<span style={{ fontStyle: 'italic', fontSize: 13, marginRight: '5px' }}>to answer(s)</span>
							{row.new_response_text ? (
								<Chip size="sm">{row.new_response_text}</Chip>
							) : (
								row.new_answers.map((a: any, i: number) => (
									<Chip key={i} size="sm">
										{a.label}
									</Chip>
								))
							)}
						</div>
					</>
				);
			case 'delete':
				return (
					<>
						<div
							style={{
								display: 'flex',
								justifyContent: 'flex-start',
								alignItems: 'center',
								padding: '2px 0px',
								flexWrap: 'wrap',
							}}
						>
							<span style={{ fontStyle: 'italic', fontSize: 13, marginRight: '5px' }}>
								Cleared their response to the question
							</span>
							<Chip size="sm">{row.question_text}</Chip>
						</div>
						<div
							style={{
								display: 'flex',
								justifyContent: 'flex-start',
								alignItems: 'center',
								padding: '2px 0px',
								flexWrap: 'wrap',
							}}
						>
							<span style={{ fontStyle: 'italic', fontSize: 13, marginRight: '5px' }}>Answers were </span>
							{row.old_response_text ? (
								<Chip size="sm">{row.old_response_text}</Chip>
							) : (
								row.old_answers.map((a: any, i: number) => (
									<Chip key={i} size="sm">
										{a.label}
									</Chip>
								))
							)}
						</div>
					</>
				);
			default:
				return '';
		}
	};

	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column' as const,
				width: '100%',
				minWidth: 'fit-content',
				height: '100%',
				justifyContent: 'center',
				alignItems: 'flex-start',
				padding: '10px 10px',
			}}
		>
			<div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-start' }}>
				{getLogText()}
			</div>
			<div
				style={{
					display: 'flex',
					justifyContent: 'flex-start',
					alignItems: 'center',
					paddingTop: '5px',
					flexWrap: 'wrap',
				}}
			>
				<div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
					<span
						style={{
							...{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
							fontSize: 12,
							lineHeight: '17px',
							color: 'var(--text-muted)',
						}}
					>
						{formatUser(row, session?.user?.email ?? undefined)}
					</span>
					<div style={styles.divider} />
					<span
						style={{
							...{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
							fontSize: 12,
							lineHeight: '17px',
							color: 'primary',
						}}
					>
						{row.page_label}
					</span>
				</div>
				<div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
					<div style={styles.divider} />
					<span
						style={{
							...{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
							fontSize: 12,
							lineHeight: '17px',
							color: 'var(--text-muted)',
						}}
					>
						{compact
							? dayjs(row.created_at).format('MM/DD/YY hh:mm A')
							: dayjs(row.created_at).format('MMMM D, YYYY hh:mm A')}
					</span>
				</div>
			</div>
		</div>
	);
}

export default function UserActivityTable({
	checklistId,
	claimId,
	users,
	range,
	searchTerm,
	pageSize = 25,
	compact = false,
	showPagination = true,
	onCountChange,
}: {
	checklistId?: string;
	claimId?: string;
	users: GetUserOutput[];
	range: DateRange<Dayjs>;
	searchTerm?: string;
	pageSize?: number;
	compact?: boolean;
	showPagination?: boolean;
	onCountChange?: (count: number) => void;
}) {
	const [constraints, setConstraints] = useState<{ page: number; pageSize: number }>({ page: 0, pageSize });

	const filters = useMemo(
		() => ({
			checklistId,
			claimId,
			emails: users.map((u) => u.email),
			range: [range[0]?.toString() ?? null, range[1]?.toString() ?? null] as [string | null, string | null],
			searchTerm,
		}),
		[checklistId, claimId, users, range, searchTerm]
	);

	const { data: logs = { rows: [], count: undefined }, isFetching: isFetchingLogs } = useResponseTrpc().listLogs(
		{
			filters,
			limit: constraints.pageSize,
			offset: constraints.page * constraints.pageSize,
		},
		{
			enabled: range.every((r) => !!r),
		}
	);

	const columns = useMemo(() => {
		const gridColumns: ColumnDef<any, any>[] = [
			{
				accessorKey: 'desc',
				header: '',
				cell: (info: any) => {
					const params = { row: info.row.original, value: info.getValue() };
					return <DescriptionCell compact={compact} {...params} />;
				},
			},
		];
		return gridColumns;
	}, [compact]);

	useEffect(() => {
		if (logs.count !== undefined) onCountChange?.(logs.count);
	}, [logs.count, onCountChange]);

	return (
		<div style={{ width: '100%', height: '100%' }}>
			{!isFetchingLogs && !logs.count ? (
				<div
					style={{
						width: '100%',
						padding: 10,
						display: 'flex',
						justifyContent: 'center',
						alignItems: 'center',
					}}
				>
					<span style={{ fontSize: 13, color: 'var(--text-muted)' }}>No activity</span>
				</div>
			) : (
				<DataTable
					columns={columns}
					headerHeight={0}
					loading={isFetchingLogs}
					rows={logs.rows}
					rowCount={logs.count ?? 0}
					hideFooter={!showPagination}
					paginationMode="server"
					paginationModel={constraints}
					onPaginationModelChange={setConstraints}
				/>
			)}
		</div>
	);
}

const styles = {
	chip: {
		height: 20,
		marginTop: '2px',
		marginLeft: '2px',
		fontStyle: 'italic',
	},
	divider: {
		size: 5,
		height: 5,
		borderRadius: 5,
		backgroundColor: '#d9d9d9',
		margin: '0px 10px',
	},
	tableOverrides: {
		border: 'none',
		// remove the grey hover background
		'& .MuiDataGrid-row:hover': {
			backgroundColor: 'transparent !important',
		},
		// (optional) remove the hover "pointer" cursor too
		'& .MuiDataGrid-row': {
			cursor: 'default',
		},
		...{},
	},
};
