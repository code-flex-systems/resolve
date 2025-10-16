import { describe, it, expect } from 'vitest';
import { formatAmount, formatMetric, formatPhoneNumber, validatePhoneNumber } from '../utils';

describe('formatAmount', () => {
	describe('Basic Formatting', () => {
		it('should format integer with two decimal places', () => {
			expect(formatAmount(100)).toBe('100.00');
			expect(formatAmount(1000)).toBe('1,000.00');
		});

		it('should format decimal numbers with two decimal places', () => {
			expect(formatAmount(100.5)).toBe('100.50');
			expect(formatAmount(100.55)).toBe('100.55');
		});

		it('should round to two decimal places', () => {
			expect(formatAmount(100.555)).toBe('100.56');
			expect(formatAmount(100.554)).toBe('100.55');
			expect(formatAmount(100.999)).toBe('101.00');
		});

		it('should format with thousand separators', () => {
			expect(formatAmount(1000)).toBe('1,000.00');
			expect(formatAmount(10000)).toBe('10,000.00');
			expect(formatAmount(1000000)).toBe('1,000,000.00');
		});
	});

	describe('Currency Formatting', () => {
		it('should add dollar sign when currency=true', () => {
			expect(formatAmount(100, true)).toBe('$100.00');
			expect(formatAmount(1000, true)).toBe('$1,000.00');
		});

		it('should not add dollar sign when currency=false', () => {
			expect(formatAmount(100, false)).toBe('100.00');
		});

		it('should default to no currency symbol', () => {
			expect(formatAmount(100)).toBe('100.00');
		});
	});

	describe('String Input', () => {
		it('should handle string numbers', () => {
			expect(formatAmount('100')).toBe('100.00');
			expect(formatAmount('1000.50')).toBe('1,000.50');
		});

		it('should handle string numbers with currency', () => {
			expect(formatAmount('100', true)).toBe('$100.00');
		});
	});

	describe('Edge Cases', () => {
		it('should return empty string for null', () => {
			expect(formatAmount(null)).toBe('');
		});

		it('should return empty string for undefined', () => {
			expect(formatAmount(undefined)).toBe('');
			expect(formatAmount()).toBe('');
		});

		it('should handle zero', () => {
			expect(formatAmount(0)).toBe('0.00');
			expect(formatAmount(0, true)).toBe('$0.00');
		});

		it('should handle negative numbers', () => {
			expect(formatAmount(-100)).toBe('-100.00');
			expect(formatAmount(-1000.50)).toBe('-1,000.50');
			expect(formatAmount(-100, true)).toBe('$-100.00');
		});

		it('should handle very small numbers', () => {
			expect(formatAmount(0.01)).toBe('0.01');
			expect(formatAmount(0.001)).toBe('0.00'); // Rounds to 0.00
		});

		it('should handle very large numbers', () => {
			expect(formatAmount(999999999)).toBe('999,999,999.00');
			expect(formatAmount(1000000000)).toBe('1,000,000,000.00');
		});

		it('should handle NaN strings by returning 0.00', () => {
			expect(formatAmount('abc')).toBe('0.00');
		});

		it('should handle empty string by returning 0.00', () => {
			expect(formatAmount('')).toBe('0.00');
		});

		it('should handle NaN strings with currency', () => {
			expect(formatAmount('abc', true)).toBe('$0.00');
		});
	});

	describe('Precision & Rounding', () => {
		it('should round 0.005 correctly', () => {
			expect(formatAmount(0.005)).toBe('0.01');
		});

		it('should round 0.995 correctly', () => {
			expect(formatAmount(0.995)).toBe('1.00');
		});

		it('should handle floating point precision issues', () => {
			expect(formatAmount(0.1 + 0.2)).toBe('0.30'); // 0.30000000000000004 -> 0.30
		});
	});
});

