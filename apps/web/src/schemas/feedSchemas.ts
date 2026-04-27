// src/server/trpc/schemas/feedSchemas.ts
import { FeedStatus, FeedType } from '@/config/enums';
import { z } from 'zod';

/**
 * A minimal hostname regex (letters, digits, hyphens, and dots; no trailing or leading hyphens).
 * Feel free to replace this with a more complete pattern if needed.
 */
const HOSTNAME_REGEX =
	/^(?=.{1,253}$)(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * Common fields for every feed
 * - name: nonempty string
 * - schedule: integer 0–23
 * - feed_type: one of 'sftp', 'rest_api', 'database'
 */
export const baseFeed = z.object({
	name: z.string().min(3),
	schedule: z.number().int().min(0).max(23),
	feed_type: z.nativeEnum(FeedType),
});

/**
 * SFTP‐style connection options.
 * We validate host with HOSTNAME_REGEX; port defaults to 22 if omitted.
 */
export const sftpOptions = z.object({
	host: z.string().regex(HOSTNAME_REGEX, { message: 'Invalid hostname' }),
	port: z.number().int().positive().default(22),
	username: z.string().min(1),
	password: z.string().min(1),
	remote_path: z.string().min(1),
});

/**
 * REST API connection options
 * - url must be a valid URL
 * - headers is an optional record of string→string
 * - timeout_seconds defaults to 30
 */
export const restApiOptions = z.object({
	url: z.string().url(),
	headers: z.record(z.string(), z.string()).optional(),
	timeout_seconds: z.number().int().positive().default(30),
});

/**
 * Database‐query connection options
 * - db_host validated by HOSTNAME_REGEX
 * - db_port defaults to 5432
 * - db_name, db_user, db_password all nonempty strings
 * - query is the SQL/text we will execute
 */
export const dbOptions = z.object({
	db_host: z.string().regex(HOSTNAME_REGEX, { message: 'Invalid database hostname' }),
	db_port: z.number().int().positive().default(5432),
	db_name: z.string().min(1),
	db_user: z.string().min(1),
	db_password: z.string().min(1),
	query: z.string().min(1),
});

export const getFeedOptions = z.object({ id: z.string().uuid() });

export const getFeedCountInput = z.object({ clientId: z.string().optional() });

/**
 * Discriminated union for creating a feed
 * based on feed_type → forces correct connection_options shape
 */
export const createFeedInput = z.discriminatedUnion('feed_type', [
	baseFeed.extend({
		feed_type: z.literal(FeedType.SFTP),
		connection_options: sftpOptions,
	}),
	baseFeed.extend({
		feed_type: z.literal(FeedType.REST_API),
		connection_options: restApiOptions,
	}),
	baseFeed.extend({
		feed_type: z.literal(FeedType.DATABASE),
		connection_options: dbOptions,
	}),
]);

/**
 * For updates: partial fields are allowed.
 * If connection_options is provided, feed_type must also be provided.
 * And when both are provided, connection_options must match the indicated feed_type shape.
 */
export const updateFeedInput = z
	.object({
		id: z.string().uuid(),
		params: z
			.object({
				name: z.string().min(3).optional(),
				schedule: z.number().int().min(0).max(23).optional(),
				feed_type: z.nativeEnum(FeedType).optional(),
				connection_options: z.union([sftpOptions, restApiOptions, dbOptions]).optional(),
				status: z.nativeEnum(FeedStatus).optional(),
				last_synced_at: z.date().optional(),
			})
			.refine(
				(data) => {
					// If connection_options exists, feed_type must be provided
					if (data.connection_options && !data.feed_type) {
						return false;
					}
					return true;
				},
				{ message: 'When providing connection_options, feed_type must also be provided' }
			)
			.refine(
				(data) => {
					// If both provided, ensure connection_options shape matches feed_type
					if (data.connection_options && data.feed_type) {
						switch (data.feed_type) {
							case FeedType.DATABASE:
								return dbOptions.safeParse(data.connection_options).success;
							case FeedType.REST_API:
								return restApiOptions.safeParse(data.connection_options).success;
							case FeedType.SFTP:
								return sftpOptions.safeParse(data.connection_options).success;
						}
					}
					return true;
				},
				{ message: 'connection_options does not match provided feed_type' }
			),
	})
	.required();

/** Input for deleting a feed */
export const deleteFeedInput = z.object({ id: z.string().uuid() });
