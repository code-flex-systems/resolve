import { Kysely, sql } from 'kysely';

/**
 * Migration: add_reference_data_tables
 * Created: 2025-12-01T20:42:26.562Z
 *
 * Implements the reference data management system for configurable business enums.
 * Two-table structure: reference_list (entity types) → reference_option (options)
 *
 * Migrates these hardcoded enums to database-driven configuration:
 * - line_of_business, loss_type, coverage_type, claim_substatus
 * - facilitator_category, entity_category, claim_party_role
 */

export async function up(db: Kysely<any>): Promise<void> {
	// 1. Create reference_list table (entity types)
	await db.schema
		.createTable('reference_list')
		.addColumn('id', 'serial', (col) => col.primaryKey())
		.addColumn('entity', 'text', (col) => col.notNull())
		.addColumn('display_name', 'text', (col) => col.notNull())
		.addColumn('description', 'text')
		.addColumn('client_id', 'uuid', (col) => col.notNull())
		.addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
		.addColumn('created_by', 'uuid')
		.addColumn('updated_at', 'timestamp')
		.addColumn('updated_by', 'uuid')
		.addColumn('deleted_at', 'timestamp')
		.execute();

	// 2. Create reference_option table (individual options)
	await db.schema
		.createTable('reference_option')
		.addColumn('id', 'serial', (col) => col.primaryKey())
		.addColumn('reference_list_id', 'integer', (col) => col.notNull())
		.addColumn('value', 'text', (col) => col.notNull())
		.addColumn('display_label', 'text', (col) => col.notNull())
		.addColumn('description', 'text')
		.addColumn('icon_emoji', 'text')
		.addColumn('color_hex', 'text')
		.addColumn('sort_order', 'integer', (col) => col.notNull().defaultTo(0))
		.addColumn('is_active', 'boolean', (col) => col.notNull().defaultTo(true))
		.addColumn('is_system_default', 'boolean', (col) => col.notNull().defaultTo(false))
		.addColumn('client_id', 'uuid', (col) => col.notNull())
		.addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
		.addColumn('created_by', 'uuid')
		.addColumn('updated_at', 'timestamp')
		.addColumn('updated_by', 'uuid')
		.addColumn('deleted_at', 'timestamp')
		.execute();

	// 3. Add foreign key constraints for reference_list
	await db.schema
		.alterTable('reference_list')
		.addForeignKeyConstraint('reference_list_client_id_fkey', ['client_id'], 'client', ['id'])
		.execute();

	await db.schema
		.alterTable('reference_list')
		.addForeignKeyConstraint('reference_list_created_by_fkey', ['created_by'], 'users', ['id'])
		.execute();

	await db.schema
		.alterTable('reference_list')
		.addForeignKeyConstraint('reference_list_updated_by_fkey', ['updated_by'], 'users', ['id'])
		.execute();

	// 4. Add foreign key constraints for reference_option
	await db.schema
		.alterTable('reference_option')
		.addForeignKeyConstraint(
			'reference_option_reference_list_id_fkey',
			['reference_list_id'],
			'reference_list',
			['id']
		)
		.execute();

	await db.schema
		.alterTable('reference_option')
		.addForeignKeyConstraint('reference_option_client_id_fkey', ['client_id'], 'client', ['id'])
		.execute();

	await db.schema
		.alterTable('reference_option')
		.addForeignKeyConstraint('reference_option_created_by_fkey', ['created_by'], 'users', ['id'])
		.execute();

	await db.schema
		.alterTable('reference_option')
		.addForeignKeyConstraint('reference_option_updated_by_fkey', ['updated_by'], 'users', ['id'])
		.execute();

	// 5. Add indexes for performance
	await db.schema
		.createIndex('idx_reference_list_client_id')
		.on('reference_list')
		.column('client_id')
		.execute();

	await db.schema
		.createIndex('idx_reference_option_client_id')
		.on('reference_option')
		.column('client_id')
		.execute();

	await db.schema
		.createIndex('idx_reference_option_reference_list_id')
		.on('reference_option')
		.column('reference_list_id')
		.execute();

	await db.schema
		.createIndex('idx_reference_option_display_label')
		.on('reference_option')
		.column('display_label')
		.execute();

	// 6. Add uniqueness constraint (entity unique within client for reference_list)
	await db.schema
		.createIndex('idx_reference_list_unique_entity_client')
		.unique()
		.on('reference_list')
		.columns(['client_id', 'entity'])
		.where('deleted_at' as any, 'is', null)
		.execute();

	// 7. Add uniqueness constraint (value unique within reference_list for options)
	await db.schema
		.createIndex('idx_reference_option_unique_value_list')
		.unique()
		.on('reference_option')
		.columns(['reference_list_id', 'value'])
		.where('deleted_at' as any, 'is', null)
		.execute();

	// 8. Add CHECK constraints
	await sql`
		ALTER TABLE reference_list
		ADD CONSTRAINT reference_list_entity_check
		CHECK (entity IS NOT NULL AND length(trim(entity)) > 0)
	`.execute(db);

	await sql`
		ALTER TABLE reference_option
		ADD CONSTRAINT reference_option_value_check
		CHECK (value IS NOT NULL AND length(trim(value)) > 0)
	`.execute(db);

	await sql`
		ALTER TABLE reference_option
		ADD CONSTRAINT reference_option_display_label_check
		CHECK (display_label IS NOT NULL AND length(trim(display_label)) > 0)
	`.execute(db);

	// 9. Add column comments
	await sql`COMMENT ON COLUMN reference_list.id IS 'Primary key'`.execute(db);
	await sql`COMMENT ON COLUMN reference_list.entity IS 'Entity type identifier (e.g., "line_of_business", "loss_type")'`.execute(
		db
	);
	await sql`COMMENT ON COLUMN reference_list.display_name IS 'Human-readable name for the entity type'`.execute(
		db
	);
	await sql`COMMENT ON COLUMN reference_list.deleted_at IS 'Soft delete timestamp'`.execute(db);

	await sql`COMMENT ON COLUMN reference_option.id IS 'Primary key'`.execute(db);
	await sql`COMMENT ON COLUMN reference_option.value IS 'Snake_case identifier used in code (e.g., "auto", "collision")'`.execute(
		db
	);
	await sql`COMMENT ON COLUMN reference_option.display_label IS 'Human-readable label for display'`.execute(
		db
	);
	await sql`COMMENT ON COLUMN reference_option.icon_emoji IS 'Emoji icon for visual display'`.execute(
		db
	);
	await sql`COMMENT ON COLUMN reference_option.sort_order IS 'Custom sort order (reserved for future use; currently sorted alphabetically)'`.execute(
		db
	);
	await sql`COMMENT ON COLUMN reference_option.is_system_default IS 'Whether this is a system-seeded option (cannot be deleted)'`.execute(
		db
	);
	await sql`COMMENT ON COLUMN reference_option.deleted_at IS 'Soft delete timestamp'`.execute(db);

	// 10. Add table comments
	await sql`COMMENT ON TABLE reference_list IS 'Defines configurable reference data entity types (e.g., line_of_business, loss_type)'`.execute(
		db
	);
	await sql`COMMENT ON TABLE reference_option IS 'Individual options within a reference list entity type'`.execute(
		db
	);

	// 11. Seed reference data for all existing clients
	await sql`
		DO $$
		DECLARE
			client_rec RECORD;
			list_id INTEGER;
		BEGIN
			-- Loop through all clients
			FOR client_rec IN SELECT id FROM client LOOP

				-- 1. LINE OF BUSINESS
				INSERT INTO reference_list (entity, display_name, description, client_id)
				VALUES ('line_of_business', 'Line of Business', 'Insurance line of business classification', client_rec.id)
				RETURNING id INTO list_id;

				INSERT INTO reference_option (reference_list_id, value, display_label, icon_emoji, is_system_default, client_id) VALUES
					(list_id, 'auto', 'Auto', '🚗', true, client_rec.id),
					(list_id, 'property', 'Property', '🏠', true, client_rec.id),
					(list_id, 'general_liability', 'General Liability', '⚖️', true, client_rec.id),
					(list_id, 'workers_comp', 'Workers Comp', '👷', true, client_rec.id),
					(list_id, 'professional_liability', 'Professional Liability', '💼', true, client_rec.id);

				-- 2. LOSS TYPE
				INSERT INTO reference_list (entity, display_name, description, client_id)
				VALUES ('loss_type', 'Loss Type', 'Type of loss or damage', client_rec.id)
				RETURNING id INTO list_id;

				INSERT INTO reference_option (reference_list_id, value, display_label, icon_emoji, is_system_default, client_id) VALUES
					(list_id, 'collision', 'Collision', '💥', true, client_rec.id),
					(list_id, 'comprehensive', 'Comprehensive', '🔒', true, client_rec.id),
					(list_id, 'fire', 'Fire', '🔥', true, client_rec.id),
					(list_id, 'theft', 'Theft', '🦹', true, client_rec.id),
					(list_id, 'water_damage', 'Water Damage', '💧', true, client_rec.id),
					(list_id, 'wind', 'Wind', '🌪️', true, client_rec.id),
					(list_id, 'vandalism', 'Vandalism', '🔨', true, client_rec.id),
					(list_id, 'bodily_injury', 'Bodily Injury', '🤕', true, client_rec.id),
					(list_id, 'property_damage', 'Property Damage', '🏚️', true, client_rec.id),
					(list_id, 'uninsured_motorist', 'Uninsured Motorist', '🚫', true, client_rec.id),
					(list_id, 'medical_payments', 'Medical Payments', '🏥', true, client_rec.id),
					(list_id, 'personal_injury_protection', 'Personal Injury Protection', '🩹', true, client_rec.id),
					(list_id, 'other', 'Other', '📋', true, client_rec.id);

				-- 3. CLAIM SUBSTATUS
				INSERT INTO reference_list (entity, display_name, description, client_id)
				VALUES ('claim_substatus', 'Claim Substatus', 'Detailed claim workflow status', client_rec.id)
				RETURNING id INTO list_id;

				INSERT INTO reference_option (reference_list_id, value, display_label, icon_emoji, is_system_default, client_id) VALUES
					(list_id, 'investigation', 'Investigation', '🔍', true, client_rec.id),
					(list_id, 'demand_sent', 'Demand Sent', '📧', true, client_rec.id),
					(list_id, 'negotiation', 'Negotiation', '🤝', true, client_rec.id),
					(list_id, 'settlement_reached', 'Settlement Reached', '✍️', true, client_rec.id),
					(list_id, 'litigation', 'Litigation', '⚖️', true, client_rec.id),
					(list_id, 'closed_recovered', 'Closed Recovered', '✅', true, client_rec.id),
					(list_id, 'closed_no_recovery', 'Closed No Recovery', '❌', true, client_rec.id),
					(list_id, 'cancelled', 'Cancelled', '🚫', true, client_rec.id);

				-- 4. COVERAGE TYPE
				INSERT INTO reference_list (entity, display_name, description, client_id)
				VALUES ('coverage_type', 'Coverage Type', 'Type of insurance coverage', client_rec.id)
				RETURNING id INTO list_id;

				INSERT INTO reference_option (reference_list_id, value, display_label, icon_emoji, is_system_default, client_id) VALUES
					(list_id, 'collision', 'Collision', '🚗', true, client_rec.id),
					(list_id, 'comprehensive', 'Comprehensive', '🔒', true, client_rec.id),
					(list_id, 'liability', 'Liability', '⚖️', true, client_rec.id),
					(list_id, 'uninsured_motorist', 'Uninsured Motorist', '🚫', true, client_rec.id),
					(list_id, 'medical_payments', 'Medical Payments', '🏥', true, client_rec.id),
					(list_id, 'personal_injury_protection', 'Personal Injury Protection', '🩹', true, client_rec.id),
					(list_id, 'dwelling', 'Dwelling', '🏠', true, client_rec.id),
					(list_id, 'personal_property', 'Personal Property', '👔', true, client_rec.id),
					(list_id, 'loss_of_use', 'Loss of Use', '🏨', true, client_rec.id),
					(list_id, 'other', 'Other', '📋', true, client_rec.id);

				-- 5. FACILITATOR CATEGORY
				INSERT INTO reference_list (entity, display_name, description, client_id)
				VALUES ('facilitator_category', 'Facilitator Category', 'Category of facilitator parties', client_rec.id)
				RETURNING id INTO list_id;

				INSERT INTO reference_option (reference_list_id, value, display_label, icon_emoji, is_system_default, client_id) VALUES
					(list_id, 'adverse_carrier', 'Adverse Carrier', '🏢', true, client_rec.id),
					(list_id, 'attorney', 'Attorney', '⚖️', true, client_rec.id),
					(list_id, 'expert', 'Expert', '🎓', true, client_rec.id),
					(list_id, 'vendor', 'Vendor', '🛠️', true, client_rec.id);

				-- 6. ENTITY CATEGORY
				INSERT INTO reference_list (entity, display_name, description, client_id)
				VALUES ('entity_category', 'Entity Category', 'Category of entity parties', client_rec.id)
				RETURNING id INTO list_id;

				INSERT INTO reference_option (reference_list_id, value, display_label, icon_emoji, is_system_default, client_id) VALUES
					(list_id, 'responsible_party', 'Responsible Party', '👤', true, client_rec.id),
					(list_id, 'claimant', 'Claimant', '📋', true, client_rec.id),
					(list_id, 'witness', 'Witness', '👁️', true, client_rec.id),
					(list_id, 'property_owner', 'Property Owner', '🏠', true, client_rec.id);

				-- 7. CLAIM PARTY ROLE
				INSERT INTO reference_list (entity, display_name, description, client_id)
				VALUES ('claim_party_role', 'Claim Party Role', 'Role of a party on a specific claim', client_rec.id)
				RETURNING id INTO list_id;

				INSERT INTO reference_option (reference_list_id, value, display_label, icon_emoji, is_system_default, client_id) VALUES
					(list_id, 'adverse_carrier', 'Adverse Carrier', '🏢', true, client_rec.id),
					(list_id, 'our_attorney', 'Our Attorney', '⚖️', true, client_rec.id),
					(list_id, 'their_attorney', 'Their Attorney', '👔', true, client_rec.id),
					(list_id, 'expert', 'Expert', '🎓', true, client_rec.id),
					(list_id, 'responsible_party', 'Responsible Party', '👤', true, client_rec.id),
					(list_id, 'witness', 'Witness', '👁️', true, client_rec.id),
					(list_id, 'property_owner', 'Property Owner', '🏠', true, client_rec.id),
					(list_id, 'claimant', 'Claimant', '📋', true, client_rec.id),
					(list_id, 'other', 'Other', '📌', true, client_rec.id);

			END LOOP;
		END $$;
	`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
	// Drop tables in reverse order (options first due to foreign key)
	await db.schema.dropTable('reference_option').execute();
	await db.schema.dropTable('reference_list').execute();
}
