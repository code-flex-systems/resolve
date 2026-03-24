/**
 * Financial Reporting Queries for Claim Subrogation Application
 *
 * Each query is structured to return data shaped for recharts consumption.
 * Query functions accept a Kysely DB instance and client_id.
 *
 * Recharts component recommendations are noted per query.
 *
 * ============================================================================
 * RECOMMENDED INDEXES (add to migrations):
 * ============================================================================
 *
 * -- Aging, cap utilization, variance, negotiation scatter, carrier rate
 * CREATE INDEX idx_settlement_client_active
 *   ON settlement (client_id, status) WHERE deleted_at IS NULL;
 * CREATE INDEX idx_settlement_demand_date
 *   ON settlement (client_id, demand_date) WHERE deleted_at IS NULL;
 *
 * -- Aging (settled_unpaid subquery), variance decomposition
 * CREATE INDEX idx_recovery_event_settlement
 *   ON recovery_event (settlement_id) WHERE deleted_at IS NULL;
 * CREATE INDEX idx_recovery_event_claim
 *   ON recovery_event (claim_id, recovery_date) WHERE deleted_at IS NULL;
 *
 * -- Net recovery, payment-to-recovery timeline
 * CREATE INDEX idx_claim_payment_subrogable
 *   ON claim_payment (client_id, claim_id, payment_date)
 *   WHERE deleted_at IS NULL AND is_subrogable = true;
 *
 * -- Variance decomposition (correlated subquery → now CTE)
 * CREATE INDEX idx_claim_payment_coverage
 *   ON claim_payment (claim_id, coverage_id)
 *   WHERE deleted_at IS NULL AND is_subrogable = true AND is_expense = false;
 *
 * -- Statute deadline risk
 * CREATE INDEX idx_claim_coverage_statute
 *   ON claim_coverage (client_id, statute_date)
 *   WHERE deleted_at IS NULL AND subro_applicable = true AND statute_date IS NOT NULL;
 *
 * -- Funnel, general claim queries
 * CREATE INDEX idx_claim_substatus
 *   ON claim (client_id, substatus) WHERE substatus IS NOT NULL;
 *
 * ============================================================================
 */

import { type DB } from '@/api/database/types';
import { type Kysely, sql } from 'kysely';

// ============================================================================
// 1. RECOVERY AGING BREAKDOWN
// ============================================================================
// Visualization: Stacked BarChart (x = aging bucket, y = dollar amount)
//   - Stack by status (open demand, in negotiation, settled awaiting payment)
//   - Or use a simple BarChart with a single series for total outstanding
//
// Data shape for recharts:
// { bucket: '0-30', open_demand: 45000, in_negotiation: 120000,
//   settled_outstanding: 30000, count: 12, total_recovered: 8000 }
//
// REACT QUERY:
//   staleTime: 5 * 60 * 1000 (5 min)
//   gcTime: 15 * 60 * 1000
//   refetchOnWindowFocus: true
//
//   Rationale: This is the "where should I focus today" view — typically on a
//   dashboard landing page. New settlements and status changes happen throughout
//   the day but minute-level freshness isn't required. 5 min stale + refetch on
//   focus gives a good balance. Invalidate on settlement create/update mutations.
//
// PERF NOTES:
//   - Pre-aggregates recovery amounts per settlement in a CTE, then left
//     joins into the bucketed CTE. This avoids a correlated subquery inside
//     the FILTER clause and correctly handles partial recoveries by computing
//     (settlement_amount - recovered) as the outstanding balance.
//   - The settlement_recovered CTE benefits from idx_recovery_event_settlement.
//   - Total rows scanned = open settlements for client. For most orgs this
//     is hundreds to low thousands — fast regardless.

export async function getRecoveryAgingBreakdown(db: Kysely<DB>, clientId: string, range: [Date, Date]) {
	return (
		db
			// Pre-aggregate recovery amounts per settlement
			.with('settlement_recovered', (qb) =>
				qb
					.selectFrom('recovery_event as re')
					.where('re.client_id', '=', clientId)
					.where('re.deleted_at', 'is', null)
					.select(['re.settlement_id', sql<number>`sum(re.recovery_amount)`.as('recovered')])
					.groupBy('re.settlement_id')
			)
			// Compute bucket + outstanding balance per settlement
			.with('bucketed', (qb) =>
				qb
					.selectFrom('settlement as s')
					.leftJoin('settlement_recovered as sr', 'sr.settlement_id', 's.id')
					.where('s.client_id', '=', clientId)
					.where('s.deleted_at', 'is', null)
					.where('s.status', '!=', 'closed')
					.where('s.demand_date', '>=', range[0])
					.where('s.demand_date', '<=', range[1])
					.select([
						's.id',
						's.demand_amount',
						's.settlement_amount',
						's.status',
						sql<number>`coalesce(sr.recovered, 0)`.as('recovered'),
						// Outstanding balance: for settled items, settlement - recovered;
						// for open/negotiation, full demand is outstanding
						sql<number>`
            case
              when s.status = 'settled' then
                greatest(coalesce(s.settlement_amount, 0) - coalesce(sr.recovered, 0), 0)
              else s.demand_amount
            end
          `.as('outstanding'),
						sql<number>`
            case
              when extract(day from now() - s.demand_date) <= 30 then 1
              when extract(day from now() - s.demand_date) <= 60 then 2
              when extract(day from now() - s.demand_date) <= 90 then 3
              when extract(day from now() - s.demand_date) <= 180 then 4
              else 5
            end
          `.as('bucket_sort'),
						sql<string>`
            case
              when extract(day from now() - s.demand_date) <= 30 then '0-30'
              when extract(day from now() - s.demand_date) <= 60 then '31-60'
              when extract(day from now() - s.demand_date) <= 90 then '61-90'
              when extract(day from now() - s.demand_date) <= 180 then '91-180'
              else '180+'
            end
          `.as('bucket'),
					])
			)
			.selectFrom('bucketed as b')
			.select([
				'b.bucket',
				sql<number>`
        coalesce(sum(b.demand_amount) filter (where b.status = 'sent'), 0)
      `.as('open_demand'),
				sql<number>`
        coalesce(sum(b.demand_amount) filter (where b.status not in ('sent', 'settled', 'closed')), 0)
      `.as('in_negotiation'),
				// Settled with remaining balance (includes both zero-recovery and partial)
				sql<number>`
        coalesce(sum(b.outstanding) filter (
          where b.status = 'settled' and b.outstanding > 0
        ), 0)
      `.as('settled_outstanding'),
				sql<number>`count(*)`.as('count'),
				// Additional context: how much has already been recovered across all buckets
				sql<number>`coalesce(sum(b.recovered), 0)`.as('total_recovered'),
			])
			.groupBy(['b.bucket', 'b.bucket_sort'])
			.orderBy('b.bucket_sort')
			.execute()
	).then((rows) =>
		rows.map((r) => ({
			...r,
			open_demand: Number(r.open_demand),
			in_negotiation: Number(r.in_negotiation),
			settled_outstanding: Number(r.settled_outstanding),
			count: Number(r.count),
			total_recovered: Number(r.total_recovered),
		}))
	);
}