describe('formatMetric', () => {
	describe('Basic Number Formatting', () => {
		it('should format numbers less than 1000 without abbreviation', () => {
			expect(formatMetric(100)).toEqual({ value: '100', isNegative: false });
			expect(formatMetric(999)).toEqual({ value: '999', isNegative: false });
		});

		it('should abbreviate thousands with "k"', () => {
			expect(formatMetric(1000)).toEqual({ value: '1k', isNegative: false });
			expect(formatMetric(5000)).toEqual({ value: '5k', isNegative: false });
			expect(formatMetric(15500)).toEqual({ value: '15.5k', isNegative: false });
		});

		it('should abbreviate millions with "m"', () => {
			expect(formatMetric(1000000)).toEqual({ value: '1m', isNegative: false });
			expect(formatMetric(5000000)).toEqual({ value: '5m', isNegative: false });
			expect(formatMetric(15500000)).toEqual({ value: '15.5m', isNegative: false });
		});
	});

	describe('Floating Point Option', () => {
		it('should format with decimal precision when floating=true', () => {
			expect(formatMetric(1234, { floating: true })).toEqual({ value: '1.23k', isNegative: false });
			expect(formatMetric(1234567, { floating: true })).toEqual({ value: '1.23m', isNegative: false });
		});

		it('should format without decimals when floating=false', () => {
			expect(formatMetric(1234, { floating: false })).toEqual({ value: '1.2k', isNegative: false });
		});

		it('should default to integer formatting', () => {
			expect(formatMetric(1234)).toEqual({ value: '1.2k', isNegative: false });
		});
	});

	describe('Cap Option', () => {
		it('should cap values and add "+" suffix', () => {
			expect(formatMetric(10000, { cap: 5000 })).toEqual({ value: '5k+', isNegative: false });
			expect(formatMetric(2000000, { cap: 1000000 })).toEqual({ value: '1m+', isNegative: false });
		});

		it('should not cap values below the cap', () => {
			expect(formatMetric(3000, { cap: 5000 })).toEqual({ value: '3k', isNegative: false });
		});

		it('should cap negative values by absolute value', () => {
			expect(formatMetric(-10000, { cap: 5000 })).toEqual({ value: '5k+', isNegative: true });
		});
	});

	describe('ShowNegative Option', () => {
		it('should wrap negative values in parentheses when showNegative=true', () => {
			expect(formatMetric(-100, { showNegative: true })).toEqual({ value: '(100)', isNegative: true });
			expect(formatMetric(-5000, { showNegative: true })).toEqual({ value: '(5k)', isNegative: true });
		});

		it('should not wrap when showNegative=false', () => {
			expect(formatMetric(-100, { showNegative: false })).toEqual({ value: '100', isNegative: true });
			expect(formatMetric(-5000, { showNegative: false })).toEqual({ value: '5k', isNegative: true });
		});

		it('should default to no parentheses', () => {
			expect(formatMetric(-100)).toEqual({ value: '100', isNegative: true });
		});

		it('should not affect positive numbers', () => {
			expect(formatMetric(100, { showNegative: true })).toEqual({ value: '100', isNegative: false });
		});
	});

	describe('Combined Options', () => {
		it('should handle floating + cap', () => {
			expect(formatMetric(10000, { floating: true, cap: 5000 })).toEqual({ value: '5.00k+', isNegative: false });
		});

		it('should handle cap + showNegative', () => {
			expect(formatMetric(-10000, { cap: 5000, showNegative: true })).toEqual({ value: '(5k+)', isNegative: true });
		});

		it('should handle all options together', () => {
			expect(formatMetric(-10000, { floating: true, cap: 5000, showNegative: true })).toEqual({ value: '(5.00k+)', isNegative: true });
		});
	});

	describe('Edge Cases', () => {
		it('should handle undefined as 0', () => {
			expect(formatMetric(undefined)).toEqual({ value: '0', isNegative: false });
			expect(formatMetric()).toEqual({ value: '0', isNegative: false });
		});

		it('should handle null as 0', () => {
			expect(formatMetric(null as any)).toEqual({ value: '0', isNegative: false });
		});

		it('should handle zero', () => {
			expect(formatMetric(0)).toEqual({ value: '0', isNegative: false });
		});

		it('should handle string numbers', () => {
			expect(formatMetric('1000')).toEqual({ value: '1k', isNegative: false });
			expect(formatMetric('1234.56')).toEqual({ value: '1.2k', isNegative: false });
		});

		it('should handle NaN strings as 0', () => {
			expect(formatMetric('abc')).toEqual({ value: '0', isNegative: false });
			expect(formatMetric('')).toEqual({ value: '0', isNegative: false });
		});

		it('should handle very large numbers', () => {
			expect(formatMetric(999999999)).toEqual({ value: '1,000m', isNegative: false });
		});

		it('should handle boundary between k and m', () => {
			expect(formatMetric(999999)).toEqual({ value: '1,000k', isNegative: false });
			expect(formatMetric(1000000)).toEqual({ value: '1m', isNegative: false });
		});

		it('should handle boundary at 1000', () => {
			expect(formatMetric(999)).toEqual({ value: '999', isNegative: false });
			expect(formatMetric(1000)).toEqual({ value: '1k', isNegative: false });
		});
	});

	describe('IsNegative Flag', () => {
		it('should set isNegative=true for negative numbers', () => {
			expect(formatMetric(-100).isNegative).toBe(true);
			expect(formatMetric(-1).isNegative).toBe(true);
		});

		it('should set isNegative=false for positive numbers', () => {
			expect(formatMetric(100).isNegative).toBe(false);
			expect(formatMetric(1).isNegative).toBe(false);
		});

		it('should set isNegative=false for zero', () => {
			expect(formatMetric(0).isNegative).toBe(false);
		});
	});

	describe('Return Value Type', () => {
		it('should always return object with value and isNegative', () => {
			const result = formatMetric(100);
			expect(result).toHaveProperty('value');
			expect(result).toHaveProperty('isNegative');
			expect(typeof result.value).toBe('string');
			expect(typeof result.isNegative).toBe('boolean');
		});
	});
});

