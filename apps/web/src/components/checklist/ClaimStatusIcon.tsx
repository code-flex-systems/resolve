'use client';

import { IconCircleCheck, IconCircle, IconPlayerStop } from '@tabler/icons-react';
import { ClaimStatus } from '@/config/enums';
import CheckGradient from '../common/CheckGradient';

export default function ClaimStatusIcon({ status, fontSize = 20 }: { status: ClaimStatus; fontSize?: number }) {
	switch (status) {
		case ClaimStatus.BLOCKED:
			return <IconPlayerStop size={fontSize} style={{ color: 'var(--status-error)' }} />;
		case ClaimStatus.SUBMITTED:
			return <IconCircleCheck size={fontSize} style={{ color: 'var(--status-success)' }} />;
		case ClaimStatus.IN_PROGRESS:
			return <CheckGradient style={{ fontSize }} />;
		case ClaimStatus.UNWORKED:
			return <IconCircle size={fontSize} style={{ color: 'var(--status-error)' }} />;
	}
}
