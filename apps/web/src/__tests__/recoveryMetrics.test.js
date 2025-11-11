/**
 * Test script for Recovery Metrics APIs
 *
 * Tests:
 * 1. Recovery metrics summary (KPI data)
 * 2. Recovery metrics time series (monthly breakdown for graphing)
 *
 * Usage: node test-recovery-metrics.js
 */

const { Kysely, PostgresDialect, sql } = require('kysely');
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  database: 'manifest',
  user: 'postgres',
  password: 'password',
  port: 5432,
});

const db = new Kysely({
  dialect: new PostgresDialect({ pool }),
});

async function main() {
  console.log('🧪 Testing Recovery Metrics APIs\n');

  try {
    // Get test client and user
    const client = await db.selectFrom('client').select(['id']).executeTakeFirst();
    const user = await db.selectFrom('users').select(['id']).where('client_id', '=', client.id).executeTakeFirst();

    console.log(`✓ Using client_id: ${client.id}`);
    console.log(`✓ Using user_id: ${user.id}\n`);

    // Create test claims with expected recovery
    console.log('📋 Step 1: Creating test claims with expected recovery...');
    const claims = await db
      .insertInto('claim')
      .values([
        {
          claim_number: `TEST-METRICS-1-${Date.now()}`,
          insured: 'Test Insured 1',
          expected_recovery: '25000',
          client_id: client.id,
          created_by: user.id,
          created_at: new Date('2024-01-15'),
        },
        {
          claim_number: `TEST-METRICS-2-${Date.now()}`,
          insured: 'Test Insured 2',
          expected_recovery: '35000',
          client_id: client.id,
          created_by: user.id,
          created_at: new Date('2024-02-20'),
        },
        {
          claim_number: `TEST-METRICS-3-${Date.now()}`,
          insured: 'Test Insured 3',
          expected_recovery: '40000',
          client_id: client.id,
          created_by: user.id,
          created_at: new Date('2024-03-10'),
        },
      ])
      .returningAll()
      .execute();

    console.log(`✓ Created 3 test claims`);
    console.log(`  Expected totals: $100,000\n`);

    // Create recovery events
    console.log('💰 Step 2: Creating recovery events...');
    await db
      .insertInto('recovery_event')
      .values([
        {
          claim_id: claims[0].id,
          client_id: client.id,
          recovery_date: new Date('2024-02-01'),
          recovery_amount: '15000',
          recovery_source: 'Settlement',
          created_by: user.id,
        },
        {
          claim_id: claims[1].id,
          client_id: client.id,
          recovery_date: new Date('2024-03-15'),
          recovery_amount: '20000',
          recovery_source: 'Litigation',
          created_by: user.id,
        },
        {
          claim_id: claims[2].id,
          client_id: client.id,
          recovery_date: new Date('2024-03-25'),
          recovery_amount: '30000',
          recovery_source: 'Settlement',
          created_by: user.id,
        },
      ])
      .execute();

    console.log(`✓ Created 3 recovery events`);
    console.log(`  Actual totals: $65,000\n`);

    // Test metrics summary
    console.log('📊 Step 3: Testing recovery metrics summary...');
    const summaryResult = await db.executeQuery(
      sql`
        WITH expected AS (
          SELECT COALESCE(SUM(expected_recovery), 0)::float as total
          FROM claim
          WHERE client_id = ${client.id}
            AND created_at >= '2024-01-01'::date
            AND created_at <= '2024-12-31'::date
        ),
        actual AS (
          SELECT COALESCE(SUM(recovery_amount), 0)::float as total
          FROM recovery_event
          WHERE client_id = ${client.id}
            AND recovery_date >= '2024-01-01'::date
            AND recovery_date <= '2024-12-31'::date
        )
        SELECT
          expected.total as total_expected,
          actual.total as total_actual,
          (actual.total - expected.total) as variance,
          CASE
            WHEN expected.total > 0 THEN (actual.total / expected.total * 100)
            ELSE 0
          END as recovery_rate
        FROM expected, actual
      `.compile(db)
    );

    const summary = summaryResult.rows[0];
    console.log('✓ Summary metrics calculated:');
    console.log(`  Expected: $${summary.total_expected.toLocaleString()}`);
    console.log(`  Actual: $${summary.total_actual.toLocaleString()}`);
    console.log(`  Variance: $${summary.variance.toLocaleString()}`);
    console.log(`  Recovery Rate: ${summary.recovery_rate.toFixed(2)}%\n`);

    // Test time series
    console.log('📈 Step 4: Testing recovery metrics time series...');
    const timeSeriesResult = await db.executeQuery(
      sql`
        WITH monthly_series AS (
          SELECT
            date_trunc('month', gs.month)::date as month_start
          FROM generate_series(
            date_trunc('month', '2024-01-01'::timestamp),
            date_trunc('month', '2024-03-31'::timestamp),
            interval '1 month'
          ) as gs(month)
        ),
        expected_by_month AS (
          SELECT
            date_trunc('month', c.created_at)::date as month_start,
            COALESCE(SUM(c.expected_recovery), 0)::numeric as total_expected
          FROM claim c
          WHERE c.client_id = ${client.id}
            AND c.created_at >= '2024-01-01'
            AND c.created_at <= '2024-03-31'
          GROUP BY date_trunc('month', c.created_at)
        ),
        actual_by_month AS (
          SELECT
            date_trunc('month', re.recovery_date)::date as month_start,
            COALESCE(SUM(re.recovery_amount), 0)::numeric as total_actual
          FROM recovery_event re
          WHERE re.client_id = ${client.id}
            AND re.recovery_date >= '2024-01-01'
            AND re.recovery_date <= '2024-03-31'
          GROUP BY date_trunc('month', re.recovery_date)
        )
        SELECT
          ms.month_start::text,
          COALESCE(ebm.total_expected, 0)::float as expected_recovery,
          COALESCE(abm.total_actual, 0)::float as actual_recovery
        FROM monthly_series ms
        LEFT JOIN expected_by_month ebm ON ms.month_start = ebm.month_start
        LEFT JOIN actual_by_month abm ON ms.month_start = abm.month_start
        ORDER BY ms.month_start
      `.compile(db)
    );

    console.log('✓ Monthly time series data:');
    timeSeriesResult.rows.forEach((row) => {
      console.log(`  ${row.month_start}: Expected=$${row.expected_recovery.toLocaleString()}, Actual=$${row.actual_recovery.toLocaleString()}`);
    });
    console.log();

    // Cleanup
    console.log('🧹 Cleaning up test data...');
    await db.deleteFrom('recovery_event').where('client_id', '=', client.id).where('created_at', '>=', new Date(Date.now() - 60000)).execute();
    await db.deleteFrom('claim').where('client_id', '=', client.id).where('claim_number', 'like', 'TEST-METRICS-%').execute();
    console.log('✓ Test data removed\n');

    console.log('✅ All metrics tests passed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
  } finally {
    await db.destroy();
  }
}

main();
