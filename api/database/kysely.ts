'use strict';

import { Kysely, PostgresDialect } from 'kysely';
import { DB } from './types';
import { getPool } from './dbPool';
import { Pool } from 'pg';

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
