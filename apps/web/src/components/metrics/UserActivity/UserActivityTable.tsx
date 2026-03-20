'use client';

import Chip from '@/components/ui/Chip';
import React, { useMemo, useState } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import { useResponseTrpc } from '@/hooks/trpc/useResponseTrpc';
import { GetUserOutput } from '@/hooks/trpc/useUserTrpc';
import type { DateRange } from '@/types/dateTypes';
import { formatUser } from '@/lib/utils/utils';
import { useClerkSession } from '@/lib/auth/use-clerk-session';
import ExportButton from '@/components/common/ExportButton';
import { CsvColumn } from '@/lib/utils/exportUtils';
import { trpc } from '@/lib/trpc';
import DataTable, { type ColumnDef } from '@/components/ui/DataTable';

function DescriptionCell({ row, compact }: { row: any; value?: any } & { compact: boolean }) {
	const { data: session } = useClerkSession();
	const getLogText = () => {
		switch (row.action) {
			case 'insert':
				return (
					<>
						<div
style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', padding: '2px 0px', flexWrap: 'wrap' }}>
							<span style={{ fontStyle: 'italic', fontSize: 13, marginRight: '5px' }}>
								Responded to the question
							</span>
							<Chip size="sm">{row.question_text}</Chip>
						</div>
						<div
style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', padding: '2px 0px', flexWrap: 'wrap' }}>
							<span style={{ fontStyle: 'italic', fontSize: 13, marginRight: '5px' }}>
								with answer(s)
							</span>
							{row.new_response_text ? (
								<Chip size="sm">{row.new_response_text}</Chip>
							) : (
								row.new_answers.map((a: any, i: number) => (
									<Chip key={i} size="sm">{a.label}</Chip>
								))
							)}
						</div>
					</>
				);
			case 'update':
				return (
					<>
						<div
style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', padding: '2px 0px', flexWrap: 'wrap' }}>
							<span style={{ fontStyle: 'italic', fontSize: 13, marginRight: '5px' }}>
								Changed their response to the question
							</span>
							<Chip size="sm">{row.question_text}</Chip>
						</div>
						<div
style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', padding: '2px 0px', flexWrap: 'wrap' }}>
							<span style={{ fontStyle: 'italic', fontSize: 13, marginRight: '5px' }}>
								from answer(s)
							</span>
							{row.old_response_text ? (
								<Chip size="sm">{row.old_response_text}</Chip>
							) : (
								row.old_answers.map((a: any, i: number) => (
									<Chip key={i} size="sm">{a.label}</Chip>
								))
							)}
						</div>
						<div
style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', padding: '2px 0px', flexWrap: 'wrap' }}>
							<span style={{ fontStyle: 'italic', fontSize: 13, marginRight: '5px' }}>
								to answer(s)
							</span>
							{row.new_response_text ? (
								<Chip size="sm">{row.new_response_text}</Chip>
							) : (
								row.new_answers.map((a: any, i: number) => (
									<Chip key={i} size="sm">{a.label}</Chip>
								))
							)}
						</div>
					</>
				);
			case 'delete':
				return (
					<>
						<div
style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', padding: '2px 0px', flexWrap: 'wrap' }}>
							<span style={{ fontStyle: 'italic', fontSize: 13, marginRight: '5px' }}>
								Cleared their response to the question
							</span>
							<Chip size="sm">{row.question_text}</Chip>
						</div>
						<div
style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', padding: '2px 0px', flexWrap: 'wrap' }}>
							<span style={{ fontStyle: 'italic', fontSize: 13, marginRight: '5px' }}>
								Answers were{' '}
							</span>
							{row.old_response_text ? (
								<Chip size="sm">{row.old_response_text}</Chip>
							) : (
								row.old_answers.map((a: any, i: number) => (
									<Chip key={i} size="sm">{a.label}</Chip>
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
style={{ display: 'flex', width: '100%', minWidth: 'fit-content', height: '100%', justifyContent: 'center', alignItems: 'flex-start', padding: '10px 10px' }}>
			<div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-start' }}>
				{getLogText()}
			</div>
			<div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', paddingTop: '5px', flexWrap: 'wrap' }}>
				<div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
					<span style={{ ...{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }, fontSize: 12, lineHeight: '17px', color: 'var(--text-muted)' }}>
						{formatUser(row, session?.user?.email)}
					</span>
					<div style={styles.divider} />
					<span style={{ ...{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }, fontSize: 12, lineHeight: '17px', color: 'primary' }}>
						{row.page_label}
					</span>
				</div>
				<div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
					<div style={styles.divider} />
					<span style={{ ...{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }, fontSize: 12, lineHeight: '17px', color: 'var(--text-muted)' }}>
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
}: {
	checklistId?: number;
	claimId?: number;
	users: GetUserOutput[];
	range: DateRange<Dayjs>;
	searchTerm?: string;
	pageSize?: number;
	compact?: boolean;
	showPagination?: boolean;
}) {
	const [constraints, setConstraints] = useState<{ page: number; pageSize: number }>({ page: 0, pageSize });
	const trpcUtils = trpc.useUtils();
	const { data: session } = useClerkSession();

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
			enabled: checklistId !== -1 && claimId !== -1,
		}
	);

	const columns = useMemo(() => {
		const gridColumns: ColumnDef<any, any>[] = [
			{
				accessorKey: 'desc',
				header: '',
				cell: (info: any) => { const params = { row: info.row.original, value: info.getValue() }; return <DescriptionCell compact={compact} {...params} />; },
			},
		];
		return gridColumns;
	}, [compact]);

	// CSV column configuration matching table display
	const csvColumns: CsvColumn<(typeof logs.rows)[number]>[] = useMemo(
		() => [
			{
				header: 'Action',
				accessor: 'action',
				formatter: (value) => {
					switch (value) {
						case 'insert':
							return 'Insert';
						case 'update':
							return 'Update';
						case 'delete':
							return 'Delete';
						default:
							return value || '';
					}
				},
			},
			{
				header: 'Question',
				accessor: 'question_text',
			},
			{
				header: 'Page',
				accessor: 'page_label',
			},
			{
				header: 'Old Response Text',
				accessor: 'old_response_text',
				formatter: (value) => value || '',
			},
			{
				header: 'New Response Text',
				accessor: 'new_response_text',
				formatter: (value) => value || '',
			},
			{
				header: 'Old Answers',
				accessor: (row) => {
					try {
						const answers =
							typeof row.old_answers === 'string' ? JSON.parse(row.old_answers) : row.old_answers;
						if (!answers || !Array.isArray(answers)) return '';
						return answers.map((a: any) => a.label).join(', ');
					} catch {
						return '';
					}
				},
			},
			{
				header: 'New Answers',
				accessor: (row) => {
					try {
						const answers =
							typeof row.new_answers === 'string' ? JSON.parse(row.new_answers) : row.new_answers;
						if (!answers || !Array.isArray(answers)) return '';
						return answers.map((a: any) => a.label).join(', ');
					} catch {
						return '';
					}
				},
			},
			{
				header: 'User',
				accessor: (row) => formatUser(row, session?.user?.email),
			},
			{
				header: 'User Email',
				accessor: 'email',
			},
			{
				header: 'Timestamp',
				accessor: 'created_at',
				formatter: (value) => dayjs(value).format('MMMM D, YYYY hh:mm A'),
			},
		],
		[session?.user?.email]
	);

	return (
		<div style={{ width: '100%', height: '100%', position: 'relative' }}>
			{showPagination && !compact && (
				<div
style={{
						display: 'flex',
						justifyContent: 'flex-end',
						alignItems: 'center',
						position: 'absolute',
						top: -45,
						right: 0,
						zIndex: 1,
					}}>
					<span style={{ fontSize: 12, color: 'text.secondary', marginRight: '20px' }}>
						{(logs.count ?? 0).toLocaleString()} event{(logs.count ?? 0) !== 1 ? 's' : ''}
					</span>
					<ExportButton
						onExport={async () => {
							const result = await trpcUtils.response.exportResponseAuditLogs.fetch({ filters });
							return result;
						}}
						columns={csvColumns}
						filename="user_activity"
						size="sm"
					/>
				</div>
			)}
			<DataTable
				columns={columns}
				headerHeight={0}
				loading={isFetchingLogs}
				rows={logs.rows}
				rowCount={logs.count ?? 0}
				getRowClassName={(row, index) => index % 2 === 0 ? 'striped' : ''}
				hideFooter={!showPagination}
				paginationMode="server"
				paginationModel={constraints}
				onPaginationModelChange={setConstraints}
			/>
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
