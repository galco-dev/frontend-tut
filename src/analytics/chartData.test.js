import test from "node:test";
import assert from "node:assert/strict";

import {
  buildCumulativeSeries,
  formatPeriodLabel,
  groupCommissionsByWeek,
  groupReferralGrowthByMonth,
  parseIsoDate,
  sortChronologically,
  weekPeriodStart,
  withPeriodLabels,
} from "./chartData.js";


test("newest-first input is copied and sorted oldest-first", () => {
  const input = [
    { period_start: "2026-03-01", value: 3 },
    { period_start: "2026-01-01", value: 1 },
    { period_start: "2026-02-01", value: 2 },
  ];
  const snapshot = structuredClone(input);

  const sorted = sortChronologically(input);

  assert.deepEqual(
    sorted.map((item) => item.period_start),
    ["2026-01-01", "2026-02-01", "2026-03-01"],
  );
  assert.deepEqual(input, snapshot);
  assert.notStrictEqual(sorted, input);
});


test("month grouping keeps June 2025 and June 2026 separate", () => {
  const level1 = [
    { joined_at: "2026-06-10T08:00:00Z" },
    { joined_at: "2025-06-10T08:00:00Z" },
  ];
  const level2 = [
    { joined_at: "2025-06-11T08:00:00Z" },
  ];
  const level1Snapshot = structuredClone(level1);
  const level2Snapshot = structuredClone(level2);

  const grouped = groupReferralGrowthByMonth(level1, level2);

  assert.deepEqual(grouped, [
    {
      period_start: "2025-06-01",
      level1_count: 1,
      level2_count: 1,
      total_network: 2,
    },
    {
      period_start: "2026-06-01",
      level1_count: 1,
      level2_count: 0,
      total_network: 1,
    },
  ]);
  assert.equal(formatPeriodLabel(grouped[0].period_start), "Jun 2025");
  assert.equal(formatPeriodLabel(grouped[1].period_start), "Jun 2026");
  assert.deepEqual(level1, level1Snapshot);
  assert.deepEqual(level2, level2Snapshot);
});


test("weekly grouping uses Dubai Monday boundaries and separates L1/L2", () => {
  const input = [
    {
      created_at: "2026-01-12T08:00:00Z",
      level: 1,
      amount_aed: 10,
    },
    {
      created_at: "2026-01-07T08:00:00Z",
      level: 2,
      amount_aed: 4.75,
    },
    {
      created_at: "2026-01-05T08:00:00Z",
      level: 1,
      amount_aed: 38,
    },
  ];
  const snapshot = structuredClone(input);

  const grouped = groupCommissionsByWeek(input);

  assert.deepEqual(grouped, [
    {
      period_start: "2026-01-05",
      level1_aed: 38,
      level2_aed: 4.75,
      total_commissions_aed: 42.75,
    },
    {
      period_start: "2026-01-12",
      level1_aed: 10,
      level2_aed: 0,
      total_commissions_aed: 10,
    },
  ]);
  assert.equal(
    weekPeriodStart("2026-01-04T21:00:00Z"),
    "2026-01-05",
  );
  assert.deepEqual(input, snapshot);
});


test("cumulative totals are chronological and do not mutate source periods", () => {
  const input = [
    { period_start: "2026-01-12", total_commissions_aed: 10 },
    { period_start: "2026-01-05", total_commissions_aed: 42.75 },
  ];
  const snapshot = structuredClone(input);

  const cumulative = buildCumulativeSeries(input);

  assert.deepEqual(cumulative, [
    {
      period_start: "2026-01-05",
      total_commissions_aed: 42.75,
      cumulative_aed: 42.75,
    },
    {
      period_start: "2026-01-12",
      total_commissions_aed: 10,
      cumulative_aed: 52.75,
    },
  ]);
  assert.deepEqual(input, snapshot);
});


test("empty and single-point series remain safe", () => {
  assert.deepEqual(sortChronologically([]), []);
  assert.deepEqual(groupCommissionsByWeek([]), []);
  assert.deepEqual(groupReferralGrowthByMonth([], []), []);
  assert.deepEqual(buildCumulativeSeries([]), []);
  assert.equal(parseIsoDate("not-a-date"), null);

  const single = [
    { period_start: "2026-06-08", total_commissions_aed: 4.75 },
  ];
  assert.deepEqual(buildCumulativeSeries(single), [
    {
      period_start: "2026-06-08",
      total_commissions_aed: 4.75,
      cumulative_aed: 4.75,
    },
  ]);
});


test("display labels are added without replacing raw ISO period keys", () => {
  const input = [
    { period_start: "2025-06-09", total_commissions_aed: 38 },
  ];

  const labelled = withPeriodLabels(input, { granularity: "week" });

  assert.deepEqual(labelled, [
    {
      period_start: "2025-06-09",
      period_label: "Jun 9, 2025",
      total_commissions_aed: 38,
    },
  ]);
  assert.equal(input[0].period_label, undefined);
});
