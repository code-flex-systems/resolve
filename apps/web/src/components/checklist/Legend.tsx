import Button from '@/components/ui/Button';
import BasicPopper from '../common/BasicPopper';
import { useState } from 'react';
import {
	IconAdjustments,
	IconAlertCircle,
	IconCircle,
	IconCircleCheck,
	IconInfoCircle,
} from '@tabler/icons-react';
import Divider from '@/components/ui/Divider';

export default function Legend() {
	const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
	return (
		<>
			<Button
				variant="icon"
				size="sm"
				color="neutral"
				onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => setAnchorEl(e.currentTarget)}
				onMouseLeave={() => setAnchorEl(null)}
			>
				<IconInfoCircle size={16} />
			</Button>
			<BasicPopper
				anchorEl={anchorEl}
				setAnchorEl={setAnchorEl}
				placement="bottom-start"
				zIndex={1300}
			>
				<div
					style={{
						width: 'fit-content',
						padding: '10px 20px',
						height: 'fit-content',
						marginTop: 5,
						backgroundColor: 'var(--bg-primary)',
						borderRadius: 'var(--radius-lg)',
						boxShadow: 'var(--shadow-md)',
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'flex-start',
					}}
				>
					<div
						style={{
							width: '100%',
							display: 'flex',
							flexDirection: 'column',
							justifyContent: 'flex-start',
							alignItems: 'flex-start',
						}}
					>
						<span style={{ marginBottom: '5px' }}>Legend</span>
						<Divider />
						<div
							style={{ display: 'flex', alignItems: 'center', padding: '2px', marginTop: '10px' }}
						>
							<IconCircle style={{ color: 'var(--text-accent)', marginRight: 10 }} />
							<span style={{ fontSize: 14 }}>The page hasn&apos;t been started yet</span>
						</div>
						<div style={{ display: 'flex', alignItems: 'center', padding: '2px' }}>
							<IconAdjustments style={{ color: 'var(--text-accent)', marginRight: 10 }} />
							<span style={{ fontSize: 14 }}>The page is partially complete</span>
						</div>
						<div style={{ display: 'flex', alignItems: 'center', padding: '2px' }}>
							<IconCircleCheck style={{ color: 'var(--text-accent)', marginRight: 10 }} />
							<span style={{ fontSize: 14 }}>The page is complete</span>
						</div>
						<div style={{ display: 'flex', alignItems: 'center', padding: '2px' }}>
							<IconAlertCircle style={{ color: 'var(--text-accent)', marginRight: 10 }} />
							<span style={{ fontSize: 14 }}>The page has been changed</span>
						</div>
						<div style={{ display: 'flex', alignItems: 'center', padding: '5px 2px 2px' }}>
							<span style={{ fontSize: 14, color: 'var(--status-error)' }}>
								Unanswered questions show in red
							</span>
						</div>
					</div>
				</div>
			</BasicPopper>
		</>
	);
}
