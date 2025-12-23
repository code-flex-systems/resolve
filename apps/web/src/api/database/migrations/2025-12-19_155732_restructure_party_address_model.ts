import { Kysely, sql } from 'kysely';

/**
 * Migration: restructure_party_address_model
 * Created: 2025-12-19T15:57:32.484Z
 *
 * Major restructuring of party and address data model:
 * 1. Rename party_office → party_address with new type/status fields
 * 2. Modify party table - add name structure, remove address/contact fields
 * 3. Create party_phone and party_email tables
 * 4. Update party_representative FK (office_id → address_id)
 * 5. Add reference data for new enums
 */

export async function up(db: Kysely<any>): Promise<void> {
	// ============================================================================
	// 1. RENAME party_office TO party_address AND MODIFY COLUMNS
	// ============================================================================

	// Rename the table
	await sql`ALTER TABLE party_office RENAME TO party_address`.execute(db);

	// Rename office_name to name
	await sql`ALTER TABLE party_address RENAME COLUMN office_name TO name`.execute(db);

	// Add new columns: address_type and address_status
	await db.schema.alterTable('party_address').addColumn('address_type', 'text').execute();
	await db.schema.alterTable('party_address').addColumn('address_status', 'text').execute();

	// Set defaults for existing rows
	await sql`UPDATE party_address SET address_type = 'business' WHERE address_type IS NULL`.execute(db);

	// Set address_status - only one address per party can be 'valid'
	// First, set all to 'unknown'
	await sql`UPDATE party_address SET address_status = 'unknown' WHERE address_status IS NULL`.execute(db);

	// Then, set only ONE address per party to 'valid' (the first one that was primary, or the first created)
	await sql`
		UPDATE party_address
		SET address_status = 'valid'
		WHERE id IN (
			SELECT DISTINCT ON (party_id) id
			FROM party_address
			WHERE deleted_at IS NULL
			ORDER BY party_id, is_primary DESC NULLS LAST, id ASC
		)
	`.execute(db);

	// Add NOT NULL constraints and CHECK constraints
	await sql`ALTER TABLE party_address ALTER COLUMN address_type SET NOT NULL`.execute(db);
	await sql`ALTER TABLE party_address ALTER COLUMN address_type SET DEFAULT 'business'`.execute(db);
	await sql`ALTER TABLE party_address ADD CONSTRAINT chk_party_address_type CHECK (address_type IN ('home', 'business'))`.execute(
		db
	);

	await sql`ALTER TABLE party_address ALTER COLUMN address_status SET NOT NULL`.execute(db);
	await sql`ALTER TABLE party_address ALTER COLUMN address_status SET DEFAULT 'unknown'`.execute(db);
	await sql`ALTER TABLE party_address ADD CONSTRAINT chk_party_address_status CHECK (address_status IN ('valid', 'mailing', 'undeliverable', 'unknown'))`.execute(
		db
	);

	// Drop is_primary, phone, fax columns
	await db.schema.alterTable('party_address').dropColumn('is_primary').execute();
	await db.schema.alterTable('party_address').dropColumn('phone').execute();
	await db.schema.alterTable('party_address').dropColumn('fax').execute();

	// Add partial unique index - only one valid address per party
	await sql`CREATE UNIQUE INDEX idx_party_address_unique_valid ON party_address (party_id) WHERE address_status = 'valid' AND deleted_at IS NULL`.execute(
		db
	);

	// Rename old indexes
	await sql`DROP INDEX IF EXISTS idx_party_office_state`.execute(db);
	await sql`DROP INDEX IF EXISTS idx_party_office_city`.execute(db);
	await sql`CREATE INDEX idx_party_address_state ON party_address(state) WHERE state IS NOT NULL AND deleted_at IS NULL`.execute(
		db
	);
	await sql`CREATE INDEX idx_party_address_city ON party_address(city) WHERE city IS NOT NULL AND deleted_at IS NULL`.execute(
		db
	);

	// ============================================================================
	// 2. MODIFY party TABLE - ADD NAME STRUCTURE, REMOVE ADDRESS/CONTACT FIELDS
	// ============================================================================

	// Add new name structure columns
	await db.schema.alterTable('party').addColumn('is_business', 'boolean').execute();
	await db.schema.alterTable('party').addColumn('first_name', 'text').execute();
	await db.schema.alterTable('party').addColumn('middle_name', 'text').execute();
	await db.schema.alterTable('party').addColumn('last_name', 'text').execute();
	await db.schema.alterTable('party').addColumn('suffix', 'text').execute();

	// Set default for existing rows (all existing parties are businesses)
	await sql`UPDATE party SET is_business = true WHERE is_business IS NULL`.execute(db);
	await sql`ALTER TABLE party ALTER COLUMN is_business SET NOT NULL`.execute(db);
	await sql`ALTER TABLE party ALTER COLUMN is_business SET DEFAULT true`.execute(db);

	// Remove address and contact columns from party table
	await sql`DROP INDEX IF EXISTS idx_party_state`.execute(db);
	await db.schema.alterTable('party').dropColumn('street_address').execute();
	await db.schema.alterTable('party').dropColumn('city').execute();
	await db.schema.alterTable('party').dropColumn('state').execute();
	await db.schema.alterTable('party').dropColumn('postal_code').execute();
	await db.schema.alterTable('party').dropColumn('country').execute();
	await db.schema.alterTable('party').dropColumn('email').execute();
	await db.schema.alterTable('party').dropColumn('phone').execute();

	// ============================================================================
	// 3. CREATE party_phone TABLE
	// ============================================================================

	await db.schema
		.createTable('party_phone')
		.addColumn('id', 'serial', (col) => col.primaryKey())
		.addColumn('party_id', 'integer', (col) => col.notNull().references('party.id').onDelete('cascade'))
		.addColumn('client_id', 'uuid', (col) => col.notNull().references('client.id').onDelete('cascade'))
		.addColumn('country_code', 'text')
		.addColumn('area_code', 'text')
		.addColumn('phone_number', 'text', (col) => col.notNull())
		.addColumn('extension', 'text')
		.addColumn('phone_type', 'text', (col) => col.notNull())
		.addColumn('phone_status', 'text', (col) => col.notNull().defaultTo('unknown'))
		.addColumn('external_reference', 'text')
		.addColumn('feed_id', 'text')
		.addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`NOW()`))
		.addColumn('created_by', 'uuid', (col) => col.references('users.id'))
		.addColumn('updated_at', 'timestamptz')
		.addColumn('updated_by', 'uuid', (col) => col.references('users.id'))
		.addColumn('deleted_at', 'timestamptz')
		.addColumn('deleted_by', 'text')
		.execute();

	// Add constraints
	await sql`ALTER TABLE party_phone ADD CONSTRAINT chk_party_phone_type CHECK (phone_type IN ('mobile', 'home', 'work', 'fax'))`.execute(
		db
	);
	await sql`ALTER TABLE party_phone ADD CONSTRAINT chk_party_phone_status CHECK (phone_status IN ('valid', 'disconnected', 'unknown'))`.execute(
		db
	);

	// Add indexes
	await sql`CREATE INDEX idx_party_phone_party_id ON party_phone(party_id) WHERE deleted_at IS NULL`.execute(db);
	await sql`CREATE INDEX idx_party_phone_client_id ON party_phone(client_id) WHERE deleted_at IS NULL`.execute(db);

	// ============================================================================
	// 4. CREATE party_email TABLE
	// ============================================================================

	await db.schema
		.createTable('party_email')
		.addColumn('id', 'serial', (col) => col.primaryKey())
		.addColumn('party_id', 'integer', (col) => col.notNull().references('party.id').onDelete('cascade'))
		.addColumn('client_id', 'uuid', (col) => col.notNull().references('client.id').onDelete('cascade'))
		.addColumn('email_address', 'text', (col) => col.notNull())
		.addColumn('email_type', 'text', (col) => col.notNull().defaultTo('business'))
		.addColumn('external_reference', 'text')
		.addColumn('feed_id', 'text')
		.addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`NOW()`))
		.addColumn('created_by', 'uuid', (col) => col.references('users.id'))
		.addColumn('updated_at', 'timestamptz')
		.addColumn('updated_by', 'uuid', (col) => col.references('users.id'))
		.addColumn('deleted_at', 'timestamptz')
		.addColumn('deleted_by', 'text')
		.execute();

	// Add constraints
	await sql`ALTER TABLE party_email ADD CONSTRAINT chk_party_email_type CHECK (email_type IN ('personal', 'business'))`.execute(
		db
	);

	// Add indexes
	await sql`CREATE INDEX idx_party_email_party_id ON party_email(party_id) WHERE deleted_at IS NULL`.execute(db);
	await sql`CREATE INDEX idx_party_email_client_id ON party_email(client_id) WHERE deleted_at IS NULL`.execute(db);

	// ============================================================================
	// 5. UPDATE party_representative - RENAME office_id TO address_id
	// ============================================================================

	// Drop old FK constraint
	await sql`ALTER TABLE party_representative DROP CONSTRAINT IF EXISTS party_representative_office_id_fkey`.execute(db);

	// Rename the column
	await sql`ALTER TABLE party_representative RENAME COLUMN office_id TO address_id`.execute(db);

	// Add new FK constraint
	await sql`ALTER TABLE party_representative ADD CONSTRAINT party_representative_address_id_fkey FOREIGN KEY (address_id) REFERENCES party_address(id) ON DELETE SET NULL`.execute(
		db
	);

	// ============================================================================
	// 6. ADD REFERENCE DATA FOR NEW ENUMS
	// ============================================================================

	await sql`
		DO $$
		DECLARE
			client_rec RECORD;
			list_id INTEGER;
		BEGIN
			-- Loop through all clients
			FOR client_rec IN SELECT id FROM client LOOP

				-- ADDRESS STATUS
				INSERT INTO reference_list (entity, display_name, description, client_id)
				VALUES ('address_status', 'Address Status', 'Validity status of an address', client_rec.id)
				RETURNING id INTO list_id;

				INSERT INTO reference_option (reference_list_id, value, display_label, is_system_default, client_id) VALUES
					(list_id, 'valid', 'Valid Address', true, client_rec.id),
					(list_id, 'mailing', 'Mailing Address', true, client_rec.id),
					(list_id, 'undeliverable', 'Undeliverable', true, client_rec.id),
					(list_id, 'unknown', 'Unknown', true, client_rec.id);

				-- ADDRESS TYPE
				INSERT INTO reference_list (entity, display_name, description, client_id)
				VALUES ('address_type', 'Address Type', 'Type of address (home or business)', client_rec.id)
				RETURNING id INTO list_id;

				INSERT INTO reference_option (reference_list_id, value, display_label, is_system_default, client_id) VALUES
					(list_id, 'home', 'Home', true, client_rec.id),
					(list_id, 'business', 'Business', true, client_rec.id);

				-- PHONE TYPE
				INSERT INTO reference_list (entity, display_name, description, client_id)
				VALUES ('phone_type', 'Phone Type', 'Type of phone number', client_rec.id)
				RETURNING id INTO list_id;

				INSERT INTO reference_option (reference_list_id, value, display_label, is_system_default, client_id) VALUES
					(list_id, 'mobile', 'Mobile', true, client_rec.id),
					(list_id, 'home', 'Home', true, client_rec.id),
					(list_id, 'work', 'Work', true, client_rec.id),
					(list_id, 'fax', 'Fax', true, client_rec.id);

				-- PHONE STATUS
				INSERT INTO reference_list (entity, display_name, description, client_id)
				VALUES ('phone_status', 'Phone Status', 'Validity status of a phone number', client_rec.id)
				RETURNING id INTO list_id;

				INSERT INTO reference_option (reference_list_id, value, display_label, is_system_default, client_id) VALUES
					(list_id, 'valid', 'Valid', true, client_rec.id),
					(list_id, 'disconnected', 'Disconnected', true, client_rec.id),
					(list_id, 'unknown', 'Unknown', true, client_rec.id);

				-- EMAIL TYPE
				INSERT INTO reference_list (entity, display_name, description, client_id)
				VALUES ('email_type', 'Email Type', 'Type of email address', client_rec.id)
				RETURNING id INTO list_id;

				INSERT INTO reference_option (reference_list_id, value, display_label, is_system_default, client_id) VALUES
					(list_id, 'personal', 'Personal', true, client_rec.id),
					(list_id, 'business', 'Business', true, client_rec.id);

			END LOOP;
		END $$;
	`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
	// ============================================================================
	// 1. REMOVE REFERENCE DATA
	// ============================================================================

	await sql`
		DELETE FROM reference_option WHERE reference_list_id IN (
			SELECT id FROM reference_list WHERE entity IN ('address_status', 'address_type', 'phone_type', 'phone_status', 'email_type')
		)
	`.execute(db);
	await sql`DELETE FROM reference_list WHERE entity IN ('address_status', 'address_type', 'phone_type', 'phone_status', 'email_type')`.execute(
		db
	);

	// ============================================================================
	// 2. REVERT party_representative - RENAME address_id BACK TO office_id
	// ============================================================================

	await sql`ALTER TABLE party_representative DROP CONSTRAINT IF EXISTS party_representative_address_id_fkey`.execute(db);
	await sql`ALTER TABLE party_representative RENAME COLUMN address_id TO office_id`.execute(db);

	// ============================================================================
	// 3. DROP party_email TABLE
	// ============================================================================

	await sql`DROP INDEX IF EXISTS idx_party_email_client_id`.execute(db);
	await sql`DROP INDEX IF EXISTS idx_party_email_party_id`.execute(db);
	await db.schema.dropTable('party_email').execute();

	// ============================================================================
	// 4. DROP party_phone TABLE
	// ============================================================================

	await sql`DROP INDEX IF EXISTS idx_party_phone_client_id`.execute(db);
	await sql`DROP INDEX IF EXISTS idx_party_phone_party_id`.execute(db);
	await db.schema.dropTable('party_phone').execute();

	// ============================================================================
	// 5. RESTORE party TABLE COLUMNS
	// ============================================================================

	// Add back address and contact columns
	await db.schema.alterTable('party').addColumn('street_address', 'text').execute();
	await db.schema.alterTable('party').addColumn('city', 'text').execute();
	await db.schema.alterTable('party').addColumn('state', 'text').execute();
	await db.schema.alterTable('party').addColumn('postal_code', 'text').execute();
	await db.schema.alterTable('party').addColumn('country', 'text').execute();
	await db.schema.alterTable('party').addColumn('email', 'text').execute();
	await db.schema.alterTable('party').addColumn('phone', 'text').execute();

	// Recreate index
	await sql`CREATE INDEX idx_party_state ON party(state) WHERE state IS NOT NULL AND deleted_at IS NULL`.execute(db);

	// Remove name structure columns
	await db.schema.alterTable('party').dropColumn('suffix').execute();
	await db.schema.alterTable('party').dropColumn('last_name').execute();
	await db.schema.alterTable('party').dropColumn('middle_name').execute();
	await db.schema.alterTable('party').dropColumn('first_name').execute();
	await db.schema.alterTable('party').dropColumn('is_business').execute();

	// ============================================================================
	// 6. REVERT party_address BACK TO party_office
	// ============================================================================

	// Drop indexes
	await sql`DROP INDEX IF EXISTS idx_party_address_unique_valid`.execute(db);
	await sql`DROP INDEX IF EXISTS idx_party_address_state`.execute(db);
	await sql`DROP INDEX IF EXISTS idx_party_address_city`.execute(db);

	// Add back is_primary, phone, fax columns
	await db.schema.alterTable('party_address').addColumn('is_primary', 'boolean').execute();
	await db.schema.alterTable('party_address').addColumn('phone', 'text').execute();
	await db.schema.alterTable('party_address').addColumn('fax', 'text').execute();

	// Set is_primary based on address_status
	await sql`UPDATE party_address SET is_primary = (address_status = 'valid')`.execute(db);
	await sql`ALTER TABLE party_address ALTER COLUMN is_primary SET DEFAULT false`.execute(db);

	// Drop constraints and new columns
	await sql`ALTER TABLE party_address DROP CONSTRAINT IF EXISTS chk_party_address_status`.execute(db);
	await sql`ALTER TABLE party_address DROP CONSTRAINT IF EXISTS chk_party_address_type`.execute(db);
	await db.schema.alterTable('party_address').dropColumn('address_status').execute();
	await db.schema.alterTable('party_address').dropColumn('address_type').execute();

	// Rename name back to office_name
	await sql`ALTER TABLE party_address RENAME COLUMN name TO office_name`.execute(db);

	// Rename the table back
	await sql`ALTER TABLE party_address RENAME TO party_office`.execute(db);

	// Recreate old indexes
	await sql`CREATE INDEX idx_party_office_state ON party_office(state) WHERE state IS NOT NULL AND deleted_at IS NULL`.execute(
		db
	);
	await sql`CREATE INDEX idx_party_office_city ON party_office(city) WHERE city IS NOT NULL AND deleted_at IS NULL`.execute(
		db
	);

	// Add back FK constraint for party_representative
	await sql`ALTER TABLE party_representative ADD CONSTRAINT party_representative_office_id_fkey FOREIGN KEY (office_id) REFERENCES party_office(id) ON DELETE SET NULL`.execute(
		db
	);
}
