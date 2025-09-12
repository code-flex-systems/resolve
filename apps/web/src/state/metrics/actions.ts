import { ClaimStatus } from '@/config/enums';
import { SLICES } from '../storeConfig';
import { MetricsSlice } from '../storeTypes';
import { setStateBuilder } from '../storeUtilities';

const setState = setStateBuilder<MetricsSlice>(SLICES.METRICS);

export function setClaimStatus(newStatus: ClaimStatus | null) {
	setState((state) => {
		state.selectedClaimStatus = newStatus;
	});
}
