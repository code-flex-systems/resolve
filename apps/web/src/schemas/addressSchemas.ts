import { z } from 'zod';
import { COUNTRIES, getCountryNameFromCode } from '@/config/addressConstants';

// Extract valid codes for validation
const COUNTRY_CODES = COUNTRIES.map((c) => c.code) as ['US', 'CA'];

/**
 * Base address schema for structured address fields.
 * All fields are optional/nullable to support partial addresses.
 */
export const addressSchema = z.object({
	street_address: z.string().max(500).nullable().optional(),
	city: z.string().max(100).nullable().optional(),
	state: z.string().max(10).nullable().optional(),
	postal_code: z.string().max(20).nullable().optional(),
	country: z.enum(COUNTRY_CODES).nullable().optional(),
});

export type Address = z.infer<typeof addressSchema>;

/**
 * Address schema with loss_ prefix for claim loss location.
 */
export const lossAddressSchema = z.object({
	loss_street_address: z.string().max(500).nullable().optional(),
	loss_city: z.string().max(100).nullable().optional(),
	loss_state: z.string().max(10).nullable().optional(),
	loss_postal_code: z.string().max(20).nullable().optional(),
	loss_country: z.enum(COUNTRY_CODES).nullable().optional(),
});

export type LossAddress = z.infer<typeof lossAddressSchema>;

// Flexible address type for formatting functions (accepts any string for country)
interface FlexibleAddress {
	street_address?: string | null;
	city?: string | null;
	state?: string | null;
	postal_code?: string | null;
	country?: string | null;
}

/**
 * Format an address for single-line display.
 * Example: "123 Main St, Springfield, IL 62701, US"
 */
export function formatAddressInline(addr: FlexibleAddress | null | undefined): string {
	if (!addr) return '';

	const parts: string[] = [];

	if (addr.street_address) {
		parts.push(addr.street_address);
	}

	// City, State ZIP
	const cityStateZip: string[] = [];
	if (addr.city) {
		cityStateZip.push(addr.city);
	}
	if (addr.state) {
		cityStateZip.push(addr.state);
	}
	if (addr.postal_code) {
		// If we have city/state, append ZIP with space; otherwise just add it
		if (cityStateZip.length > 0) {
			const lastIdx = cityStateZip.length - 1;
			cityStateZip[lastIdx] = `${cityStateZip[lastIdx]} ${addr.postal_code}`;
		} else {
			cityStateZip.push(addr.postal_code);
		}
	}

	if (cityStateZip.length > 0) {
		parts.push(cityStateZip.join(', '));
	}

	if (addr.country) {
		parts.push(addr.country);
	}

	return parts.join(', ');
}

/**
 * Format a loss address for single-line display.
 */
export function formatLossAddressInline(addr: Partial<LossAddress> | null | undefined): string {
	if (!addr) return '';
	return formatAddressInline({
		street_address: addr.loss_street_address,
		city: addr.loss_city,
		state: addr.loss_state,
		postal_code: addr.loss_postal_code,
		country: addr.loss_country,
	});
}

/**
 * Format an address for multi-line display.
 * Returns an array of lines.
 */
export function formatAddressMultiline(addr: FlexibleAddress | null | undefined): string[] {
	if (!addr) return [];

	const lines: string[] = [];

	if (addr.street_address) {
		lines.push(addr.street_address);
	}

	// City, State ZIP
	const cityStateZip: string[] = [];
	if (addr.city) {
		cityStateZip.push(addr.city);
	}
	if (addr.state) {
		cityStateZip.push(addr.state);
	}
	const cityStateLine = cityStateZip.join(', ');
	if (cityStateLine || addr.postal_code) {
		lines.push(addr.postal_code ? `${cityStateLine} ${addr.postal_code}`.trim() : cityStateLine);
	}

	if (addr.country) {
		const countryName = getCountryNameFromCode(addr.country);
		lines.push(countryName || addr.country);
	}

	return lines;
}

/**
 * Format city and state for compact display.
 * Example: "Springfield, IL"
 */
export function formatCityState(
	city: string | null | undefined,
	state: string | null | undefined
): string {
	if (city && state) {
		return `${city}, ${state}`;
	}
	return city || state || '';
}

/**
 * Check if an address has any populated fields.
 */
export function hasAddressData(addr: Partial<Address> | null | undefined): boolean {
	if (!addr) return false;
	return !!(addr.street_address || addr.city || addr.state || addr.postal_code || addr.country);
}

/**
 * Check if a loss address has any populated fields.
 */
export function hasLossAddressData(addr: Partial<LossAddress> | null | undefined): boolean {
	if (!addr) return false;
	return !!(
		addr.loss_street_address ||
		addr.loss_city ||
		addr.loss_state ||
		addr.loss_postal_code ||
		addr.loss_country
	);
}

/**
 * Convert a loss address to a standard address format.
 */
export function lossAddressToAddress(addr: Partial<LossAddress> | null | undefined): Address | null {
	if (!addr) return null;
	return {
		street_address: addr.loss_street_address ?? null,
		city: addr.loss_city ?? null,
		state: addr.loss_state ?? null,
		postal_code: addr.loss_postal_code ?? null,
		country: addr.loss_country ?? null,
	};
}
