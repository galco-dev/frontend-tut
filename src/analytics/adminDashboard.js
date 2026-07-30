import {
  sortChronologically,
  withPeriodLabels,
} from "./chartData.js";


const EMPTY_ADMIN_ANALYTICS = {
  financialSeries: [],
  payoutSeries: [],
  referralSegments: [],
  referralTotal: 0,
  referralDefinition: "",
  topReferrers: [],
};


export function buildAdminAnalyticsViewModel(response) {
  if (!response) return EMPTY_ADMIN_ANALYTICS;

  const financialSeries = withPeriodLabels(
    sortChronologically(response.financial_series || []),
  ).map((period) => ({
    ...period,
    date: period.period_label,
    revenue: Number(period.revenue_aed || 0),
    commissions: Number(period.total_commissions_aed || 0),
    profit: Number(period.contribution_after_commissions_aed || 0),
  }));
  const payoutSeries = withPeriodLabels(
    sortChronologically(response.payout_series || []),
  ).map((period) => ({
    ...period,
    month: period.period_label,
    amount: Number(period.completed_payouts_aed || 0),
  }));
  const network = response.referral_network || {};
  const referralSegments = [
    {
      name: "Level 1 Direct",
      value: Number(network.level1_accounts || 0),
      color: "#d4d4d8",
    },
    {
      name: "Level 2 Indirect",
      value: Number(network.level2_plus_accounts || 0),
      color: "#a78bfa",
    },
    {
      name: "No Referrer",
      value: Number(network.unreferred_accounts || 0),
      color: "#a1a1aa",
    },
  ];

  return {
    financialSeries,
    payoutSeries,
    referralSegments,
    referralTotal: Number(network.total_eligible_users || 0),
    referralDefinition: network.population_definition || "",
    topReferrers: (response.top_referrers || []).map((referrer) => ({
      id: referrer.user_id,
      name: referrer.name,
      email: referrer.email,
      l1: Number(referrer.level1_referrals || 0),
      l2: Number(referrer.level2_referrals || 0),
      total: Number(referrer.total_network || 0),
      earned: Number(referrer.earned_aed || 0),
      earnedDefinition: referrer.earned_definition || "",
      status: referrer.subscription_status || "inactive",
    })),
  };
}
