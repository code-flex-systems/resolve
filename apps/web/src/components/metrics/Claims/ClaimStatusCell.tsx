import ClaimStatusIcon from '@/components/checklist/ClaimStatusIcon';
import { GridRenderCellParams } from '@mui/x-data-grid-pro';

export default function ClaimStatusCell(props: GridRenderCellParams & { fontSize?: number }) {
	return (
		<div      style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
			<div
				
				
				
				
				
				
				
				
				 style={{ height: 'fit-content', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2px 5px', width: 110 }}
			>
				<ClaimStatusIcon status={props.row.status} fontSize={17} />
				<span    style={{ fontSize: props.fontSize ?? 14, color: 'primary', margin: '0px 5px' }}>
					{props.row.status}
				</span>
			</div>
		</div>
	);
}
