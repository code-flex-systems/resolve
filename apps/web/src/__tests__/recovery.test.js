/**
 * Test script for Phase 1 Recovery Infrastructure
 *
 * This script tests:
 * 1. Creating recovery events
 * 2. Automatic calculation of claim.actual_recovery
 * 3. Deleting recovery events and recalculation
 * 4. Creating and managing deadlines
 *
 * Usage: node test-recovery.js
 */

const { Kysely, PostgresDialect } = require('kysely');
const { Pool } = require('pg');

// Database connection (matches .env settings)
const db = new Kysely({
	dialect: new PostgresDialect({
		pool: new Pool({
			connectionString: process.env.DATABASE_URL,
		}),
	}),
});

async function main() {
	console.log('🧪 Testing Phase 1 Recovery Infrastructure\n');

	try {
		// Get a test client_id and user_id from the database
		const client = await db.selectFrom('client').select(['id']).executeTakeFirst();

		if (!client) {
			console.error('❌ No client found in database. Please seed data first.');
			return;
		}

		const user = await db
			.selectFrom('users')
			.select(['id'])
			.where('client_id', '=', client.id)
			.executeTakeFirst();

		if (!user) {
			console.error('❌ No user found in database. Please seed data first.');
			return;
		}

		console.log(`✓ Using client_id: ${client.id}`);
		console.log(`✓ Using user_id: ${user.id}\n`);

		// Create a test claim
		console.log('📋 Step 1: Creating test claim...');
		const [claim] = await db
			.insertInto('claim')
			.values({
				claim_number: `TEST-RECOVERY-${Date.now()}`,
				client: 'Test Insurance Co',
				insured: 'Test Insured',
				expected_recovery: '50000',
				client_id: client.id,
				created_by: user.id,
			})
			.returningAll()
			.execute();

		console.log(`✓ Created claim #${claim.id}: ${claim.claim_number}`);
		console.log(`  Expected recovery: $${claim.expected_recovery}`);
		console.log(`  Actual recovery: ${claim.actual_recovery ?? 'NULL'}\n`);

		// Test 1: Create first recovery event
		console.log('💰 Step 2: Creating first recovery event ($15,000)...');
		const [recovery1] = await db
			.insertInto('recovery_event')
			.values({
				claim_id: claim.id,
				client_id: client.id,
				recovery_date: new Date('2025-01-15'),
				recovery_amount: '15000',
				recovery_source: 'Settlement - Party A',
				notes: 'Initial partial settlement',
				created_by: user.id,
			})
			.returningAll()
			.execute();

		// Recalculate
		await recalculateActualRecovery(claim.id, client.id);

		const claim1 = await db
			.selectFrom('claim')
			.selectAll()
			.where('id', '=', claim.id)
			.executeTakeFirstOrThrow();

		console.log(`✓ Created recovery event #${recovery1.id}`);
		console.log(`✓ Claim actual_recovery updated to: $${claim1.actual_recovery}\n`);

		// Test 2: Create second recovery event
		console.log('💰 Step 3: Creating second recovery event ($10,500)...');
		const [recovery2] = await db
			.insertInto('recovery_event')
			.values({
				claim_id: claim.id,
				client_id: client.id,
				recovery_date: new Date('2025-02-20'),
				recovery_amount: '10500',
				recovery_source: 'Settlement - Party B',
				created_by: user.id,
			})
			.returningAll()
			.execute();

		await recalculateActualRecovery(claim.id, client.id);

		const claim2 = await db
			.selectFrom('claim')
			.selectAll()
			.where('id', '=', claim.id)
			.executeTakeFirstOrThrow();

		console.log(`✓ Created recovery event #${recovery2.id}`);
		console.log(`✓ Claim actual_recovery updated to: $${claim2.actual_recovery}`);
		console.log(`  Expected: $25,500 (15000 + 10500)\n`);

		// Test 3: Delete first recovery event
		console.log('🗑️  Step 4: Deleting first recovery event...');
		await db.deleteFrom('recovery_event').where('id', '=', recovery1.id).execute();

		await recalculateActualRecovery(claim.id, client.id);

		const claim3 = await db
			.selectFrom('claim')
			.selectAll()
			.where('id', '=', claim.id)
			.executeTakeFirstOrThrow();

		console.log(`✓ Deleted recovery event #${recovery1.id}`);
		console.log(`✓ Claim actual_recovery recalculated to: $${claim3.actual_recovery}`);
		console.log(`  Expected: $10,500 (only second event remains)\n`);

		// Test 4: Create deadlines
		console.log('📅 Step 5: Creating deadlines...');
		const [deadline1] = await db
			.insertInto('deadline')
			.values({
				claim_id: claim.id,
				client_id: client.id,
				deadline_type: 'Statute of Limitations',
				deadline_date: new Date('2027-01-15'),
				description: '2-year statute from date of loss',
				status: 'pending',
				created_by: user.id,
			})
			.returningAll()
			.execute();

		const [deadline2] = await db
			.insertInto('deadline')
			.values({
				claim_id: claim.id,
				client_id: client.id,
				deadline_type: 'Demand Letter',
				deadline_date: new Date('2025-12-01'),
				description: 'Send demand to responsible party',
				status: 'pending',
				created_by: user.id,
			})
			.returningAll()
			.execute();

		console.log(
			`✓ Created deadline #${deadline1.id}: ${deadline1.deadline_type} (${deadline1.deadline_date.toISOString().split('T')[0]})`
		);
		console.log(
			`✓ Created deadline #${deadline2.id}: ${deadline2.deadline_type} (${deadline2.deadline_date.toISOString().split('T')[0]})\n`
		);

		// Test 5: Update deadline status
		console.log('✅ Step 6: Updating deadline status to "met"...');
		await db
			.updateTable('deadline')
			.set({ status: 'met', updated_by: user.id })
			.where('id', '=', deadline2.id)
			.execute();

		const updatedDeadline = await db
			.selectFrom('deadline')
			.selectAll()
			.where('id', '=', deadline2.id)
			.executeTakeFirstOrThrow();

		console.log(`✓ Deadline #${deadline2.id} status: ${updatedDeadline.status}\n`);

		// Summary
		console.log('📊 Final Summary:');
		const finalClaim = await db
			.selectFrom('claim')
			.selectAll()
			.where('id', '=', claim.id)
			.executeTakeFirstOrThrow();

		const recoveryEvents = await db
			.selectFrom('recovery_event')
			.selectAll()
			.where('claim_id', '=', claim.id)
			.execute();

		const deadlines = await db
			.selectFrom('deadline')
			.selectAll()
			.where('claim_id', '=', claim.id)
			.execute();

		console.log(`  Claim: ${finalClaim.claim_number}`);
		console.log(`  Expected Recovery: $${finalClaim.expected_recovery}`);
		console.log(`  Actual Recovery: $${finalClaim.actual_recovery}`);
		console.log(`  Recovery Events: ${recoveryEvents.length}`);
		console.log(
			`  Deadlines: ${deadlines.length} (${deadlines.filter((d) => d.status === 'met').length} met, ${deadlines.filter((d) => d.status === 'pending').length} pending)\n`
		);

		// Cleanup
		console.log('🧹 Cleaning up test data...');
		await db.deleteFrom('deadline').where('claim_id', '=', claim.id).execute();
		await db.deleteFrom('recovery_event').where('claim_id', '=', claim.id).execute();
		await db.deleteFrom('claim').where('id', '=', claim.id).execute();
		console.log('✓ Test data removed\n');

		console.log('✅ All tests passed!');
	} catch (error) {
		console.error('\n❌ Test failed:', error.message);
		console.error(error);
	} finally {
		await db.destroy();
	}
}

// Helper function to recalculate actual_recovery
async function recalculateActualRecovery(claimId, clientId) {
	const result = await db
		.selectFrom('recovery_event')
		.select(({ fn }) => fn.sum('recovery_amount').as('total'))
		.where('claim_id', '=', claimId)
		.where('client_id', '=', clientId)
		.executeTakeFirst();

	const totalRecovery = result?.total ?? null;

	await db
		.updateTable('claim')
		.set({ actual_recovery: totalRecovery })
		.where('id', '=', claimId)
		.where('client_id', '=', clientId)
		.execute();
}

main();