// ============================================================================
// 2. RECOVERY RATE BY ADVERSE CARRIER
// ============================================================================
// Visualization: BarChart (horizontal) sorted by recovery_rate descending
//   - Each bar = a carrier/party, length = recovery rate percentage
//   - Add a reference line at the portfolio average
//   - Tooltip shows demand total, settled total, count
//
// Data shape:
// { party_name: 'State Farm', demand_total: 500000, settled_total: 420000,
//   recovery_rate: 84.0, avg_days_to_settle: 45, settlement_count: 23 }
//
// REACT QUERY:
//   staleTime: 30 * 60 * 1000 (30 min)
//   gcTime: 60 * 60 * 1000 (1 hr)
//   refetchOnWindowFocus: false
//
//   Rationale: This is a strategic/analytical view, not operational. The
//   underlying data (settled amounts by carrier) changes slowly — maybe a
//   few settlements close per day. Users looking at this are analyzing
//   trends, not making real-time decisions. 30 min stale is generous.
//   Invalidate on settlement status change to 'settled' or 'closed'.
//
// PERF NOTES:
//   - Two inner joins on PKs (claim_party.id, party.id) — fast.
//   - HAVING count(*) >= 3 filters in the aggregate phase, not a concern.
//   - FIX: Added settlement_date IS NOT NULL filter to avoid nulls
//     poisoning avg_days_to_settle. Previously, rows with settlement_amount
//     but no settlement_date would produce null in the extract(), and
//     avg() silently ignores nulls which skews the average downward.

export async function getRecoveryRateByCarrier(db: Kysely<DB>, clientId: string, range: [Date, Date]) {
	return db
		.selectFrom('settlement as s')
		.innerJoin('claim_party as cp', 'cp.id', 's.claim_party_id')
		.innerJoin('party as p', 'p.id', 'cp.party_id')
		.where('s.client_id', '=', clientId)
		.where('s.deleted_at', 'is', null)
		.where('s.settlement_amount', 'is not', null)
		.where('s.settlement_date', 'is not', null) // FIX: was missing
		.where('s.settlement_date', '>=', range[0])
		.where('s.settlement_date', '<=', range[1])
		.where('cp.deleted_at', 'is', null)
		.select([
			'p.id as party_id',
			'p.name as party_name',
			sql<number>`sum(s.demand_amount)`.as('demand_total'),
			sql<number>`sum(s.settlement_amount)`.as('settled_total'),
			sql<number>`
        round(
          (sum(s.settlement_amount)::numeric / nullif(sum(s.demand_amount), 0)) * 100,
          1
        )
      `.as('recovery_rate'),
			sql<number>`
        round(avg((s.settlement_date - s.demand_date)))
      `.as('avg_days_to_settle'),
			sql<number>`count(*)`.as('settlement_count'),
		])
		.groupBy(['p.id', 'p.name'])
		.having(sql`count(*)`, '>=', sql`3`)
		.orderBy('recovery_rate', 'desc')
		.execute()
		.then((rows) =>
			rows.map((r) => ({
				...r,
				demand_total: Number(r.demand_total),
				settled_total: Number(r.settled_total),
				recovery_rate: Number(r.recovery_rate),
				avg_days_to_settle: Number(r.avg_days_to_settle),
				settlement_count: Number(r.settlement_count),
			}))
		);
}

