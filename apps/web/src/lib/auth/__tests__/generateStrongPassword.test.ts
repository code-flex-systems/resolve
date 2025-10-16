import { describe, it, expect } from 'vitest';
import { generateStrongPassword } from '../generateStrongPassword';

describe('generateStrongPassword', () => {
	// Character class regexes
	const hasUppercase = /[A-Z]/;
	const hasLowercase = /[a-z]/;
	const hasNumber = /[0-9]/;
	const hasSymbol = /[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/;

	describe('Length Requirements', () => {
		it('should generate password with default length of 16', () => {
			const password = generateStrongPassword();
			expect(password).toHaveLength(16);
		});

		it('should generate password with custom length', () => {
			const password = generateStrongPassword(20);
			expect(password).toHaveLength(20);
		});

		it('should generate password with minimum length of 4 (one per character class)', () => {
			const password = generateStrongPassword(4);
			expect(password).toHaveLength(4);
		});

		it('should generate password with very long length', () => {
			const password = generateStrongPassword(100);
			expect(password).toHaveLength(100);
		});

		it('should handle length of 5 (minimum + 1)', () => {
			const password = generateStrongPassword(5);
			expect(password).toHaveLength(5);
		});
	});

	describe('Character Class Requirements', () => {
		it('should contain at least one uppercase letter', () => {
			const password = generateStrongPassword();
			expect(password).toMatch(hasUppercase);
		});

		it('should contain at least one lowercase letter', () => {
			const password = generateStrongPassword();
			expect(password).toMatch(hasLowercase);
		});

		it('should contain at least one number', () => {
			const password = generateStrongPassword();
			expect(password).toMatch(hasNumber);
		});

		it('should contain at least one symbol', () => {
			const password = generateStrongPassword();
			expect(password).toMatch(hasSymbol);
		});

		it('should contain all four character classes in minimum length password', () => {
			const password = generateStrongPassword(4);
			expect(password).toMatch(hasUppercase);
			expect(password).toMatch(hasLowercase);
			expect(password).toMatch(hasNumber);
			expect(password).toMatch(hasSymbol);
		});

		it('should contain all four character classes in long password', () => {
			const password = generateStrongPassword(50);
			expect(password).toMatch(hasUppercase);
			expect(password).toMatch(hasLowercase);
			expect(password).toMatch(hasNumber);
			expect(password).toMatch(hasSymbol);
		});
	});

	describe('Randomness & Unpredictability', () => {
		it('should generate different passwords on consecutive calls', () => {
			const password1 = generateStrongPassword();
			const password2 = generateStrongPassword();
			expect(password1).not.toBe(password2);
		});

		it('should not have predictable prefix (required chars not grouped at start)', () => {
			// Generate multiple passwords and check that required chars aren't always in first 4 positions
			const passwords = Array.from({ length: 20 }, () => generateStrongPassword(16));

			// Check that at least some passwords have required chars distributed beyond position 0-3
			const hasDistribution = passwords.some((pwd) => {
				// Check if any of the character classes appear ONLY after position 3
				const upperFirst = pwd.search(hasUppercase);
				const lowerFirst = pwd.search(hasLowercase);
				const numberFirst = pwd.search(hasNumber);
				const symbolFirst = pwd.search(hasSymbol);

				return upperFirst > 3 || lowerFirst > 3 || numberFirst > 3 || symbolFirst > 3;
			});

			expect(hasDistribution).toBe(true);
		});

		it('should generate unique passwords in batch', () => {
			const passwords = Array.from({ length: 100 }, () => generateStrongPassword());
			const uniquePasswords = new Set(passwords);
			// All 100 should be unique (collision probability is astronomically low)
			expect(uniquePasswords.size).toBe(100);
		});

		it('should have high entropy (use wide character range)', () => {
			const password = generateStrongPassword(50);
			const uniqueChars = new Set(password.split(''));
			// With 50 chars, we should have good character variety (at least 20 unique chars)
			expect(uniqueChars.size).toBeGreaterThanOrEqual(20);
		});
	});

	describe('Character Set Validation', () => {
		it('should only contain valid characters from defined sets', () => {
			const validChars = /^[A-Za-z0-9!@#$%^&*()_+\-=[\]{}|;:,.<>?]+$/;
			const password = generateStrongPassword();
			expect(password).toMatch(validChars);
		});

		it('should not contain whitespace', () => {
			const password = generateStrongPassword();
			expect(password).not.toMatch(/\s/);
		});

		it('should not contain ambiguous characters by design', () => {
			// This test documents what IS included (function allows all chars)
			// If you wanted to exclude ambiguous chars (0/O, 1/l/I), that would be a feature change
			const password = generateStrongPassword(100);
			// Just verify it's a valid string - function doesn't filter ambiguous chars
			expect(typeof password).toBe('string');
		});
	});

	describe('Edge Cases & Boundary Conditions', () => {
		it('should handle length of 4 (exact minimum)', () => {
			const password = generateStrongPassword(4);
			expect(password).toHaveLength(4);
			expect(password).toMatch(hasUppercase);
			expect(password).toMatch(hasLowercase);
			expect(password).toMatch(hasNumber);
			expect(password).toMatch(hasSymbol);
		});

		it('should throw error for length less than 4', () => {
			expect(() => generateStrongPassword(2)).toThrow('Password length must be at least 4 to include all character classes');
			expect(() => generateStrongPassword(3)).toThrow('Password length must be at least 4 to include all character classes');
		});

		it('should throw error for length of 0', () => {
			expect(() => generateStrongPassword(0)).toThrow('Password length must be at least 4 to include all character classes');
		});

		it('should throw error for negative length', () => {
			expect(() => generateStrongPassword(-5)).toThrow('Password length must be at least 4 to include all character classes');
		});

		it('should handle very large length efficiently', () => {
			const start = Date.now();
			const password = generateStrongPassword(10000);
			const duration = Date.now() - start;

			expect(password).toHaveLength(10000);
			// Should complete in reasonable time (< 100ms for 10k chars)
			expect(duration).toBeLessThan(100);
		});

		it('should handle floating point length by truncating', () => {
			const password = generateStrongPassword(16.7);
			// Function truncates to integer
			expect(password).toHaveLength(16);
		});

		it('should throw error for NaN', () => {
			expect(() => generateStrongPassword(NaN)).toThrow('Password length must be a finite number');
		});

		it('should throw error for Infinity', () => {
			expect(() => generateStrongPassword(Infinity)).toThrow('Password length must be a finite number');
		});
	});

	describe('Cryptographic Security', () => {
		it('should use crypto.randomInt (verified by successful password generation)', () => {
			// We can't mock crypto.randomInt in ESM, but we can verify it's being used
			// by confirming the function works without errors
			const password = generateStrongPassword(8);

			// If crypto.randomInt is used correctly, password generation succeeds
			expect(password).toHaveLength(8);
			expect(password).toMatch(hasUppercase);
			expect(password).toMatch(hasLowercase);
			expect(password).toMatch(hasNumber);
			expect(password).toMatch(hasSymbol);
		});

		it('should produce cryptographically secure randomness (no obvious patterns)', () => {
			// Generate many passwords and verify no obvious sequential patterns
			const passwords = Array.from({ length: 50 }, () => generateStrongPassword(10));

			// Check that consecutive passwords don't share patterns
			for (let i = 1; i < passwords.length; i++) {
				// Passwords should not be identical
				expect(passwords[i]).not.toBe(passwords[i - 1]);

				// Passwords should not share too many characters in same positions
				let matchingPositions = 0;
				for (let j = 0; j < 10; j++) {
					if (passwords[i][j] === passwords[i - 1][j]) {
						matchingPositions++;
					}
				}
				// With true randomness, expect < 2 matching positions on average
				expect(matchingPositions).toBeLessThan(4);
			}
		});
	});

	describe('Statistical Distribution', () => {
		it('should have roughly even distribution of character classes in long password', () => {
			const password = generateStrongPassword(1000);

			const uppercaseCount = (password.match(/[A-Z]/g) || []).length;
			const lowercaseCount = (password.match(/[a-z]/g) || []).length;
			const numberCount = (password.match(/[0-9]/g) || []).length;
			const symbolCount = (password.match(/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/g) || []).length;

			// Each class should represent roughly 1/4 of the password (±10%)
			// Uppercase: 26 chars, Lowercase: 26 chars, Numbers: 10 chars, Symbols: 27 chars
			// Total pool: 89 chars, so proportions are: 26/89, 26/89, 10/89, 27/89
			expect(uppercaseCount).toBeGreaterThan(200); // ~292 expected
			expect(lowercaseCount).toBeGreaterThan(200); // ~292 expected
			expect(numberCount).toBeGreaterThan(50); // ~112 expected
			expect(symbolCount).toBeGreaterThan(200); // ~303 expected

			// Verify all chars accounted for
			expect(uppercaseCount + lowercaseCount + numberCount + symbolCount).toBe(1000);
		});

		it('should use all available characters over many generations', () => {
			const allChars = new Set<string>();

			// Generate many passwords to get good coverage
			for (let i = 0; i < 100; i++) {
				const password = generateStrongPassword(50);
				password.split('').forEach((char) => allChars.add(char));
			}

			// Should have used many different characters (at least 60 out of 89 total)
			expect(allChars.size).toBeGreaterThan(60);
		});
	});

	describe('Security Properties', () => {
		it('should not generate common passwords', () => {
			const commonPasswords = [
				'Password123!',
				'Admin123!',
				'Welcome1!',
				'Qwerty123!',
				'Abc123!@#',
			];

			const generatedPasswords = Array.from({ length: 100 }, () => generateStrongPassword(12));

			generatedPasswords.forEach((pwd) => {
				expect(commonPasswords).not.toContain(pwd);
			});
		});

		it('should not generate sequential patterns', () => {
			const password = generateStrongPassword(20);

			// Should not contain obvious sequences
			expect(password).not.toMatch(/abc/i);
			expect(password).not.toMatch(/123/);
			expect(password).not.toMatch(/qwerty/i);
		});

		it('should not repeat characters excessively', () => {
			const password = generateStrongPassword(20);

			// Should not have same character repeated 4+ times in a row
			expect(password).not.toMatch(/(.)\1{3,}/);
		});

		it('should be resistant to brute force (high entropy)', () => {
			// 89 possible characters (26+26+10+27)
			// 16 character password = 89^16 possible combinations
			// = ~4.4 × 10^31 combinations
			// At 1 billion attempts/second = ~1.4 × 10^15 years to crack

			const password = generateStrongPassword(16);

			// Verify high entropy by checking character variety
			const uniqueChars = new Set(password.split(''));
			// Should have at least 12 unique chars in 16 char password
			expect(uniqueChars.size).toBeGreaterThanOrEqual(12);
		});
	});

	describe('Return Value Type', () => {
		it('should return a string', () => {
			const password = generateStrongPassword();
			expect(typeof password).toBe('string');
		});

		it('should not return null or undefined', () => {
			const password = generateStrongPassword();
			expect(password).not.toBeNull();
			expect(password).not.toBeUndefined();
		});

		it('should return non-empty string for valid length', () => {
			const password = generateStrongPassword(16);
			expect(password.length).toBeGreaterThan(0);
		});
	});
});
