-- seed_analytics.sql
-- Seeds 30 days of daily workflow stage snapshots
-- Depends on: desk_locations

DO $$
DECLARE
  v_client_id CONSTANT uuid := '00000000-0000-4000-8000-000000000001';
  v_desk_location_ids uuid[];
  v_now timestamp := now();
  v_day int;
  v_desk_id uuid;
  v_snapshot_date timestamp;
  v_claims_count int;
  v_avg_hours numeric;
  v_median_hours numeric;
  v_sla_breaches int;
  v_i int;
BEGIN
  -- Gather desk locations
  SELECT array_agg(id ORDER BY name) INTO v_desk_location_ids
  FROM desk_location WHERE client_id = v_client_id AND deleted_at IS NULL;

  IF v_desk_location_ids IS NULL THEN
    RAISE EXCEPTION 'No desk locations found. Run seed_desk_workflow first.';
  END IF;

  -- Wipe existing analytics data
  DELETE FROM analytics.daily_workflow_stage_snapshot WHERE client_id = v_client_id;

  -- =========================================================================
  -- 30 DAYS OF DAILY SNAPSHOTS
  -- One row per desk_location per day
  -- =========================================================================
  FOR v_day IN 0..29 LOOP
    v_snapshot_date := date_trunc('day', v_now) - (interval '1 day' * v_day);

    FOR v_i IN 1..array_length(v_desk_location_ids, 1) LOOP
      v_desk_id := v_desk_location_ids[v_i];

      -- Realistic occupancy: 3-20 claims, with some variance by location
      -- Earlier locations (evaluation) tend to have more claims
      v_claims_count := 3 + floor(random() * 18)::int;
      -- Add a slight trend: more recent days have slightly more claims
      v_claims_count := v_claims_count + CASE WHEN v_day < 10 THEN 2 ELSE 0 END;
      -- Clamp to range
      v_claims_count := LEAST(v_claims_count, 20);

      -- Avg hours in stage: 12-168, later stages tend to be longer
      v_avg_hours := 12 + (random() * 156)::numeric;
      -- Location-based variance (later locations = longer avg)
      v_avg_hours := v_avg_hours + (v_i * 8);
      v_avg_hours := LEAST(round(v_avg_hours, 2), 168);

      -- Median hours (typically lower than average due to skew)
      v_median_hours := v_avg_hours * (0.6 + random() * 0.3);
      v_median_hours := round(v_median_hours, 2);

      -- SLA breaches: 0-3, slightly correlated with higher occupancy
      v_sla_breaches := CASE
        WHEN v_claims_count > 15 THEN floor(random() * 4)::int
        WHEN v_claims_count > 10 THEN floor(random() * 3)::int
        ELSE floor(random() * 2)::int
      END;

      INSERT INTO analytics.daily_workflow_stage_snapshot (
        client_id, desk_location_id, snapshot_date,
        claims_count, avg_hours_in_stage, median_hours_in_stage,
        claims_breaching_sla, created_at
      ) VALUES (
        v_client_id,
        v_desk_id,
        v_snapshot_date,
        v_claims_count,
        v_avg_hours,
        v_median_hours,
        v_sla_breaches,
        v_snapshot_date + interval '1 hour' -- snapshots generated 1h after midnight
      );
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Seeded 30 days of analytics snapshots for % desk locations for client %',
    array_length(v_desk_location_ids, 1), v_client_id;
END $$;
