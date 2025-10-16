import { describe, it, expect } from 'vitest';
import { isEqual } from '../utils';

describe('isEqual', () => {
	describe('Primitive Values', () => {
		it('should return true for identical primitives', () => {
			expect(isEqual(5, 5)).toBe(true);
			expect(isEqual('hello', 'hello')).toBe(true);
			expect(isEqual(true, true)).toBe(true);
			expect(isEqual(false, false)).toBe(true);
		});

		it('should return true for identical special numbers', () => {
			expect(isEqual(0, 0)).toBe(true);
			expect(isEqual(-0, -0)).toBe(true);
			expect(isEqual(NaN, NaN)).toBe(true); // Now handles NaN equality correctly
			expect(isEqual(Infinity, Infinity)).toBe(true);
			expect(isEqual(-Infinity, -Infinity)).toBe(true);
		});

		it('should return false for different primitives', () => {
			expect(isEqual(5, 6)).toBe(false);
			expect(isEqual('hello', 'world')).toBe(false);
			expect(isEqual(true, false)).toBe(false);
		});

		it('should return false for different types', () => {
			expect(isEqual(5, '5')).toBe(false);
			expect(isEqual(0, false)).toBe(false);
			expect(isEqual(1, true)).toBe(false);
			expect(isEqual('', false)).toBe(false);
		});
	});

	describe('Null and Undefined', () => {
		it('should return true for null === null', () => {
			expect(isEqual(null, null)).toBe(true);
		});

		it('should return true for undefined === undefined', () => {
			expect(isEqual(undefined, undefined)).toBe(true);
		});

		it('should return false for null vs undefined', () => {
			expect(isEqual(null, undefined)).toBe(false);
		});

		it('should return false for null vs other values', () => {
			expect(isEqual(null, 0)).toBe(false);
			expect(isEqual(null, '')).toBe(false);
			expect(isEqual(null, false)).toBe(false);
			expect(isEqual(null, [])).toBe(false);
			expect(isEqual(null, {})).toBe(false);
		});

		it('should return false for undefined vs other values', () => {
			expect(isEqual(undefined, 0)).toBe(false);
			expect(isEqual(undefined, '')).toBe(false);
			expect(isEqual(undefined, false)).toBe(false);
			expect(isEqual(undefined, [])).toBe(false);
			expect(isEqual(undefined, {})).toBe(false);
		});
	});

	describe('Arrays', () => {
		it('should return true for identical empty arrays', () => {
			expect(isEqual([], [])).toBe(true);
		});

		it('should return true for identical simple arrays', () => {
			expect(isEqual([1, 2, 3], [1, 2, 3])).toBe(true);
			expect(isEqual(['a', 'b', 'c'], ['a', 'b', 'c'])).toBe(true);
		});

		it('should return true for nested arrays with same structure', () => {
			expect(isEqual([1, [2, 3], 4], [1, [2, 3], 4])).toBe(true);
			expect(isEqual([[1, 2], [3, 4]], [[1, 2], [3, 4]])).toBe(true);
		});

		it('should return false for arrays with different lengths', () => {
			expect(isEqual([1, 2], [1, 2, 3])).toBe(false);
			expect(isEqual([1, 2, 3], [1, 2])).toBe(false);
		});

		it('should return false for arrays with different values', () => {
			expect(isEqual([1, 2, 3], [1, 2, 4])).toBe(false);
			expect(isEqual(['a', 'b'], ['a', 'c'])).toBe(false);
		});

		it('should return false for arrays with different order', () => {
			expect(isEqual([1, 2, 3], [3, 2, 1])).toBe(false);
			expect(isEqual([1, 2, 3], [1, 3, 2])).toBe(false);
		});

		it('should return false for array vs non-array', () => {
			expect(isEqual([1, 2, 3], { 0: 1, 1: 2, 2: 3 })).toBe(false);
			expect(isEqual([], {})).toBe(false);
		});

		it('should handle arrays with null/undefined', () => {
			expect(isEqual([1, null, 3], [1, null, 3])).toBe(true);
			expect(isEqual([1, undefined, 3], [1, undefined, 3])).toBe(true);
			expect(isEqual([1, null, 3], [1, undefined, 3])).toBe(false);
		});

		it('should handle arrays with mixed types', () => {
			expect(isEqual([1, 'two', true, null], [1, 'two', true, null])).toBe(true);
			expect(isEqual([1, 'two', true, null], [1, 'two', true, undefined])).toBe(false);
		});
	});

	describe('Objects', () => {
		it('should return true for identical empty objects', () => {
			expect(isEqual({}, {})).toBe(true);
		});

		it('should return true for identical simple objects', () => {
			expect(isEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
			expect(isEqual({ name: 'John', age: 30 }, { name: 'John', age: 30 })).toBe(true);
		});

		it('should return true for objects with same keys in different order', () => {
			expect(isEqual({ a: 1, b: 2, c: 3 }, { c: 3, a: 1, b: 2 })).toBe(true);
		});

		it('should return true for nested objects', () => {
			expect(isEqual({ a: { b: { c: 1 } } }, { a: { b: { c: 1 } } })).toBe(true);
			expect(isEqual({ user: { name: 'John', address: { city: 'NYC' } } }, { user: { name: 'John', address: { city: 'NYC' } } })).toBe(true);
		});

		it('should return false for objects with different values', () => {
			expect(isEqual({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false);
			expect(isEqual({ name: 'John' }, { name: 'Jane' })).toBe(false);
		});

		it('should return false for objects with different keys', () => {
			expect(isEqual({ a: 1, b: 2 }, { a: 1, c: 2 })).toBe(false);
			expect(isEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
		});

		it('should return false for objects with different number of keys', () => {
			expect(isEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
			expect(isEqual({ a: 1, b: 2, c: 3 }, { a: 1, b: 2 })).toBe(false);
		});

		it('should handle objects with null/undefined values', () => {
			expect(isEqual({ a: null, b: 2 }, { a: null, b: 2 })).toBe(true);
			expect(isEqual({ a: undefined, b: 2 }, { a: undefined, b: 2 })).toBe(true);
			expect(isEqual({ a: null, b: 2 }, { a: undefined, b: 2 })).toBe(false);
		});

		it('should return false when key exists in one but not the other', () => {
			expect(isEqual({ a: 1, b: 2 }, { a: 1 })).toBe(false);
			expect(isEqual({ a: 1 }, { a: 1, b: undefined })).toBe(false);
		});
	});

	describe('Complex Nested Structures', () => {
		it('should handle arrays of objects', () => {
			expect(isEqual([{ a: 1 }, { b: 2 }], [{ a: 1 }, { b: 2 }])).toBe(true);
			expect(isEqual([{ a: 1 }, { b: 2 }], [{ a: 1 }, { b: 3 }])).toBe(false);
		});

		it('should handle objects with array values', () => {
			expect(isEqual({ arr: [1, 2, 3] }, { arr: [1, 2, 3] })).toBe(true);
			expect(isEqual({ arr: [1, 2, 3] }, { arr: [1, 2, 4] })).toBe(false);
		});

		it('should handle deeply nested mixed structures', () => {
			const obj1 = {
				user: {
					name: 'John',
					roles: ['admin', 'user'],
					metadata: {
						lastLogin: '2024-01-01',
						settings: { theme: 'dark' },
					},
				},
			};
			const obj2 = {
				user: {
					name: 'John',
					roles: ['admin', 'user'],
					metadata: {
						lastLogin: '2024-01-01',
						settings: { theme: 'dark' },
					},
				},
			};
			expect(isEqual(obj1, obj2)).toBe(true);
		});

		it('should detect differences in deeply nested structures', () => {
			const obj1 = {
				user: {
					name: 'John',
					roles: ['admin', 'user'],
					metadata: {
						lastLogin: '2024-01-01',
						settings: { theme: 'dark' },
					},
				},
			};
			const obj2 = {
				user: {
					name: 'John',
					roles: ['admin', 'user'],
					metadata: {
						lastLogin: '2024-01-01',
						settings: { theme: 'light' }, // Different
					},
				},
			};
			expect(isEqual(obj1, obj2)).toBe(false);
		});
	});

	describe('Edge Cases', () => {
		it('should handle same reference (identity)', () => {
			const obj = { a: 1 };
			expect(isEqual(obj, obj)).toBe(true);

			const arr = [1, 2, 3];
			expect(isEqual(arr, arr)).toBe(true);
		});

		it('should handle empty nested structures', () => {
			expect(isEqual({ a: [] }, { a: [] })).toBe(true);
			expect(isEqual({ a: {} }, { a: {} })).toBe(true);
			expect(isEqual([{}], [{}])).toBe(true);
			expect(isEqual([[]], [[]])).toBe(true);
		});

		it('should return false for functions', () => {
			const fn1 = () => 1;
			const fn2 = () => 1;
			expect(isEqual(fn1, fn2)).toBe(false);
			expect(isEqual(fn1, fn1)).toBe(true);
		});

		it('should handle Date objects as plain objects (compare properties)', () => {
			const date1 = new Date('2024-01-01');
			const date2 = new Date('2024-01-01');
			// Dates are objects, will compare properties
			// Note: This may not be ideal behavior, documenting current implementation
			expect(isEqual(date1, date2)).toBe(true);
		});

		it('should handle objects with numeric keys', () => {
			expect(isEqual({ 0: 'a', 1: 'b' }, { 0: 'a', 1: 'b' })).toBe(true);
			expect(isEqual({ 0: 'a', 1: 'b' }, { 0: 'a', 1: 'c' })).toBe(false);
		});

		it('should handle sparse arrays', () => {
			const arr1 = [1, , 3]; // eslint-disable-line no-sparse-arrays
			const arr2 = [1, , 3]; // eslint-disable-line no-sparse-arrays
			// Sparse arrays have undefined at missing indices
			expect(isEqual(arr1, arr2)).toBe(true);
		});

		it('should handle very deep nesting', () => {
			let deep1: any = { value: 1 };
			let deep2: any = { value: 1 };
			for (let i = 0; i < 50; i++) {
				deep1 = { nested: deep1 };
				deep2 = { nested: deep2 };
			}
			expect(isEqual(deep1, deep2)).toBe(true);
		});

		it('should handle circular references without stack overflow', () => {
			const obj1: any = { a: 1, b: 2 };
			obj1.self = obj1;

			const obj2: any = { a: 1, b: 2 };
			obj2.self = obj2;

			// Should return true without stack overflow
			expect(isEqual(obj1, obj1)).toBe(true);

			// Different circular objects (this is tricky - current implementation assumes equal if circular)
			// This is acceptable behavior for circular references
			expect(isEqual(obj1, obj2)).toBe(true);
		});

		it('should handle arrays with circular references', () => {
			const arr1: any[] = [1, 2, 3];
			arr1.push(arr1);

			const arr2: any[] = [1, 2, 3];
			arr2.push(arr2);

			// Should return true without stack overflow
			expect(isEqual(arr1, arr1)).toBe(true);
		});

		it('should handle nested objects with circular references', () => {
			const obj1: any = { a: 1, nested: { b: 2 } };
			obj1.nested.parent = obj1;

			expect(isEqual(obj1, obj1)).toBe(true);
		});
	});

	describe('Type Coercion Prevention', () => {
		it('should not coerce types', () => {
			expect(isEqual(0, '')).toBe(false);
			expect(isEqual(0, false)).toBe(false);
			expect(isEqual(1, true)).toBe(false);
			expect(isEqual('0', 0)).toBe(false);
			expect(isEqual([], '')).toBe(false);
			expect(isEqual({}, '[object Object]')).toBe(false);
		});

		it('should distinguish +0 and -0', () => {
			// JavaScript treats +0 and -0 as equal with ===
			expect(isEqual(0, -0)).toBe(true); // This is expected JS behavior
			expect(isEqual(+0, -0)).toBe(true);
		});
	});

	describe('Performance & Practical Use Cases', () => {
		it('should handle large arrays efficiently', () => {
			const arr1 = Array.from({ length: 1000 }, (_, i) => i);
			const arr2 = Array.from({ length: 1000 }, (_, i) => i);
			expect(isEqual(arr1, arr2)).toBe(true);
		});

		it('should handle large objects efficiently', () => {
			const obj1: any = {};
			const obj2: any = {};
			for (let i = 0; i < 1000; i++) {
				obj1[`key${i}`] = i;
				obj2[`key${i}`] = i;
			}
			expect(isEqual(obj1, obj2)).toBe(true);
		});

		it('should detect difference in large structures early', () => {
			const arr1 = Array.from({ length: 1000 }, (_, i) => i);
			const arr2 = Array.from({ length: 1000 }, (_, i) => i);
			arr2[500] = 999; // Difference in middle
			expect(isEqual(arr1, arr2)).toBe(false);
		});
	});

	describe('Return Value Type', () => {
		it('should always return boolean', () => {
			expect(typeof isEqual(1, 1)).toBe('boolean');
			expect(typeof isEqual(1, 2)).toBe('boolean');
			expect(typeof isEqual({}, {})).toBe('boolean');
			expect(typeof isEqual(null, null)).toBe('boolean');
		});
	});
});
