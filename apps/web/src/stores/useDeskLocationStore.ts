import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { DeskLocationList, DeskLocationTypeList } from '@/hooks/trpc/useDeskTrpc';

type DeskLocation = DeskLocationList['rows'][number];
type DeskLocationType = DeskLocationTypeList['rows'][number];

interface DeskLocationState {
	types: DeskLocationType[];
	locations: DeskLocation[];
	typesById: Map<string, DeskLocationType>;
	locationsByType: Map<string, DeskLocation[]>;
	locationsById: Map<string, DeskLocation>;
}

interface DeskLocationActions {
	setTypes: (types: DeskLocationType[]) => void;
	setLocations: (locations: DeskLocation[]) => void;
	getTypeName: (typeId: string | null) => string;
	getLocationName: (locationId: string | null) => string;
	getLocationsByType: (typeId: string | null) => DeskLocation[];
	reset: () => void;
}

type DeskLocationStore = DeskLocationState & DeskLocationActions;

const initialState: DeskLocationState = {
	types: [],
	locations: [],
	typesById: new Map(),
	locationsByType: new Map(),
	locationsById: new Map(),
};

export const useDeskLocationStore = create<DeskLocationStore>()(
	immer((set, get) => ({
		...initialState,

		setTypes: (types) =>
			set((state) => {
				state.types = types;
				state.typesById = new Map(types.map((t) => [t.id, t]));
			}),

		setLocations: (locations) =>
			set((state) => {
				state.locations = locations;
				state.locationsById = new Map(locations.map((l) => [l.id, l]));

				// Group locations by type
				const byType = new Map<string, DeskLocation[]>();
				locations.forEach((loc) => {
					const typeId = loc.desk_location_type_id;
					if (!byType.has(typeId)) {
						byType.set(typeId, []);
					}
					byType.get(typeId)!.push(loc);
				});
				state.locationsByType = byType;
			}),

		getTypeName: (typeId) => {
			if (!typeId) return 'Global';
			const type = get().typesById.get(typeId);
			return type?.name || `Type ${typeId}`;
		},

		getLocationName: (locationId) => {
			if (!locationId) return 'Global';
			const location = get().locationsById.get(locationId);
			return location?.name || `Location ${locationId}`;
		},

		getLocationsByType: (typeId) => {
			if (!typeId) return [];
			return get().locationsByType.get(typeId) || [];
		},

		reset: () => set(initialState),
	}))
);
