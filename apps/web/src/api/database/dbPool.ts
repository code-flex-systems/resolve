'use strict';

import pg, { PoolConfig } from 'pg';

const DB_POOL_CONFIG: PoolConfig = {
	user: process.env.DB_USER,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_DATABASE,
	host: process.env.DB_HOST,
	port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
	ssl:
		process.env.NODE_ENV === 'production' || process.env.DB_SSL === 'true'
			? { rejectUnauthorized: false }
			: false,
	connectionTimeoutMillis: 10000,
};

const pool = new pg.Pool(DB_POOL_CONFIG);

pool.on('connect', (client) => {
	client.query(`SET search_path TO public`);
});

export async function query(text: string, params: any) {
	try {
		return await pool.query(text, params);
	} catch (e) {
		console.error(e);
	}
}

export async function getClient() {
	try {
		return await pool.connect();
	} catch (e) {
		console.error(e);
	}
}

export function getPool() {
	try {
		return pool;
	} catch (e) {
		console.error(e);
	}
}
