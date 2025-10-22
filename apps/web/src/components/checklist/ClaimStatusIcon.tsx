'use client';

import CheckCircle from '@mui/icons-material/CheckCircle';
import PanoramaFishEye from '@mui/icons-material/PanoramaFishEye';
import StopCircle from '@mui/icons-material/StopCircle';
import { ClaimStatus } from '@/config/enums';
import theme from '@/styles/theme';
import CheckGradient from '../common/CheckGradient';

export default function ClaimStatusIcon({ status, fontSize = 20 }: { status: ClaimStatus; fontSize?: number }) {
	switch (status) {
		case ClaimStatus.BLOCKED:
			return <StopCircle sx={{ fontSize, color: theme.palette.error.main }} />;
		case ClaimStatus.SUBMITTED:
			return <CheckCircle sx={{ fontSize, color: theme.palette.success.light }} />;
		case ClaimStatus.IN_PROGRESS:
			return <CheckGradient sx={{ fontSize }} />;
		case ClaimStatus.UNWORKED:
			return <PanoramaFishEye sx={{ fontSize, color: theme.palette.error.main }} />;
	}
}
