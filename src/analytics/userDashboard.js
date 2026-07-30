import {
  REPORTING_TIMEZONE,
  buildCumulativeSeries,
  formatPeriodLabel,
  groupReferralGrowthByMonth,
  sortChronologically,
  weekPeriodStart,
  withPeriodLabels,
} from "./chartData.js";

function roundAed(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

function normalizedStatus(value) {
  return String(value || "inactive").trim().toLowerCase();
}

function buildNetworkBreakdown(referralList) {
  const level1 = Array.isArray(referralList?.level1) ? referralList.level1 : [];
  const level2 = Array.isArray(referralList?.level2) ? referralList.level2 : [];
  const activeLevel1 = level1.filter(
    (referral) => normalizedStatus(referral?.subscription_status) === "active",
  ).length;
  const cancelledLevel1 = level1.filter(
    (referral) => normalizedStatus(referral?.subscription_status) === "cancelled",
  ).length;

  return [
    { name: "Level 1 Active", value: activeLevel1 },
    { name: "Level 1 Cancelled", value: cancelledLevel1 },
    { name: "Level 2", value: level2.length },
  ];
}

function buildReferralGrowth(referralList, timezone) {
  const level1 = Array.isArray(referralList?.level1) ? referralList.level1 : [];
  const level2 = Array.isArray(referralList?.level2) ? referralList.level2 : [];
  let cumulativeLevel1 = 0;
  let cumulativeLevel2 = 0;

  return withPeriodLabels(
    groupReferralGrowthByMonth(level1, level2, { timezone }).map((period) => {
      cumulativeLevel1 += period.level1_count;
      cumulativeLevel2 += period.level2_count;
      return {
        ...period,
        l1: period.level1_count,
        l2: period.level2_count,
        cumulative_level1: cumulativeLevel1,
        cumulative_level2: cumulativeLevel2,
        cumulative_total: cumulativeLevel1 + cumulativeLevel2,
      };
    }),
    { granularity: "month", timezone },
  ).map((period) => ({
    ...period,
    month: period.period_label,
  }));
}

function buildEarningsSeries(analytics, timezone) {
  return withPeriodLabels(
    sortChronologically(analytics?.earnings_series).map((period) => ({
      period_start: period.period_start,
      level1_aed: roundAed(period.level1_aed),
      level2_aed: roundAed(period.level2_aed),
      total_commissions_aed: roundAed(period.total_commissions_aed),
    })),
    { granularity: "week", timezone },
  ).map((period) => ({
    ...period,
    week: period.period_label,
    l1: period.level1_aed,
    l2: period.level2_aed,
    net: period.total_commissions_aed,
  }));
}

function buildProjection(analytics) {
  const configuration = analytics?.configuration || {};
  const eligibility = analytics?.current_network_eligibility || {};
  const subscriptionPrice = roundAed(configuration.subscription_price_aed);
  const l1Rate = Number(configuration.l1_commission_rate) || 0;
  const l2Rate = Number(configuration.l2_commission_rate) || 0;
  const activeL1 = Number(eligibility.active_l1) || 0;
  const activeL2 = Number(eligibility.active_l2) || 0;
  const projectedL1 = roundAed(activeL1 * subscriptionPrice * l1Rate);
  const projectedL2 = roundAed(activeL2 * subscriptionPrice * l2Rate);
  const projectedMonthlyCommissions = roundAed(projectedL1 + projectedL2);
  const projectedMonthlyAfterSubscription = roundAed(
    projectedMonthlyCommissions - subscriptionPrice,
  );

  return {
    subscription_price_aed: subscriptionPrice,
    l1_commission_rate: l1Rate,
    l2_commission_rate: l2Rate,
    active_l1: activeL1,
    active_l2: activeL2,
    projected_l1_aed: projectedL1,
    projected_l2_aed: projectedL2,
    projected_monthly_commissions_aed: projectedMonthlyCommissions,
    projected_monthly_after_subscription_aed:
      projectedMonthlyAfterSubscription,
    projected_annual_commissions_aed: roundAed(
      projectedMonthlyCommissions * 12,
    ),
    projected_annual_subscription_aed: roundAed(subscriptionPrice * 12),
    projected_annual_after_subscription_aed: roundAed(
      projectedMonthlyAfterSubscription * 12,
    ),
  };
}

function buildPayoutSeries(payouts, timezone) {
  const weekly = new Map();
  for (const payout of payouts || []) {
    const amount = roundAed(payout?.amount_aed);
    const requestedPeriod = weekPeriodStart(payout?.created_at, timezone);
    if (requestedPeriod) {
      const period = weekly.get(requestedPeriod) || {
        period_start: requestedPeriod,
        requested_aed: 0,
        completed_aed: 0,
      };
      period.requested_aed = roundAed(period.requested_aed + amount);
      weekly.set(requestedPeriod, period);
    }

    if (
      normalizedStatus(payout?.status) === "completed"
      && payout?.paid_at
    ) {
      const completedPeriod = weekPeriodStart(payout.paid_at, timezone);
      if (!completedPeriod) continue;
      const period = weekly.get(completedPeriod) || {
        period_start: completedPeriod,
        requested_aed: 0,
        completed_aed: 0,
      };
      period.completed_aed = roundAed(period.completed_aed + amount);
      weekly.set(completedPeriod, period);
    }
  }

  return withPeriodLabels(sortChronologically([...weekly.values()]), {
    granularity: "week",
    timezone,
  });
}

function buildCompletedPayoutSeries(payouts, timezone) {
  const completed = (payouts || [])
    .filter(
      (payout) =>
        normalizedStatus(payout?.status) === "completed" && payout?.paid_at,
    )
    .map((payout) => ({
      period_start: payout.paid_at,
      completed_aed: roundAed(payout.amount_aed),
    }));

  return withPeriodLabels(
    buildCumulativeSeries(completed, {
      valueKey: "completed_aed",
      outputKey: "cumulative_paid_aed",
    }),
    { granularity: "week", timezone },
  );
}

export function buildUserAnalyticsViewModel({
  analytics,
  referralList,
  payouts,
} = {}) {
  const timezone = analytics?.timezone || REPORTING_TIMEZONE;
  const earningsSeries = buildEarningsSeries(analytics, timezone);
  const financialSummary = analytics?.financial_summary || {};
  const configuration = analytics?.configuration || {};
  const minimumPayoutAed = roundAed(configuration.minimum_payout_aed);
  const availableForPayoutAed = roundAed(
    financialSummary.available_for_payout_aed,
  );

  return {
    timezone,
    financialSummary: {
      lifetime_commissions_aed: roundAed(
        financialSummary.lifetime_commissions_aed,
      ),
      current_month_commissions_aed: roundAed(
        financialSummary.current_month_commissions_aed,
      ),
      available_for_payout_aed: availableForPayoutAed,
      in_requested_payout_aed: roundAed(
        financialSummary.in_requested_payout_aed,
      ),
      completed_payouts_aed: roundAed(
        financialSummary.completed_payouts_aed,
      ),
    },
    minimumPayoutAed,
    isPayoutEligible:
      minimumPayoutAed > 0 && availableForPayoutAed >= minimumPayoutAed,
    payoutAmountRemainingAed: roundAed(
      Math.max(0, minimumPayoutAed - availableForPayoutAed),
    ),
    networkDefinition:
      analytics?.current_network_eligibility?.paid_access_definition || "",
    networkBreakdown: buildNetworkBreakdown(referralList),
    referralGrowth: buildReferralGrowth(referralList, timezone),
    earningsSeries,
    cumulativeEarnings: withPeriodLabels(
      buildCumulativeSeries(earningsSeries),
      { granularity: "week", timezone },
    ).map((period) => ({
      ...period,
      week: period.period_label,
      total: period.cumulative_aed,
    })),
    projection: buildProjection(analytics),
    payoutSeries: buildPayoutSeries(payouts, timezone),
    cumulativePayouts: buildCompletedPayoutSeries(payouts, timezone).map(
      (period) => ({
        ...period,
        date: period.period_label,
        total: period.cumulative_paid_aed,
      }),
    ),
  };
}

export function selectLatestEarningsPeriods(series, range) {
  const chronological = sortChronologically(series);
  if (range === "4w") return chronological.slice(-4);
  if (range === "3m") return chronological.slice(-12);
  return chronological;
}
