/**
 * Test deadline filtering functionality including date ranges and user-based filtering
 */

const { Kysely, PostgresDialect } = require('kysely');
const { Pool } = require('pg');

// Create database connection
const db = new Kysely({
	dialect: new PostgresDialect({
		pool: new Pool({
			connectionString: 'postgres://postgres:password@localhost/manifest',
		}),
	}),
});

// Test configuration
const TEST_CLIENT_ID = '1c118f90-3153-4dfb-b350-953e42f0d1aa';
const ADMIN_USER_ID = '5aa91ab9-f138-4ff3-9e83-be4524cfcf62';

async function runTests() {
	console.log('🧪 Testing Deadline Filtering\n');

	try {
		// Setup: Create a contributor user for testing
		console.log('📋 Step 1: Creating test contributor user...');
		const contributor = await db
			.insertInto('users')
			.values({
				first: 'Test',
				last: 'Contributor',
				email: `test-contributor-${Date.now()}@example.com`,
				phone: '555-0001',
				role: 'Contributor',
				client_id: TEST_CLIENT_ID,
				disabled: false,
				must_change_password: false,
				password_hash: 'test',
			})
			.returningAll()
			.executeTakeFirstOrThrow();
		console.log(`✓ Created contributor: ${contributor.email}`);

		// Create test checklist
		const checklist = await db
			.insertInto('checklist')
			.values({
				name: `TEST-CHECKLIST-${Date.now()}`,
				created_by: ADMIN_USER_ID,
				client_id: TEST_CLIENT_ID,
			})
			.returningAll()
			.executeTakeFirstOrThrow();
		console.log(`✓ Created checklist: ${checklist.name}`);

		// Create test claims
		console.log('\n📋 Step 2: Creating test claims...');
		const claim1 = await db
			.insertInto('claim')
			.values({
				claim_number: `TEST-CLAIM-1-${Date.now()}`,
				client_id: TEST_CLIENT_ID,
				created_by: ADMIN_USER_ID,
			})
			.returningAll()
			.executeTakeFirstOrThrow();

		const claim2 = await db
			.insertInto('claim')
			.values({
				claim_number: `TEST-CLAIM-2-${Date.now()}`,
				client_id: TEST_CLIENT_ID,
				created_by: ADMIN_USER_ID,
			})
			.returningAll()
			.executeTakeFirstOrThrow();

		const claim3 = await db
			.insertInto('claim')
			.values({
				claim_number: `TEST-CLAIM-3-${Date.now()}`,
				client_id: TEST_CLIENT_ID,
				created_by: ADMIN_USER_ID,
			})
			.returningAll()
			.executeTakeFirstOrThrow();
		console.log(`✓ Created 3 test claims`);

		// Assign claim1 to contributor
		console.log('\n📋 Step 3: Assigning claims...');
		await db
			.insertInto('checklist_claim')
			.values({
				checklist_id: checklist.id,
				claim_id: claim1.id,
				client_id: TEST_CLIENT_ID,
				created_by: ADMIN_USER_ID,
				assignee: contributor.id,
				status: 'In Progress',
			})
			.execute();
		console.log(`✓ Assigned claim1 to contributor`);

		// Assign claim2 to admin (no contributor access)
		await db
			.insertInto('checklist_claim')
			.values({
				checklist_id: checklist.id,
				claim_id: claim2.id,
				client_id: TEST_CLIENT_ID,
				created_by: ADMIN_USER_ID,
				assignee: ADMIN_USER_ID,
				status: 'In Progress',
			})
			.execute();
		console.log(`✓ Assigned claim2 to admin`);

		// claim3 has no checklist_claim entry (unassigned)

		// Create deadlines with different dates
		console.log('\n📅 Step 4: Creating deadlines with different dates...');
		const today = new Date();
		const tomorrow = new Date(today);
		tomorrow.setDate(tomorrow.getDate() + 1);
		const nextWeek = new Date(today);
		nextWeek.setDate(nextWeek.getDate() + 7);
		const nextMonth = new Date(today);
		nextMonth.setDate(nextMonth.getDate() + 30);

		const deadline1 = await db
			.insertInto('deadline')
			.values({
				claim_id: claim1.id,
				client_id: TEST_CLIENT_ID,
				deadline_type: 'Filing Deadline',
				deadline_date: tomorrow.toISOString().split('T')[0],
				status: 'pending',
				created_by: ADMIN_USER_ID,
			})
			.returningAll()
			.executeTakeFirstOrThrow();
		console.log(`✓ Created deadline1 (claim1, tomorrow): ${deadline1.deadline_date}`);

		const deadline2 = await db
			.insertInto('deadline')
			.values({
				claim_id: claim2.id,
				client_id: TEST_CLIENT_ID,
				deadline_type: 'Response Due',
				deadline_date: nextWeek.toISOString().split('T')[0],
				status: 'pending',
				created_by: ADMIN_USER_ID,
			})
			.returningAll()
			.executeTakeFirstOrThrow();
		console.log(`✓ Created deadline2 (claim2, next week): ${deadline2.deadline_date}`);

		const deadline3 = await db
			.insertInto('deadline')
			.values({
				claim_id: claim1.id,
				client_id: TEST_CLIENT_ID,
				deadline_type: 'Follow-up',
				deadline_date: nextMonth.toISOString().split('T')[0],
				status: 'pending',
				created_by: ADMIN_USER_ID,
			})
			.returningAll()
			.executeTakeFirstOrThrow();
		console.log(`✓ Created deadline3 (claim1, next month): ${deadline3.deadline_date}`);

		const deadline4 = await db
			.insertInto('deadline')
			.values({
				claim_id: claim3.id,
				client_id: TEST_CLIENT_ID,
				deadline_type: 'Discovery',
				deadline_date: nextWeek.toISOString().split('T')[0],
				status: 'pending',
				created_by: ADMIN_USER_ID,
			})
			.returningAll()
			.executeTakeFirstOrThrow();
		console.log(`✓ Created deadline4 (claim3 unassigned, next week): ${deadline4.deadline_date}`);

		// Test 1: Admin can see all deadlines
		console.log('\n🔍 Test 1: Admin sees all deadlines (no filters)');
		const adminAllDeadlines = await db
			.selectFrom('deadline')
			.selectAll('deadline')
			.where('deadline.client_id', '=', TEST_CLIENT_ID)
			.where((eb) =>
				eb.or([
					eb('deadline.id', '=', deadline1.id),
					eb('deadline.id', '=', deadline2.id),
					eb('deadline.id', '=', deadline3.id),
					eb('deadline.id', '=', deadline4.id),
				])
			)
			.execute();
		console.log(`✓ Admin sees ${adminAllDeadlines.length} deadlines (expected: 4)`);
		if (adminAllDeadlines.length !== 4) throw new Error('Admin should see all 4 deadlines');

		// Test 2: Contributor only sees deadlines for assigned claims
		console.log('\n🔍 Test 2: Contributor sees only assigned deadlines');
		const contributorDeadlines = await db
			.selectFrom('deadline')
			.selectAll('deadline')
			.innerJoin('claim', 'deadline.claim_id', 'claim.id')
			.innerJoin('checklist_claim', 'claim.id', 'checklist_claim.claim_id')
			.where('deadline.client_id', '=', TEST_CLIENT_ID)
			.where((eb) =>
				eb.or([
					eb('checklist_claim.created_by', '=', contributor.id),
					eb('checklist_claim.assignee', '=', contributor.id),
				])
			)
			.where((eb) =>
				eb.or([
					eb('deadline.id', '=', deadline1.id),
					eb('deadline.id', '=', deadline2.id),
					eb('deadline.id', '=', deadline3.id),
					eb('deadline.id', '=', deadline4.id),
				])
			)
			.execute();
		console.log(`✓ Contributor sees ${contributorDeadlines.length} deadlines (expected: 2)`);
		console.log(
			`  Deadline IDs: ${contributorDeadlines.map((d) => d.id).join(', ')}`
		);
		if (contributorDeadlines.length !== 2)
			throw new Error('Contributor should see only 2 deadlines (claim1)');

		// Test 3: Date range filtering - next 7 days
		console.log('\n🔍 Test 3: Date range filter - next 7 days');
		const endOfWeek = new Date(today);
		endOfWeek.setDate(endOfWeek.getDate() + 7);
		const weekDeadlines = await db
			.selectFrom('deadline')
			.selectAll('deadline')
			.where('deadline.client_id', '=', TEST_CLIENT_ID)
			.where('deadline.deadline_date', '>=', today.toISOString().split('T')[0])
			.where('deadline.deadline_date', '<=', endOfWeek.toISOString().split('T')[0])
			.where((eb) =>
				eb.or([
					eb('deadline.id', '=', deadline1.id),
					eb('deadline.id', '=', deadline2.id),
					eb('deadline.id', '=', deadline3.id),
					eb('deadline.id', '=', deadline4.id),
				])
			)
			.execute();
		console.log(`✓ Found ${weekDeadlines.length} deadlines in next 7 days (expected: 3)`);
		console.log(`  Deadline IDs: ${weekDeadlines.map((d) => d.id).join(', ')}`);
		if (weekDeadlines.length !== 3)
			throw new Error('Should find 3 deadlines in next 7 days');

		// Test 4: Combined filter - contributor + date range
		console.log('\n🔍 Test 4: Combined filter - contributor assigned + next 7 days');
		const contributorWeekDeadlines = await db
			.selectFrom('deadline')
			.selectAll('deadline')
			.innerJoin('claim', 'deadline.claim_id', 'claim.id')
			.innerJoin('checklist_claim', 'claim.id', 'checklist_claim.claim_id')
			.where('deadline.client_id', '=', TEST_CLIENT_ID)
			.where((eb) =>
				eb.or([
					eb('checklist_claim.created_by', '=', contributor.id),
					eb('checklist_claim.assignee', '=', contributor.id),
				])
			)
			.where('deadline.deadline_date', '>=', today.toISOString().split('T')[0])
			.where('deadline.deadline_date', '<=', endOfWeek.toISOString().split('T')[0])
			.where((eb) =>
				eb.or([
					eb('deadline.id', '=', deadline1.id),
					eb('deadline.id', '=', deadline2.id),
					eb('deadline.id', '=', deadline3.id),
					eb('deadline.id', '=', deadline4.id),
				])
			)
			.execute();
		console.log(
			`✓ Contributor sees ${contributorWeekDeadlines.length} deadlines in next 7 days (expected: 1)`
		);
		console.log(
			`  Deadline IDs: ${contributorWeekDeadlines.map((d) => d.id).join(', ')}`
		);
		if (contributorWeekDeadlines.length !== 1)
			throw new Error('Contributor should see 1 deadline in next 7 days (deadline1 only)');

		// Cleanup
		console.log('\n🧹 Cleaning up test data...');
		await db.deleteFrom('deadline').where('id', 'in', [deadline1.id, deadline2.id, deadline3.id, deadline4.id]).execute();
		await db.deleteFrom('checklist_claim').where('checklist_id', '=', checklist.id).execute();
		await db.deleteFrom('claim').where('id', 'in', [claim1.id, claim2.id, claim3.id]).execute();
		await db.deleteFrom('checklist').where('id', '=', checklist.id).execute();
		await db.deleteFrom('users').where('id', '=', contributor.id).execute();
		console.log('✓ Test data removed');

		console.log('\n✅ All deadline filtering tests passed!');
		process.exit(0);
	} catch (error) {
		console.error('\n❌ Test failed:', error.message);
		console.error(error);
		process.exit(1);
	}
}

runTests();
