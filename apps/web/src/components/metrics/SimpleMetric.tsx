'use client';

import { capitalize, formatMetric } from '@/lib/utils/utils';
import Button from '@/components/ui/Button';
import { JSX } from 'react';
import './styles.css';
import Skeleton from '@/components/ui/Skeleton';
import Collapse from '@/components/ui/Collapse';
import Divider from '@/components/ui/Divider';
import { IconCircleArrowRight } from '@tabler/icons-react';

const METRIC_WIDTH = 225;
const METRIC_HEIGHT = 100;

export default function SimpleMetric({
	title,
	onClick,
	onSelect,
	icon,
	color,
	values,
	symbol,
	unit,
	isLoading = false,
	showNegative = false,
	selected = false,
	hasDetail = true,
}: {
	title: string;
	onClick?: () => void;
	onSelect?: () => void;
	icon?: JSX.Element;
	color?: string;
	values?: {
		total: number;
		[x: string]: number;
	};
	symbol?: string;
	unit?: string;
	isLoading?: boolean;
	showNegative?: boolean;
	selected?: boolean;
	hasDetail?: boolean;
}) {
	const formattedMetric = formatMetric(values?.total, { showNegative });
	const textColor = !showNegative && formattedMetric.isNegative ? 'error' : '';
	return (
		<div  className="metric"  style={{ ...styles.container, margin: '10px' }}>
			<div
				onClick={hasDetail ? onSelect : onClick}
				 style={{
					...styles.paper,
					...(selected ? { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 } : {}),
					cursor: onSelect || onClick ? 'pointer' : undefined,
					transition: 'border-radius 300ms ease-out',
					transitionDelay: '100ms',
				}}
			>
				{isLoading ? (
					<Skeleton width={METRIC_WIDTH} height={METRIC_HEIGHT} />
				) : (
					<div
						
						
						
						
						
						 style={{ width: METRIC_WIDTH, height: METRIC_HEIGHT, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 20px' }}
					>
						<div    style={{ position: 'relative', top: -20, right: -140 }}>
							<div  style={{ position: 'absolute', borderRadius: 25 }}>
								<div  style={{ ...styles.circle, backgroundColor: color }}>{icon}</div>
							</div>
						</div>
						<div
							
							
							
							
							
							 style={{ width: '100%', flex: 1, display: 'flex', justifyContent: 'flex-start', alignItems: 'center', paddingTop: '5px' }}
						>
							{symbol && (
								<span    style={{ color: textColor, fontSize: 45, lineHeight: '50px' }}>
									{symbol}
								</span>
							)}
							<div style={{ display: 'flex', flexDirection: 'column' as const }}>
								<div    style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'end' }}>
									<span     style={{ color: textColor, fontSize: 50, lineHeight: '50px', fontWeight: 'bold' }}>
										{formattedMetric.value}
									</span>
									{unit && (
										<span   style={{ color: textColor, fontWeight: 'bold' }}>
											{unit}
										</span>
									)}
								</div>
								<span   style={{ lineHeight: '19px', color: 'var(--text-muted)' }}>
									{title}
								</span>
							</div>
						</div>
					</div>
				)}
			</div>
			{hasDetail && (
				<Collapse open={selected}>
					<div style={styles.expandedPaper}>
						<div   style={{ width: METRIC_WIDTH, padding: '5px 10px' }}>
							{Object.keys(values ?? {})
								.filter((k) => k !== 'total')
								.map((k) => {
									const formattedKeyMetric = formatMetric(values?.[k]);
									return (
										<div
											key={k}
											
											
											
											 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0px 5px 5px' }}
										>
											<span  style={{ fontSize: 14 }}>{capitalize(k)}</span>
											<div
												
												
												
												
												 style={{ ...styles.dot, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
											>
												<span
													
													 style={{ fontSize: 12, color: !showNegative && formattedMetric.isNegative
															? 'error'
															: 'var(--text-secondary)' }}
												>
													{formattedKeyMetric.value}
												</span>
											</div>
										</div>
									);
								})}
							<Divider />
							{onClick && (
								<div     style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', paddingTop: '5px' }}>
									<Button variant="icon" size="sm" onClick={onClick}>
										<IconCircleArrowRight size={21} style={{ color: 'var(--text-secondary)' }} />
									</Button>
								</div>
							)}
						</div>
					</div>
				</Collapse>
			)}
		</div>
	);
}

const styles = {
	circle: {
		width: 50,
		height: 50,
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: '25px',
	},
	container: {
		transition: 'scale 300ms ease',
	},
	dot: {
		minWidth: 40,
		height: 21,
		borderRadius: '5px',
		cursor: 'pointer',
	},
	expandedPaper: {
		bgcolor: '#F0F3F7',
		borderRadius: 3,
		borderTopLeftRadius: 0,
		borderTopRightRadius: 0,
	},
	paper: {
		borderRadius: 3,
		width: 'fit-content',
	},
	skeleton: {
		borderRadius: 3,
	},
};
