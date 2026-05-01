/**
 * Address constants for US states and Canadian provinces/territories.
 * Includes timezone information for scheduling features.
 */

export interface StateProvince {
	code: string;
	name: string;
	timezone: string;
}

export const US_STATES: StateProvince[] = [
	{ code: 'AL', name: 'Alabama', timezone: 'America/Chicago' },
	{ code: 'AK', name: 'Alaska', timezone: 'America/Anchorage' },
	{ code: 'AZ', name: 'Arizona', timezone: 'America/Phoenix' },
	{ code: 'AR', name: 'Arkansas', timezone: 'America/Chicago' },
	{ code: 'CA', name: 'California', timezone: 'America/Los_Angeles' },
	{ code: 'CO', name: 'Colorado', timezone: 'America/Denver' },
	{ code: 'CT', name: 'Connecticut', timezone: 'America/New_York' },
	{ code: 'DE', name: 'Delaware', timezone: 'America/New_York' },
	{ code: 'DC', name: 'District of Columbia', timezone: 'America/New_York' },
	{ code: 'FL', name: 'Florida', timezone: 'America/New_York' },
	{ code: 'GA', name: 'Georgia', timezone: 'America/New_York' },
	{ code: 'HI', name: 'Hawaii', timezone: 'Pacific/Honolulu' },
	{ code: 'ID', name: 'Idaho', timezone: 'America/Boise' },
	{ code: 'IL', name: 'Illinois', timezone: 'America/Chicago' },
	{ code: 'IN', name: 'Indiana', timezone: 'America/Indiana/Indianapolis' },
	{ code: 'IA', name: 'Iowa', timezone: 'America/Chicago' },
	{ code: 'KS', name: 'Kansas', timezone: 'America/Chicago' },
	{ code: 'KY', name: 'Kentucky', timezone: 'America/New_York' },
	{ code: 'LA', name: 'Louisiana', timezone: 'America/Chicago' },
	{ code: 'ME', name: 'Maine', timezone: 'America/New_York' },
	{ code: 'MD', name: 'Maryland', timezone: 'America/New_York' },
	{ code: 'MA', name: 'Massachusetts', timezone: 'America/New_York' },
	{ code: 'MI', name: 'Michigan', timezone: 'America/Detroit' },
	{ code: 'MN', name: 'Minnesota', timezone: 'America/Chicago' },
	{ code: 'MS', name: 'Mississippi', timezone: 'America/Chicago' },
	{ code: 'MO', name: 'Missouri', timezone: 'America/Chicago' },
	{ code: 'MT', name: 'Montana', timezone: 'America/Denver' },
	{ code: 'NE', name: 'Nebraska', timezone: 'America/Chicago' },
	{ code: 'NV', name: 'Nevada', timezone: 'America/Los_Angeles' },
	{ code: 'NH', name: 'New Hampshire', timezone: 'America/New_York' },
	{ code: 'NJ', name: 'New Jersey', timezone: 'America/New_York' },
	{ code: 'NM', name: 'New Mexico', timezone: 'America/Denver' },
	{ code: 'NY', name: 'New York', timezone: 'America/New_York' },
	{ code: 'NC', name: 'North Carolina', timezone: 'America/New_York' },
	{ code: 'ND', name: 'North Dakota', timezone: 'America/Chicago' },
	{ code: 'OH', name: 'Ohio', timezone: 'America/New_York' },
	{ code: 'OK', name: 'Oklahoma', timezone: 'America/Chicago' },
	{ code: 'OR', name: 'Oregon', timezone: 'America/Los_Angeles' },
	{ code: 'PA', name: 'Pennsylvania', timezone: 'America/New_York' },
	{ code: 'RI', name: 'Rhode Island', timezone: 'America/New_York' },
	{ code: 'SC', name: 'South Carolina', timezone: 'America/New_York' },
	{ code: 'SD', name: 'South Dakota', timezone: 'America/Chicago' },
	{ code: 'TN', name: 'Tennessee', timezone: 'America/Chicago' },
	{ code: 'TX', name: 'Texas', timezone: 'America/Chicago' },
	{ code: 'UT', name: 'Utah', timezone: 'America/Denver' },
	{ code: 'VT', name: 'Vermont', timezone: 'America/New_York' },
	{ code: 'VA', name: 'Virginia', timezone: 'America/New_York' },
	{ code: 'WA', name: 'Washington', timezone: 'America/Los_Angeles' },
	{ code: 'WV', name: 'West Virginia', timezone: 'America/New_York' },
	{ code: 'WI', name: 'Wisconsin', timezone: 'America/Chicago' },
	{ code: 'WY', name: 'Wyoming', timezone: 'America/Denver' },
];