// ============================================================================
// 3. NET RECOVERY IMPACT / LOSS RATIO
// ============================================================================
// Visualization: ComposedChart (Bar + Line)
//   - Bars: stacked showing payments_out (negative) and recovery_in (positive)
//   - Line overlay: net_recovery_rate as a percentage
//   - Group by month or by line_of_business
//
// Data shape (by month):
// { period: '2025-01', payments_out: 250000, expenses: 12000,
//   recovery_in: 180000, net_position: -82000, net_recovery_rate: 69.2 }
//
// REACT QUERY:
//   staleTime: 15 * 60 * 1000 (15 min)
//   gcTime: 30 * 60 * 1000
//   refetchOnWindowFocus: false
//
//   Rationale: Monthly aggregation means past months are immutable — only
//   the current month changes. 15 min is conservative. For a further
//   optimization, you could split this: fetch past months with staleTime
//   Infinity and only refetch the current month on a shorter cycle. But
//   the query is cheap enough that 15 min across the board is simpler.
//   Invalidate on payment create or recovery event create.
//
// PERF NOTES:
//   - FIX: Replaced sql.raw() for months parameter with a parameterized
//     interval. The original used sql.raw(String(months)) which is a
//     SQL injection vector if months ever comes from user input.
//   - The generate_series + left joins pattern is fine for 12-24 rows.
//   - Both subqueries pre-aggregate before the join, so the join is
//     on ~12 rows each — negligible cost.

export async function getNetRecoveryByMonth(db: Kysely<DB>, clientId: string, range: [Date, Date]) {
	// Use raw SQL for the generate_series + left join pattern since Kysely's
	// type system doesn't support joining subqueries on raw SQL expressions
	const rows = await sql<{
		period: string;
		payments_out: number;
		expenses: number;
		recovery_in: number;
		net_position: number;
		net_recovery_rate: number;
	}>`
    WITH pmt AS (
      SELECT to_char(cp.payment_date, 'YYYY-MM') AS period,
        sum(CASE WHEN cp.is_expense = false THEN cp.payment_amount ELSE 0 END) AS payments_out,
        sum(CASE WHEN cp.is_expense = true THEN cp.payment_amount ELSE 0 END) AS expenses
      FROM claim_payment cp
      WHERE cp.client_id = ${clientId}
        AND cp.deleted_at IS NULL
        AND cp.is_subrogable = true
        AND cp.payment_date >= ${range[0]}
        AND cp.payment_date <= ${range[1]}
      GROUP BY 1
    ),
    rec AS (
      SELECT to_char(re.recovery_date, 'YYYY-MM') AS period,
        sum(re.recovery_amount) AS recovery_in
      FROM recovery_event re
      WHERE re.client_id = ${clientId}
        AND re.deleted_at IS NULL
        AND re.recovery_date >= ${range[0]}
        AND re.recovery_date <= ${range[1]}
      GROUP BY 1
    )
    SELECT
      to_char(gs.period, 'YYYY-MM') AS period,
      coalesce(pmt.payments_out, 0) AS payments_out,
      coalesce(pmt.expenses, 0) AS expenses,
      coalesce(rec.recovery_in, 0) AS recovery_in,
      coalesce(rec.recovery_in, 0) - coalesce(pmt.payments_out, 0) - coalesce(pmt.expenses, 0) AS net_position,
      round(
        coalesce(rec.recovery_in, 0)::numeric
        / nullif(coalesce(pmt.payments_out, 0) + coalesce(pmt.expenses, 0), 0)
        * 100, 1
      ) AS net_recovery_rate
    FROM generate_series(
      date_trunc('month', ${range[0]}::date),
      date_trunc('month', ${range[1]}::date),
      interval '1 month'
    ) AS gs(period)
    LEFT JOIN pmt ON pmt.period = to_char(gs.period, 'YYYY-MM')
    LEFT JOIN rec ON rec.period = to_char(gs.period, 'YYYY-MM')
    ORDER BY period
  `.execute(db);

	return rows.rows.map((r) => ({
		...r,
		payments_out: Number(r.payments_out),
		expenses: Number(r.expenses),
		recovery_in: Number(r.recovery_in),
		net_position: Number(r.net_position),
		net_recovery_rate: Number(r.net_recovery_rate),
	}));
}

// Alternate: breakdown by line of business
//
// REACT QUERY:
//   staleTime: 15 * 60 * 1000 (15 min)
//   gcTime: 30 * 60 * 1000
//   refetchOnWindowFocus: false
//
//   Same rationale as monthly — slow-moving aggregate data.
//
// PERF NOTES:
//   - FIX: The original used `sum(distinct cp.payment_amount)` which is
//     WRONG. `distinct` deduplicates by VALUE, not by row. If two different
//     payments both happen to be $5,000, only one would be counted.
//     Restructured to use CTEs that pre-aggregate per claim before joining,
//     which eliminates the fan-out problem entirely.