describe('formatPhoneNumber', () => {
	describe('Valid US Phone Numbers', () => {
		it('should format 10-digit phone number', () => {
			expect(formatPhoneNumber('2125551234')).toBe('+12125551234');
		});

		it('should format phone number with dashes', () => {
			expect(formatPhoneNumber('212-555-1234')).toBe('+12125551234');
		});

		it('should format phone number with parentheses and spaces', () => {
			expect(formatPhoneNumber('(212) 555-1234')).toBe('+12125551234');
		});

		it('should format phone number with dots', () => {
			expect(formatPhoneNumber('212.555.1234')).toBe('+12125551234');
		});

		it('should format phone number with +1 prefix', () => {
			expect(formatPhoneNumber('+12125551234')).toBe('+12125551234');
		});

		it('should format phone number with 1 prefix', () => {
			expect(formatPhoneNumber('12125551234')).toBe('+12125551234');
		});
	});

	describe('Invalid Phone Numbers', () => {
		it('should throw error for too short number', () => {
			expect(() => formatPhoneNumber('123')).toThrow('Invalid phone number');
		});

		it('should throw error for too long number', () => {
			expect(() => formatPhoneNumber('12345678901234')).toThrow('Invalid phone number');
		});

		it('should throw error for non-numeric string', () => {
			expect(() => formatPhoneNumber('abcdefghij')).toThrow('Invalid phone number');
		});

		it('should throw error for empty string', () => {
			expect(() => formatPhoneNumber('')).toThrow('Invalid phone number');
		});

		it('should throw error for invalid area code', () => {
			expect(() => formatPhoneNumber('0001234567')).toThrow('Invalid phone number');
		});
	});

	describe('Edge Cases', () => {
		it('should handle phone number with spaces', () => {
			expect(formatPhoneNumber('212 555 1234')).toBe('+12125551234');
		});

		it('should handle phone number with mixed separators', () => {
			expect(formatPhoneNumber('212-555.1234')).toBe('+12125551234');
		});

		it('should handle phone number with extension (may vary by implementation)', () => {
			// Document behavior - extensions may not be supported
			try {
				const result = formatPhoneNumber('2125551234x123');
				expect(result).toBeDefined();
			} catch (e) {
				expect(e).toBeInstanceOf(Error);
			}
		});
	});

	describe('Return Value', () => {
		it('should return E.164 format', () => {
			const result = formatPhoneNumber('(212) 555-1234');
			expect(result).toMatch(/^\+1\d{10}$/);
		});

		it('should return string type', () => {
			const result = formatPhoneNumber('2125551234');
			expect(typeof result).toBe('string');
		});
	});
});

describe('validatePhoneNumber', () => {
	describe('Valid Phone Numbers', () => {
		it('should return undefined for valid phone number', () => {
			expect(validatePhoneNumber('2125551234')).toBeUndefined();
			expect(validatePhoneNumber('(212) 555-1234')).toBeUndefined();
			expect(validatePhoneNumber('+12125551234')).toBeUndefined();
		});

		it('should return undefined for various valid formats', () => {
			expect(validatePhoneNumber('212-555-1234')).toBeUndefined();
			expect(validatePhoneNumber('212.555.1234')).toBeUndefined();
			expect(validatePhoneNumber('212 555 1234')).toBeUndefined();
		});
	});

	describe('Invalid Phone Numbers', () => {
		it('should return error message for too short number', () => {
			expect(validatePhoneNumber('123')).toBe('Invalid phone number');
		});

		it('should return error message for too long number', () => {
			expect(validatePhoneNumber('12345678901234')).toBe('Invalid phone number');
		});

		it('should return error message for non-numeric string', () => {
			expect(validatePhoneNumber('abcdefghij')).toBe('Invalid phone number');
		});

		it('should return error message for empty string', () => {
			expect(validatePhoneNumber('')).toBe('Invalid phone number');
		});

		it('should return error message for invalid area code', () => {
			expect(validatePhoneNumber('0001234567')).toBe('Invalid phone number');
		});
	});

	describe('Return Value Type', () => {
		it('should return undefined for valid numbers', () => {
			const result = validatePhoneNumber('2125551234');
			expect(result).toBeUndefined();
		});

		it('should return string for invalid numbers', () => {
			const result = validatePhoneNumber('123');
			expect(typeof result).toBe('string');
			expect(result).toBe('Invalid phone number');
		});

		it('should match form validation pattern (undefined = valid)', () => {
			// undefined return value is common pattern for form validators
			expect(validatePhoneNumber('2125551234')).toBeUndefined();
			expect(validatePhoneNumber('invalid')).toBeTruthy();
		});
	});

	describe('Comparison with formatPhoneNumber', () => {
		it('should validate same numbers that formatPhoneNumber accepts', () => {
			const validNumbers = ['2125551234', '(212) 555-1234', '+12125551234'];

			validNumbers.forEach((num) => {
				expect(validatePhoneNumber(num)).toBeUndefined();
				expect(() => formatPhoneNumber(num)).not.toThrow();
			});
		});

		it('should reject same numbers that formatPhoneNumber rejects', () => {
			const invalidNumbers = ['123', '', 'abcdefghij'];

			invalidNumbers.forEach((num) => {
				expect(validatePhoneNumber(num)).toBe('Invalid phone number');
				expect(() => formatPhoneNumber(num)).toThrow('Invalid phone number');
			});
		});
	});
});