export const CA_PROVINCES: StateProvince[] = [
	{ code: 'AB', name: 'Alberta', timezone: 'America/Edmonton' },
	{ code: 'BC', name: 'British Columbia', timezone: 'America/Vancouver' },
	{ code: 'MB', name: 'Manitoba', timezone: 'America/Winnipeg' },
	{ code: 'NB', name: 'New Brunswick', timezone: 'America/Moncton' },
	{ code: 'NL', name: 'Newfoundland and Labrador', timezone: 'America/St_Johns' },
	{ code: 'NS', name: 'Nova Scotia', timezone: 'America/Halifax' },
	{ code: 'NT', name: 'Northwest Territories', timezone: 'America/Yellowknife' },
	{ code: 'NU', name: 'Nunavut', timezone: 'America/Iqaluit' },
	{ code: 'ON', name: 'Ontario', timezone: 'America/Toronto' },
	{ code: 'PE', name: 'Prince Edward Island', timezone: 'America/Halifax' },
	{ code: 'QC', name: 'Quebec', timezone: 'America/Montreal' },
	{ code: 'SK', name: 'Saskatchewan', timezone: 'America/Regina' },
	{ code: 'YT', name: 'Yukon', timezone: 'America/Whitehorse' },
];

export const COUNTRIES = [
	{ code: 'US', name: 'United States' },
	{ code: 'CA', name: 'Canada' },
] as const;

export type CountryCode = (typeof COUNTRIES)[number]['code'];

/**
 * Get states/provinces for a given country code.
 */
export function getStatesForCountry(
	countryCode: CountryCode | string | null | undefined
): StateProvince[] {
	if (countryCode === 'US') return US_STATES;
	if (countryCode === 'CA') return CA_PROVINCES;
	return [...US_STATES, ...CA_PROVINCES]; // Return all if no country specified
}

/**
 * Get timezone for a state/province code.
 * Returns undefined if state not found.
 */
export function getTimezoneForState(stateCode: string | null | undefined): string | undefined {
	if (!stateCode) return undefined;
	const usState = US_STATES.find((s) => s.code === stateCode);
	if (usState) return usState.timezone;
	const caProvince = CA_PROVINCES.find((p) => p.code === stateCode);
	if (caProvince) return caProvince.timezone;
	return undefined;
}

/**
 * Get state/province name from code.
 */
export function getStateNameFromCode(stateCode: string | null | undefined): string | undefined {
	if (!stateCode) return undefined;
	const usState = US_STATES.find((s) => s.code === stateCode);
	if (usState) return usState.name;
	const caProvince = CA_PROVINCES.find((p) => p.code === stateCode);
	if (caProvince) return caProvince.name;
	return undefined;
}

/**
 * Get country name from code.
 */
export function getCountryNameFromCode(countryCode: string | null | undefined): string | undefined {
	if (!countryCode) return undefined;
	const country = COUNTRIES.find((c) => c.code === countryCode);
	return country?.name;
}

/**
 * Determine country from state/province code.
 */
export function getCountryFromState(stateCode: string | null | undefined): CountryCode | undefined {
	if (!stateCode) return undefined;
	if (US_STATES.some((s) => s.code === stateCode)) return 'US';
	if (CA_PROVINCES.some((p) => p.code === stateCode)) return 'CA';
	return undefined;
}