export async function getNetRecoveryByLineOfBusiness(db: Kysely<DB>, clientId: string, range: [Date, Date]) {
	return db
		.with('claim_payments_agg', (qb) =>
			qb
				.selectFrom('claim_payment as cp')
				.where('cp.client_id', '=', clientId)
				.where('cp.deleted_at', 'is', null)
				.where('cp.payment_date', '>=', range[0])
				.where('cp.payment_date', '<=', range[1])
				.where('cp.is_subrogable', '=', true)
				.select([
					'cp.claim_id',
					sql<number>`
            sum(case when cp.is_expense = false then cp.payment_amount else 0 end)
          `.as('payments_out'),
					sql<number>`
            sum(case when cp.is_expense = true then cp.payment_amount else 0 end)
          `.as('expenses'),
				])
				.groupBy('cp.claim_id')
		)
		.with('claim_recoveries_agg', (qb) =>
			qb
				.selectFrom('recovery_event as re')
				.where('re.client_id', '=', clientId)
				.where('re.deleted_at', 'is', null)
				.where('re.recovery_date', '>=', range[0])
				.where('re.recovery_date', '<=', range[1])
				.select(['re.claim_id', sql<number>`sum(re.recovery_amount)`.as('recovery_in')])
				.groupBy('re.claim_id')
		)
		.selectFrom('claim as c')
		.leftJoin('claim_payments_agg as cpa', 'cpa.claim_id', 'c.id')
		.leftJoin('claim_recoveries_agg as cra', 'cra.claim_id', 'c.id')
		.where('c.client_id', '=', clientId)
		.select([
			sql<string>`coalesce(c.line_of_business, 'Unclassified')`.as('line_of_business'),
			sql<number>`coalesce(sum(cpa.payments_out), 0)`.as('payments_out'),
			sql<number>`coalesce(sum(cpa.expenses), 0)`.as('expenses'),
			sql<number>`coalesce(sum(cra.recovery_in), 0)`.as('recovery_in'),
			sql<number>`count(distinct c.id)`.as('claim_count'),
			sql<number>`
        round(
          coalesce(sum(cra.recovery_in), 0)::numeric
          / nullif(coalesce(sum(cpa.payments_out), 0) + coalesce(sum(cpa.expenses), 0), 0)
          * 100,
          1
        )
      `.as('net_recovery_rate'),
		])
		.groupBy('c.line_of_business')
		.orderBy('payments_out', 'desc')
		.execute()
		.then((rows) =>
			rows.map((r) => ({
				...r,
				payments_out: Number(r.payments_out),
				expenses: Number(r.expenses),
				recovery_in: Number(r.recovery_in),
				claim_count: Number(r.claim_count),
				net_recovery_rate: Number(r.net_recovery_rate),
			}))
		);
}

// ============================================================================
// 4. PAYMENT-TO-RECOVERY TIMELINE
// ============================================================================
// Visualization: AreaChart or LineChart showing trend over time
//   - X axis: month of first payment
//   - Y axis: average days to first recovery
//   - Second line for median
//
// Data shape (trend):
// { period: '2025-01', avg_days_to_first_recovery: 67, median_days: 58, claim_count: 14 }
//
// REACT QUERY:
//   staleTime: 30 * 60 * 1000 (30 min)
//   gcTime: 60 * 60 * 1000 (1 hr)
//   refetchOnWindowFocus: false
//
//   Rationale: Historical cycle time data is very stable. Past months never
//   change. Even the current month only shifts as new recoveries come in,
//   which is a handful per day at most. This is the kind of chart a manager
//   checks weekly, not hourly. 30 min stale is fine.
//   Could use staleTime: Infinity with manual invalidation if you wanted.
//
// PERF NOTES:
//   - Both CTEs do a full scan of their table filtered by client_id, then
//     aggregate with MIN + GROUP BY. With idx_claim_payment_subrogable and
//     idx_recovery_event_claim, these are index scans.
//   - percentile_cont is an ordered-set aggregate — more expensive than avg
//     but unavoidable for median. For very large datasets (50k+ claims),
//     consider approximating with percentile_disc or dropping median.
//   - The inner join means we only include claims that have both a payment
//     AND a recovery. This is correct — we can't compute cycle time without
//     both endpoints.

export async function getPaymentToRecoveryTimeline(db: Kysely<DB>, clientId: string, range: [Date, Date]) {
	return db
		.with('first_payment', (qb) =>
			qb
				.selectFrom('claim_payment as cp')
				.where('cp.client_id', '=', clientId)
				.where('cp.deleted_at', 'is', null)
				.where('cp.is_subrogable', '=', true)
				.where('cp.is_expense', '=', false)
				.where('cp.payment_date', '>=', range[0])
				.where('cp.payment_date', '<=', range[1])
				.select(['cp.claim_id', sql<Date>`min(cp.payment_date)`.as('first_payment_date')])
				.groupBy('cp.claim_id')
		)
		.with('first_recovery', (qb) =>
			qb
				.selectFrom('recovery_event as re')
				.where('re.client_id', '=', clientId)
				.where('re.deleted_at', 'is', null)
				.select(['re.claim_id', sql<Date>`min(re.recovery_date)`.as('first_recovery_date')])
				.groupBy('re.claim_id')
		)
		.selectFrom('first_payment as fp')
		.innerJoin('first_recovery as fr', 'fr.claim_id', 'fp.claim_id')
		.where(sql`fr.first_recovery_date >= fp.first_payment_date`, 'is', sql`true`)
		.select([
			sql<string>`to_char(fp.first_payment_date, 'YYYY-MM')`.as('period'),
			sql<number>`
        round(avg((fr.first_recovery_date - fp.first_payment_date)))
      `.as('avg_days_to_first_recovery'),
			sql<number>`
        round(
          percentile_cont(0.5) within group (
            order by (fr.first_recovery_date - fp.first_payment_date)
          )::numeric
        )
      `.as('median_days'),
			sql<number>`count(*)`.as('claim_count'),
		])
		.groupBy(sql`to_char(fp.first_payment_date, 'YYYY-MM')`)
		.orderBy('period')
		.execute()
		.then((rows) =>
			rows.map((r) => ({
				...r,
				avg_days_to_first_recovery: Number(r.avg_days_to_first_recovery),
				median_days: Number(r.median_days),
				claim_count: Number(r.claim_count),
			}))
		);
}

// Histogram variant: distribution of days-to-recovery
//
// REACT QUERY: Same as timeline above — staleTime: 30 min.
//
// PERF NOTES:
//   - FIX: The original ORDER BY referenced `days_to_recovery` from the
//     deltas CTE, but in the outer aggregate query that column isn't in
//     the GROUP BY — Postgres would reject this. Fixed to order by
//     bucket_sort which IS in the GROUP BY.

