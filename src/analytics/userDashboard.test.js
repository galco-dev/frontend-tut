import test from "node:test";
import assert from "node:assert/strict";

import {
  buildUserAnalyticsViewModel,
  selectLatestEarningsPeriods,
} from "./userDashboard.js";

const analytics = {
  timezone: "Asia/Dubai",
  configuration: {
    subscription_price_aed: 95,
    l1_commission_rate: 0.4,
    l2_commission_rate: 0.05,
    minimum_payout_aed: 50,
  },
  financial_summary: {
    lifetime_commissions_aed: 52.75,
    current_month_commissions_aed: 10,
    available_for_payout_aed: 39.2,
    in_requested_payout_aed: 0,
    completed_payouts_aed: 80,
  },
  current_network_eligibility: {
    active_l1: 2,
    active_l2: 3,
    paid_access_definition: "Paid access definition",
  },
  earnings_series: [
    {
      period_start: "2026-01-12",
      level1_aed: 10,
      level2_aed: 0,
      total_commissions_aed: 10,
    },
    {
      period_start: "2026-01-05",
      level1_aed: 38,
      level2_aed: 4.75,
      total_commissions_aed: 42.75,
    },
  ],
};

test("network breakdown preserves the approved active/cancelled/L2 labels", () => {
  const referralList = {
    level1: [
      { joined_at: "2026-01-01T00:00:00Z", subscription_status: "active" },
      { joined_at: "2026-02-01T00:00:00Z", subscription_status: "pending" },
      { joined_at: "2026-03-01T00:00:00Z", subscription_status: "expired" },
    ],
    level2: [{ joined_at: "2026-03-02T00:00:00Z" }],
  };
  const snapshot = structuredClone(referralList);

  const view = buildUserAnalyticsViewModel({ analytics, referralList });

  assert.deepEqual(view.networkBreakdown, [
    { name: "Level 1 Active", value: 1 },
    { name: "Level 1 Cancelled", value: 0 },
    { name: "Level 2", value: 1 },
  ]);
  assert.deepEqual(referralList, snapshot);
});

test("referral growth uses ISO months and cumulative oldest-first values", () => {
  const view = buildUserAnalyticsViewModel({
    analytics,
    referralList: {
      level1: [
        { joined_at: "2026-06-04T08:00:00Z" },
        { joined_at: "2025-06-04T08:00:00Z" },
      ],
      level2: [{ joined_at: "2025-06-05T08:00:00Z" }],
    },
  });

  assert.deepEqual(
    view.referralGrowth.map((period) => ({
      key: period.period_start,
      l1: period.cumulative_level1,
      l2: period.cumulative_level2,
      total: period.cumulative_total,
    })),
    [
      { key: "2025-06-01", l1: 1, l2: 1, total: 2 },
      { key: "2026-06-01", l1: 2, l2: 1, total: 3 },
    ],
  );
});

test("earnings use backend totals and latest range selection is chronological", () => {
  const view = buildUserAnalyticsViewModel({ analytics });

  assert.deepEqual(
    view.earningsSeries.map((period) => period.period_start),
    ["2026-01-05", "2026-01-12"],
  );
  assert.deepEqual(
    view.earningsSeries.map((period) => period.total_commissions_aed),
    [42.75, 10],
  );
  assert.equal(view.earningsSeries[0].net, 42.75);
  assert.equal(view.cumulativeEarnings.at(-1).cumulative_aed, 52.75);

  const thirteen = Array.from({ length: 13 }, (_, index) => ({
    period_start: new Date(Date.UTC(2026, 0, 5 + index * 7))
      .toISOString()
      .slice(0, 10),
  }));
  assert.deepEqual(
    selectLatestEarningsPeriods(thirteen, "4w").map(
      (period) => period.period_start,
    ),
    thirteen.slice(-4).map((period) => period.period_start),
  );
  assert.deepEqual(
    selectLatestEarningsPeriods(thirteen, "3m").map(
      (period) => period.period_start,
    ),
    thirteen.slice(-12).map((period) => period.period_start),
  );
});

test("projections use backend configuration and active eligibility", () => {
  const view = buildUserAnalyticsViewModel({ analytics });

  assert.deepEqual(view.projection, {
    subscription_price_aed: 95,
    l1_commission_rate: 0.4,
    l2_commission_rate: 0.05,
    active_l1: 2,
    active_l2: 3,
    projected_l1_aed: 76,
    projected_l2_aed: 14.25,
    projected_monthly_commissions_aed: 90.25,
    projected_monthly_after_subscription_aed: -4.75,
    projected_annual_commissions_aed: 1083,
    projected_annual_subscription_aed: 1140,
    projected_annual_after_subscription_aed: -57,
  });
  assert.equal(view.minimumPayoutAed, 50);
  assert.equal(view.isPayoutEligible, false);
  assert.equal(view.payoutAmountRemainingAed, 10.8);
});

test("payout charts use request week and completed paid week independently", () => {
  const payouts = [
    {
      amount_aed: 50,
      status: "completed",
      created_at: "2026-01-05T08:00:00Z",
      paid_at: "2026-01-14T08:00:00Z",
    },
    {
      amount_aed: 30,
      status: "requested",
      created_at: "2026-01-06T08:00:00Z",
      paid_at: null,
    },
  ];
  const snapshot = structuredClone(payouts);

  const view = buildUserAnalyticsViewModel({ analytics, payouts });

  assert.deepEqual(
    view.payoutSeries.map((period) => ({
      key: period.period_start,
      requested: period.requested_aed,
      completed: period.completed_aed,
    })),
    [
      { key: "2026-01-05", requested: 80, completed: 0 },
      { key: "2026-01-12", requested: 0, completed: 50 },
    ],
  );
  assert.equal(view.cumulativePayouts.at(-1).cumulative_paid_aed, 50);
  assert.deepEqual(payouts, snapshot);
});
