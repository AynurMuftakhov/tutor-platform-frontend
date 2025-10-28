const toNumber = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) return fallback;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
};

export const activitySummaryConfig = {
  enabled: toBoolean(import.meta.env.VITE_FEATURES_ACTIVITY_SUMMARY, true),
  pollIntervalMs: toNumber(import.meta.env.VITE_ACTIVITY_SUMMARY_POLL_MS, 15_000),
  chipThresholds: {
    mutedMinutesMax: toNumber(import.meta.env.VITE_ACTIVITY_CHIP_MUTED_MAX, 5),
    primaryMinutesMax: toNumber(import.meta.env.VITE_ACTIVITY_CHIP_PRIMARY_MAX, 20),
  },
  kpiRefreshMs: toNumber(import.meta.env.VITE_ACTIVITY_KPI_REFRESH_MS, 15_000),
};

export type ActivityChipVariant = 'muted' | 'primary' | 'success';

export const resolveChipVariant = (minutes: number): ActivityChipVariant => {
  if (minutes <= activitySummaryConfig.chipThresholds.mutedMinutesMax) return 'muted';
  if (minutes <= activitySummaryConfig.chipThresholds.primaryMinutesMax) return 'primary';
  return 'success';
};