export async function getRecoveryTimeDistribution(db: Kysely<DB>, clientId: string, range: [Date, Date]) {
	return db
		.with('first_payment', (qb) =>
			qb
				.selectFrom('claim_payment as cp')
				.where('cp.client_id', '=', clientId)
				.where('cp.deleted_at', 'is', null)
				.where('cp.is_subrogable', '=', true)
				.where('cp.is_expense', '=', false)
				.where('cp.payment_date', '>=', range[0])
				.where('cp.payment_date', '<=', range[1])
				.select(['cp.claim_id', sql<Date>`min(cp.payment_date)`.as('first_payment_date')])
				.groupBy('cp.claim_id')
		)
		.with('first_recovery', (qb) =>
			qb
				.selectFrom('recovery_event as re')
				.where('re.client_id', '=', clientId)
				.where('re.deleted_at', 'is', null)
				.select(['re.claim_id', sql<Date>`min(re.recovery_date)`.as('first_recovery_date')])
				.groupBy('re.claim_id')
		)
		.with('deltas', (qb) =>
			qb
				.selectFrom('first_payment as fp')
				.innerJoin('first_recovery as fr', 'fr.claim_id', 'fp.claim_id')
				.where(sql`fr.first_recovery_date >= fp.first_payment_date`, 'is', sql`true`)
				.select([
					'fp.claim_id',
					sql<number>`
            (fr.first_recovery_date - fp.first_payment_date)
          `.as('days_to_recovery'),
					// Pre-compute bucket and sort key to avoid ambiguity in outer query
					sql<string>`
            case
              when (fr.first_recovery_date - fp.first_payment_date) <= 30 then '0-30'
              when (fr.first_recovery_date - fp.first_payment_date) <= 60 then '31-60'
              when (fr.first_recovery_date - fp.first_payment_date) <= 90 then '61-90'
              when (fr.first_recovery_date - fp.first_payment_date) <= 120 then '91-120'
              when (fr.first_recovery_date - fp.first_payment_date) <= 180 then '121-180'
              else '180+'
            end
          `.as('bucket'),
					sql<number>`
            case
              when (fr.first_recovery_date - fp.first_payment_date) <= 30 then 1
              when (fr.first_recovery_date - fp.first_payment_date) <= 60 then 2
              when (fr.first_recovery_date - fp.first_payment_date) <= 90 then 3
              when (fr.first_recovery_date - fp.first_payment_date) <= 120 then 4
              when (fr.first_recovery_date - fp.first_payment_date) <= 180 then 5
              else 6
            end
          `.as('bucket_sort'),
				])
		)
		.selectFrom('deltas')
		.select([
			'deltas.bucket',
			sql<number>`count(*)`.as('count'),
			sql<number>`round(avg(deltas.days_to_recovery))`.as('avg_days'),
		])
		.groupBy(['deltas.bucket', 'deltas.bucket_sort'])
		.orderBy('deltas.bucket_sort')
		.execute()
		.then((rows) =>
			rows.map((r) => ({
				...r,
				count: Number(r.count),
				avg_days: Number(r.avg_days),
			}))
		);
}

// ============================================================================
// 5. COVERAGE CAP UTILIZATION
// ============================================================================
// Visualization: PieChart or Donut showing proportion of settlements
//   constrained by cap vs. not.
//
// Data shape (summary):
// { category: 'Cap Constrained', count: 45, total_demanded: 2000000,
//   total_settled: 800000, demand_exceeding_cap: 1200000 }
//
// REACT QUERY:
//   staleTime: 15 * 60 * 1000 (15 min)
//   gcTime: 30 * 60 * 1000
//   refetchOnWindowFocus: false
//
//   Rationale: Cap analysis is strategic. Policy limits don't change often,
//   and settlements close at a pace of maybe a few per day. 15 min is fine.
//   Invalidate on settlement create/update.
//
// PERF NOTES:
//   - Clean query — two inner joins on PKs, filtered aggregation.
//   - Only scans settlements where both settlement_amount and policy_limit
//     are non-null, which is a subset of total settlements.
//   - No issues found in review.

export async function getCoverageCapUtilization(db: Kysely<DB>, clientId: string, range: [Date, Date]) {
	return db
		.selectFrom('settlement as s')
		.innerJoin('claim_party as cp', 'cp.id', 's.claim_party_id')
		.where('s.client_id', '=', clientId)
		.where('s.deleted_at', 'is', null)
		.where('s.settlement_amount', 'is not', null)
		.where('s.demand_date', '>=', range[0])
		.where('s.demand_date', '<=', range[1])
		.where('cp.deleted_at', 'is', null)
		.where('cp.policy_limit', 'is not', null)
		.select([
			sql<string>`
        case
          when s.settlement_amount >= cp.policy_limit * 0.90 then 'Cap Constrained (≥90% of limit)'
          when s.settlement_amount >= cp.policy_limit * 0.70 then 'Near Cap (70-90% of limit)'
          else 'Below Cap (<70% of limit)'
        end
      `.as('category'),
			sql<number>`count(*)`.as('count'),
			sql<number>`sum(s.demand_amount)`.as('total_demanded'),
			sql<number>`sum(s.settlement_amount)`.as('total_settled'),
			sql<number>`sum(cp.policy_limit)`.as('total_policy_limits'),
			sql<number>`
        sum(
          case
            when s.demand_amount > cp.policy_limit
            then s.demand_amount - cp.policy_limit
            else 0
          end
        )
      `.as('demand_exceeding_cap'),
		])
		.groupBy(sql`1`)
		.execute()
		.then((rows) =>
			rows.map((r) => ({
				...r,
				count: Number(r.count),
				total_demanded: Number(r.total_demanded),
				total_settled: Number(r.total_settled),
				total_policy_limits: Number(r.total_policy_limits),
				demand_exceeding_cap: Number(r.demand_exceeding_cap),
			}))
		);
}

