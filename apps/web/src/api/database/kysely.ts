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
