/**
 * Integration test environment guard.
 *
 * MUST be the first setup file (see vitest.integration.config.ts).
 *
 * Loads .env (for machine-specific TEST_DB_* overrides), then immediately
 * points the app's DB_* variables at the local test database - at MODULE
 * scope, not in beforeAll. Module-level config (dbPool's pool config,
 * kysely's withSchema) is evaluated when those modules are first imported
 * during test collection, which happens before any beforeAll hook runs.
 * Without this, code that uses the global `db` instance inside a test
 * would connect to whatever .env points at (the real Supabase database).
 */
import 'dotenv/config';

process.env.DB_SCHEMA = 'test';
process.env.DB_HOST = process.env.TEST_DB_HOST || 'localhost';
process.env.DB_PORT = process.env.TEST_DB_PORT || '5432';
process.env.DB_DATABASE = process.env.TEST_DB_DATABASE || 'resolve_test';
process.env.DB_USER = process.env.TEST_DB_USER || 'postgres';
process.env.DB_PASSWORD = process.env.TEST_DB_PASSWORD || 'password';
process.env.DB_SSL = 'false';