// Detailed: per-carrier cap analysis
//
// REACT QUERY: Same as summary — staleTime: 15 min.
// PERF NOTES: No issues. HAVING >= 2 filters small carriers.

export async function getCoverageCapByCarrier(db: Kysely<DB>, clientId: string, range: [Date, Date]) {
	return db
		.selectFrom('settlement as s')
		.innerJoin('claim_party as cp', 'cp.id', 's.claim_party_id')
		.innerJoin('party as p', 'p.id', 'cp.party_id')
		.where('s.client_id', '=', clientId)
		.where('s.deleted_at', 'is', null)
		.where('s.settlement_amount', 'is not', null)
		.where('s.demand_date', '>=', range[0])
		.where('s.demand_date', '<=', range[1])
		.where('cp.deleted_at', 'is', null)
		.where('cp.policy_limit', 'is not', null)
		.select([
			'p.name as party_name',
			sql<number>`count(*)`.as('settlement_count'),
			sql<number>`
        count(*) filter (where s.settlement_amount >= cp.policy_limit * 0.90)
      `.as('cap_constrained_count'),
			sql<number>`
        round(
          count(*) filter (where s.settlement_amount >= cp.policy_limit * 0.90)::numeric
          / count(*)
          * 100, 1
        )
      `.as('cap_constrained_pct'),
			sql<number>`sum(s.demand_amount)`.as('total_demanded'),
			sql<number>`sum(s.settlement_amount)`.as('total_settled'),
			sql<number>`
        sum(greatest(s.demand_amount - cp.policy_limit, 0))
      `.as('amount_over_cap'),
		])
		.groupBy(['p.id', 'p.name'])
		.having(sql`count(*)`, '>=', sql`2`)
		.orderBy('cap_constrained_pct', 'desc')
		.execute()
		.then((rows) =>
			rows.map((r) => ({
				...r,
				settlement_count: Number(r.settlement_count),
				cap_constrained_count: Number(r.cap_constrained_count),
				cap_constrained_pct: Number(r.cap_constrained_pct),
				total_demanded: Number(r.total_demanded),
				total_settled: Number(r.total_settled),
				amount_over_cap: Number(r.amount_over_cap),
			}))
		);
}

// ============================================================================
// 6. VARIANCE DECOMPOSITION
// ============================================================================
// Visualization: Waterfall chart (stacked BarChart with invisible base)
//
// Data shape:
// [
//   { name: 'Expected Recovery', value: 5000000, type: 'total' },
//   { name: 'Liability Reduction', value: -400000, type: 'delta' },
//   ...
// ]
//
// REACT QUERY:
//   staleTime: 30 * 60 * 1000 (30 min)
//   gcTime: 60 * 60 * 1000 (1 hr)
//   refetchOnWindowFocus: false
//
//   Rationale: This is the most expensive query in the set and the most
//   analytical. Nobody needs real-time variance decomposition. 30 min
//   stale is appropriate. Consider prefetching this in the background
//   when the user navigates to the analytics section rather than waiting
//   for the specific tab/page that renders it.
//   Invalidate on: settlement create/update, recovery event create,
//   liability percentage change.
//
// PERF NOTES:
//   - FIX: The original had two correlated subqueries inside the CTE
//     (one for subrogable_payments, one for total_recovered). These
//     execute once per settlement row. For a client with 1000 settlements,
//     that's 2000 subqueries.
//     Refactored to pre-aggregate both into CTEs and join them in,
//     which converts N subqueries into 2 aggregate scans + hash joins.
//   - FIX: Removed unnecessary left join to claim table — settlement
//     already has claim_id and we weren't selecting any claim columns.
//   - The final SELECT aggregates all settlement_detail rows into a
//     single row, so the outer query is trivially fast.

export async function getVarianceDecomposition(db: Kysely<DB>, clientId: string, range: [Date, Date]) {
	// Both expected and actual use claim-level cached fields, scoped to claims
	// created in the date range. No recovery_event joins needed.
	// This answers "for claims created in this period, how is recovery progressing?"
	const rows = await db
		.selectFrom('claim as c')
		.where('c.client_id', '=', clientId)
		.where('c.created_at', '>=', range[0])
		.where('c.created_at', '<=', range[1])
		.select([
			'c.recovery_status',
			sql<number>`count(*)`.as('count'),
			// Variance = expected - actual (how much is unrecovered)
			sql<number>`coalesce(sum(greatest(coalesce(c.expected_recovery, 0) - coalesce(c.actual_recovery, 0), 0)), 0)`.as(
				'variance'
			),
		])
		.where('c.expected_recovery', 'is not', null)
		.where(sql`c.expected_recovery`, '>', sql`0`)
		.groupBy('c.recovery_status')
		.execute();

	const statusMap: Record<string, { variance: number; count: number }> = {};
	for (const row of rows) {
		if (row.recovery_status) {
			statusMap[row.recovery_status] = {
				variance: Number(row.variance),
				count: Number(row.count),
			};
		}
	}

	return [
		{
			name: 'Closed - No Recovery',
			value: statusMap['closed_no_recovery']?.variance ?? 0,
			count: statusMap['closed_no_recovery']?.count ?? 0,
		},
		{
			name: 'Pending - Not Started',
			value: statusMap['pending']?.variance ?? 0,
			count: statusMap['pending']?.count ?? 0,
		},
		{
			name: 'In Progress - Outstanding',
			value: statusMap['in_progress']?.variance ?? 0,
			count: statusMap['in_progress']?.count ?? 0,
		},
		{
			name: 'Recovered - Shortfall',
			value: statusMap['recovered']?.variance ?? 0,
			count: statusMap['recovered']?.count ?? 0,
		},
	];
}

