'use strict';

import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { DB } from '@/api/database/types';
import { getPool } from '@/api/database/dbPool';

const kysely = new Kysely<DB>({
	dialect: new PostgresDialect({
		pool: getPool() as Pool,
	}),
	log(event) {
		console.log(event.query.sql);
		console.log(event.query.parameters);
	},
});

export const db = kysely.withSchema(process.env.DB_SCHEMA || 'public');

/**
 * Database reference for the analytics schema.
 * Use this for queries that primarily work with analytics rollup tables.
 *
 * Note: For queries that JOIN analytics tables with public schema tables,
 * you may need to use the base kysely instance with explicit schema prefixes
 * or raw SQL for cross-schema operations.
 */
export const analyticsDb = kysely.withSchema('analytics');
