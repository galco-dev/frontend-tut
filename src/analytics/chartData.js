export const REPORTING_TIMEZONE = "Asia/Dubai";

function asValidDate(value) {
  if (value instanceof Date) {
    const copy = new Date(value.getTime());
    return Number.isNaN(copy.getTime()) ? null : copy;
  }
  if (typeof value !== "string" || value.trim() === "") return null;

  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T12:00:00Z`
    : value;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function localDateParts(value, timezone) {
  const date = asValidDate(value);
  if (!date) return null;

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
  return {
    year: values.year,
    month: values.month,
    day: values.day,
  };
}

function isoCalendarDate(year, month, day) {
  return [
    String(year).padStart(4, "0"),
    String(month).padStart(2, "0"),
    String(day).padStart(2, "0"),
  ].join("-");
}

function roundAed(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function parseIsoDate(value) {
  return asValidDate(value);
}

export function monthPeriodStart(
  value,
  timezone = REPORTING_TIMEZONE,
) {
  const parts = localDateParts(value, timezone);
  return parts ? isoCalendarDate(parts.year, parts.month, 1) : null;
}

export function weekPeriodStart(
  value,
  timezone = REPORTING_TIMEZONE,
) {
  const parts = localDateParts(value, timezone);
  if (!parts) return null;

  const localCalendarDate = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day),
  );
  const weekday = localCalendarDate.getUTCDay();
  const daysSinceMonday = weekday === 0 ? 6 : weekday - 1;
  localCalendarDate.setUTCDate(
    localCalendarDate.getUTCDate() - daysSinceMonday,
  );
  return isoCalendarDate(
    localCalendarDate.getUTCFullYear(),
    localCalendarDate.getUTCMonth() + 1,
    localCalendarDate.getUTCDate(),
  );
}

export function sortChronologically(items, dateKey = "period_start") {
  return [...(items || [])].sort((left, right) => {
    const leftDate = asValidDate(left?.[dateKey]);
    const rightDate = asValidDate(right?.[dateKey]);
    if (!leftDate && !rightDate) return 0;
    if (!leftDate) return 1;
    if (!rightDate) return -1;
    return leftDate.getTime() - rightDate.getTime();
  });
}

export function formatPeriodLabel(
  value,
  {
    granularity = "month",
    timezone = REPORTING_TIMEZONE,
  } = {},
) {
  const date = asValidDate(value);
  if (!date) return "";

  const options = granularity === "week"
    ? { month: "short", day: "numeric", year: "numeric" }
    : { month: "short", year: "numeric" };
  return new Intl.DateTimeFormat("en-US", {
    ...options,
    timeZone: timezone,
  }).format(date);
}

export function withPeriodLabels(
  items,
  {
    dateKey = "period_start",
    labelKey = "period_label",
    granularity = "month",
    timezone = REPORTING_TIMEZONE,
  } = {},
) {
  return (items || []).map((item) => ({
    ...item,
    [labelKey]: formatPeriodLabel(item?.[dateKey], {
      granularity,
      timezone,
    }),
  }));
}

export function groupCommissionsByWeek(
  commissions,
  {
    dateKey = "created_at",
    timezone = REPORTING_TIMEZONE,
  } = {},
) {
  const grouped = new Map();
  for (const commission of commissions || []) {
    const periodStart = weekPeriodStart(
      commission?.[dateKey],
      timezone,
    );
    if (!periodStart || (commission?.level !== 1 && commission?.level !== 2)) {
      continue;
    }

    const current = grouped.get(periodStart) || {
      period_start: periodStart,
      level1_aed: 0,
      level2_aed: 0,
      total_commissions_aed: 0,
    };
    if (commission.level === 1) {
      current.level1_aed = roundAed(
        current.level1_aed + roundAed(commission.amount_aed),
      );
    } else {
      current.level2_aed = roundAed(
        current.level2_aed + roundAed(commission.amount_aed),
      );
    }
    current.total_commissions_aed = roundAed(
      current.level1_aed + current.level2_aed,
    );
    grouped.set(periodStart, current);
  }
  return sortChronologically([...grouped.values()]);
}

export function groupReferralGrowthByMonth(
  level1,
  level2,
  {
    dateKey = "joined_at",
    timezone = REPORTING_TIMEZONE,
  } = {},
) {
  const grouped = new Map();
  const add = (referral, level) => {
    const periodStart = monthPeriodStart(referral?.[dateKey], timezone);
    if (!periodStart) return;

    const current = grouped.get(periodStart) || {
      period_start: periodStart,
      level1_count: 0,
      level2_count: 0,
      total_network: 0,
    };
    if (level === 1) current.level1_count += 1;
    if (level === 2) current.level2_count += 1;
    current.total_network = current.level1_count + current.level2_count;
    grouped.set(periodStart, current);
  };

  for (const referral of level1 || []) add(referral, 1);
  for (const referral of level2 || []) add(referral, 2);
  return sortChronologically([...grouped.values()]);
}

export function buildCumulativeSeries(
  periods,
  {
    dateKey = "period_start",
    valueKey = "total_commissions_aed",
    outputKey = "cumulative_aed",
  } = {},
) {
  let runningTotal = 0;
  return sortChronologically(periods, dateKey).map((period) => {
    runningTotal = roundAed(runningTotal + roundAed(period?.[valueKey]));
    return {
      ...period,
      [outputKey]: runningTotal,
    };
  });
}