// ============================================================================
// 7. SETTLEMENT FUNNEL BY STAGE
// ============================================================================
// Visualization: FunnelChart or horizontal BarChart
//
// Data shape:
// { stage: 'investigation', count: 45, total_expected: 1200000 }
//
// REACT QUERY:
//   staleTime: 5 * 60 * 1000 (5 min)
//   gcTime: 15 * 60 * 1000
//   refetchOnWindowFocus: true
//
//   Rationale: This is an operational snapshot — claims move through stages
//   throughout the day. Similar to the aging breakdown, it's a dashboard
//   view that benefits from relatively fresh data. 5 min stale + refetch
//   on focus. Invalidate on claim substatus change.
//
// PERF NOTES:
//   - Single table scan with GROUP BY on an indexed column. Very fast.
//   - The in-memory sort (7 items) is trivially cheaper than adding an
//     ORDER BY with a CASE expression to the SQL.

export async function getSettlementFunnel(db: Kysely<DB>, clientId: string, range: [Date, Date]) {
	const stageOrder = [
		'investigation',
		'demand_sent',
		'negotiation',
		'settlement_reached',
		'litigation',
		'closed_recovered',
		'closed_no_recovery',
	];

	const results = await db
		.selectFrom('claim as c')
		.where('c.client_id', '=', clientId)
		.where('c.created_at', '>=', range[0])
		.where('c.created_at', '<=', range[1])
		.where('c.substatus', 'is not', null)
		.select([
			'c.substatus as stage',
			sql<number>`count(*)`.as('count'),
			sql<number>`coalesce(sum(c.expected_recovery), 0)`.as('total_expected'),
			sql<number>`coalesce(sum(c.actual_recovery), 0)`.as('total_actual'),
			sql<number>`coalesce(sum(c.total_incurred), 0)`.as('total_incurred'),
		])
		.groupBy('c.substatus')
		.execute();

	return results
		.map((r) => ({
			...r,
			count: Number(r.count),
			total_expected: Number(r.total_expected),
			total_actual: Number(r.total_actual),
			total_incurred: Number(r.total_incurred),
		}))
		.sort((a, b) => {
			const aIdx = stageOrder.indexOf(a.stage ?? '');
			const bIdx = stageOrder.indexOf(b.stage ?? '');
			// Unknown stages sort to the end
			return (aIdx === -1 ? Infinity : aIdx) - (bIdx === -1 ? Infinity : bIdx);
		});
}

// ============================================================================
// 8. DEMAND vs SETTLEMENT NEGOTIATION EFFICIENCY
// ============================================================================
// Visualization: ScatterPlot (recharts ScatterChart)
//   x = demand_amount, y = settlement_amount
//   Dots on the diagonal = full recovery. Color by carrier.
//
// Data shape:
// { demand: 50000, settled: 42000, party_name: 'Allstate',
//   days_to_settle: 34, claim_number: 'CLM-001' }
//
// REACT QUERY:
//   staleTime: 15 * 60 * 1000 (15 min)
//   gcTime: 30 * 60 * 1000
//   refetchOnWindowFocus: false
//
//   Rationale: Analytical scatter plot over historical settlements. Not
//   operationally urgent. 15 min is appropriate.
//
//   IMPORTANT: This returns up to 500 individual settlement rows. Consider
//   whether you want to cache this in React Query at all vs. fetching
//   on mount with no cache (cacheTime: 0) if memory is a concern on
//   lower-end client devices. 500 rows of this shape is ~50KB so probably
//   fine, but worth noting.
//
// PERF NOTES:
//   - FIX: Removed redundant client_id filter on the claim join condition.
//     The settlement already filters by client_id, and claim_id is a FK
//     from settlement to claim. The extra condition forced Postgres to
//     check client_id on both tables for every join row — unnecessary
//     if you trust your data integrity (which you should with FKs).
//   - LIMIT 500 is essential for scatter plot render performance.
//     If you need more, paginate or downsample server-side.

export async function getNegotiationEfficiencyScatter(db: Kysely<DB>, clientId: string, range: [Date, Date]) {
	return db
		.selectFrom('settlement as s')
		.innerJoin('claim_party as cp', 'cp.id', 's.claim_party_id')
		.innerJoin('party as p', 'p.id', 'cp.party_id')
		.innerJoin('claim as c', 'c.id', 's.claim_id')
		.where('s.client_id', '=', clientId)
		.where('s.deleted_at', 'is', null)
		.where('s.settlement_amount', 'is not', null)
		.where('s.settlement_date', 'is not', null)
		.where('s.settlement_date', '>=', range[0])
		.where('s.settlement_date', '<=', range[1])
		.where(sql<Date>`s.settlement_date`, '>=', sql<Date>`s.demand_date`)
		.where('cp.deleted_at', 'is', null)
		.select([
			'c.claim_number',
			'p.name as party_name',
			sql<number>`s.demand_amount`.as('demand'),
			sql<number>`s.settlement_amount`.as('settled'),
			sql<number>`
        round(s.settlement_amount::numeric / nullif(s.demand_amount, 0) * 100, 1)
      `.as('recovery_pct'),
			sql<number>`
        (s.settlement_date - s.demand_date)
      `.as('days_to_settle'),
			sql<boolean>`
        case when cp.policy_limit is not null
          and s.settlement_amount >= cp.policy_limit * 0.90
        then true else false end
      `.as('cap_constrained'),
		])
		.orderBy(sql`s.settlement_amount desc`)
		.limit(500)
		.execute()
		.then((rows) =>
			rows.map((r) => ({
				...r,
				demand: Number(r.demand),
				settled: Number(r.settled),
				recovery_pct: Number(r.recovery_pct),
				days_to_settle: Number(r.days_to_settle),
			}))
		);
}

