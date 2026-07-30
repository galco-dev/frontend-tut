import test from "node:test";
import assert from "node:assert/strict";

import { buildAdminAnalyticsViewModel } from "./adminDashboard.js";


test("admin view model maps backend financial and payout fields chronologically", () => {
  const response = {
    financial_series: [
      {
        period_start: "2026-02-01",
        revenue_aed: 190,
        total_commissions_aed: 76,
        contribution_after_commissions_aed: 114,
      },
      {
        period_start: "2026-01-01",
        revenue_aed: 95,
        total_commissions_aed: 42.75,
        contribution_after_commissions_aed: 52.25,
      },
    ],
    payout_series: [
      { period_start: "2026-03-01", completed_payouts_aed: 80 },
      { period_start: "2026-02-01", completed_payouts_aed: 50 },
    ],
  };

  const viewModel = buildAdminAnalyticsViewModel(response);

  assert.deepEqual(
    viewModel.financialSeries.map((row) => row.period_start),
    ["2026-01-01", "2026-02-01"],
  );
  assert.deepEqual(
    viewModel.payoutSeries.map((row) => row.completed_payouts_aed),
    [50, 80],
  );
  assert.equal(
    viewModel.financialSeries[0].contribution_after_commissions_aed,
    52.25,
  );
  assert.equal(viewModel.financialSeries[0].date, "Jan 2026");
  assert.equal(viewModel.financialSeries[0].revenue, 95);
  assert.equal(viewModel.financialSeries[0].commissions, 42.75);
  assert.equal(viewModel.financialSeries[0].profit, 52.25);
  assert.equal(viewModel.payoutSeries[0].month, "Feb 2026");
  assert.equal(viewModel.payoutSeries[0].amount, 50);
});


test("admin view model reconciles referral segments with backend population", () => {
  const viewModel = buildAdminAnalyticsViewModel({
    referral_network: {
      unreferred_accounts: 2,
      level1_accounts: 3,
      level2_plus_accounts: 2,
      total_eligible_users: 7,
      population_definition: "Eligible role=user accounts.",
    },
  });

  assert.deepEqual(
    viewModel.referralSegments.map((segment) => segment.value),
    [3, 2, 2],
  );
  assert.equal(
    viewModel.referralSegments.reduce((sum, segment) => sum + segment.value, 0),
    viewModel.referralTotal,
  );
  assert.equal(viewModel.referralDefinition, "Eligible role=user accounts.");
});


test("admin leaderboard preserves backend ranking and complete field meanings", () => {
  const viewModel = buildAdminAnalyticsViewModel({
    top_referrers: [
      {
        user_id: "root",
        name: "Root User",
        email: "root@example.com",
        level1_referrals: 5,
        level2_referrals: 4,
        total_network: 9,
        earned_aed: 42.75,
        earned_definition: "All generated commissions across every status.",
        subscription_status: "active",
      },
      {
        user_id: "second",
        name: "Second User",
        email: "second@example.com",
        level1_referrals: 6,
        level2_referrals: 1,
        total_network: 7,
        earned_aed: 38,
        earned_definition: "All generated commissions across every status.",
        subscription_status: "inactive",
      },
    ],
  });

  assert.deepEqual(
    viewModel.topReferrers.map((referrer) => referrer.id),
    ["root", "second"],
  );
  assert.equal(viewModel.topReferrers[0].total, 9);
  assert.equal(viewModel.topReferrers[0].earned, 42.75);
  assert.equal(viewModel.topReferrers[0].status, "active");
});