// ============================================================================
// 9. STATUTE / DEADLINE RISK DASHBOARD
// ============================================================================
// Visualization: Table sorted by urgency, or BarChart with color-coded bars
//
// Data shape:
// { claim_number: 'CLM-001', days_remaining: 15, coverage_type: 'property_damage',
//   urgency: 'critical', expected_recovery: 50000 }
//
// REACT QUERY:
//   staleTime: 5 * 60 * 1000 (5 min)
//   gcTime: 10 * 60 * 1000
//   refetchOnWindowFocus: true
//   refetchInterval: 5 * 60 * 1000 (optional: poll every 5 min)
//
//   Rationale: This is the one query where freshness matters most.
//   Missing a statute deadline = losing the right to recover entirely.
//   Short stale time + refetch on focus. Consider adding refetchInterval
//   if this is displayed on a persistent dashboard. The query is cheap
//   (small result set, well-indexed) so frequent refetching is fine.
//   Invalidate on: claim_coverage statute_date change, recovery_status
//   change, statute_preserved toggle.
//
// PERF NOTES:
//   - FIX: Added filter for statute_preserved = false. If the statute
//     has been preserved (e.g., via tolling agreement), it shouldn't
//     show as a deadline risk. The original would have surfaced preserved
//     statutes as urgent when they're actually safe.
//   - FIX: Removed redundant client_id condition on the claim join
//     (same reasoning as scatter query above).
//   - Small result set (only open claims with statute dates). Fast query.

export async function getStatuteDeadlineRisk(db: Kysely<DB>, clientId: string, range: [Date, Date]) {
	return db
		.selectFrom('claim_coverage as cc')
		.innerJoin('claim as c', 'c.id', 'cc.claim_id')
		.where('cc.client_id', '=', clientId)
		.where('cc.deleted_at', 'is', null)
		.where('cc.statute_date', 'is not', null)
		.where('cc.statute_date', '>=', range[0])
		.where('cc.statute_date', '<=', range[1])
		.where('cc.subro_applicable', '=', true)
		.where('cc.statute_preserved', '=', false) // FIX: exclude preserved statutes
		.where('c.recovery_status', 'in', ['pending', 'in_progress'])
		.select([
			'c.id as claim_id',
			'c.claim_number',
			'cc.loss_type as coverage_type',
			'cc.statute_date',
			sql<number>`
        extract(day from cc.statute_date - now())
      `.as('days_remaining'),
			sql<string>`
        case
          when extract(day from cc.statute_date - now()) <= 30 then 'critical'
          when extract(day from cc.statute_date - now()) <= 90 then 'warning'
          else 'ok'
        end
      `.as('urgency'),
			sql<number>`c.expected_recovery`.as('expected_recovery'),
			sql<number>`c.actual_recovery`.as('actual_recovery'),
			'c.recovery_status',
		])
		.orderBy('days_remaining', 'asc')
		.execute()
		.then((rows) =>
			rows.map((r) => ({
				...r,
				days_remaining: Number(r.days_remaining),
				expected_recovery: Number(r.expected_recovery),
				actual_recovery: Number(r.actual_recovery),
			}))
		);
}

// ============================================================================
// REACT QUERY CONFIGURATION SUMMARY
// ============================================================================
//
// Query Key Convention:
//   ["reporting", queryName, clientId, ...params]
//   e.g. ["reporting", "recovery-aging", "client_abc"]
//   e.g. ["reporting", "net-recovery-month", "client_abc", { months: 12 }]
//
// Invalidation Strategy:
//   Rather than invalidating individual queries, group them by trigger:
//
//   onSettlementMutate:
//     invalidate(["reporting", "recovery-aging", clientId])
//     invalidate(["reporting", "recovery-rate-carrier", clientId])
//     invalidate(["reporting", "cap-utilization", clientId])
//     invalidate(["reporting", "cap-by-carrier", clientId])
//     invalidate(["reporting", "variance-decomposition", clientId])
//     invalidate(["reporting", "settlement-funnel", clientId])
//     invalidate(["reporting", "negotiation-scatter", clientId])
//
//   onRecoveryEventMutate:
//     invalidate(["reporting", "recovery-aging", clientId])
//     invalidate(["reporting", "net-recovery", clientId])  // prefix match
//     invalidate(["reporting", "payment-to-recovery", clientId])  // prefix
//     invalidate(["reporting", "variance-decomposition", clientId])
//
//   onPaymentMutate:
//     invalidate(["reporting", "net-recovery", clientId])  // prefix match
//     invalidate(["reporting", "payment-to-recovery", clientId])  // prefix
//     invalidate(["reporting", "variance-decomposition", clientId])
//
//   onClaimStatusChange:
//     invalidate(["reporting", "settlement-funnel", clientId])
//     invalidate(["reporting", "statute-deadline", clientId])
//
//   onLiabilityChange:
//     invalidate(["reporting", "variance-decomposition", clientId])
//
// Tier Summary:
//   SHORT  (5 min):  aging, funnel, statute deadline
//   MEDIUM (15 min): net recovery, cap utilization, negotiation scatter
//   LONG   (30 min): carrier rate, payment-to-recovery, variance decomposition
//
