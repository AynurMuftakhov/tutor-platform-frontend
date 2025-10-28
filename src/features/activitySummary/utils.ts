import type { ActivitySummaryResponse, StudentActivityViewModel, ActivitySummaryStudent } from './types';

const SECONDS_IN_MINUTE = 60;

const toMinutes = (seconds: number | undefined | null): number =>
  Math.max(0, Math.round((seconds ?? 0) / SECONDS_IN_MINUTE));

const mapSeries = (seconds: number[] | undefined): number[] =>
  Array.isArray(seconds) ? seconds.map(toMinutes) : [];

const ensureSeriesLength = (series: number[], length: number): number[] => {
  if (series.length === length) return series;
  if (series.length > length) return series.slice(-length);
  const missing = Array.from({ length: length - series.length }, () => 0);
  return [...missing, ...series];
};

export const buildStudentViewModel = (
  student: ActivitySummaryStudent,
  onlineNowSet: Set<string>
): StudentActivityViewModel => {
  const activeMinutesToday = toMinutes(student.today?.activeSeconds as number | undefined);
  const homeworkMinutesToday = toMinutes(student.today?.homeworkSeconds as number | undefined);
  const vocabMinutesToday = toMinutes(student.today?.vocabSeconds as number | undefined);

  const seriesActive = ensureSeriesLength(mapSeries(student.active7dSeconds), 7);
  const seriesHomework = ensureSeriesLength(mapSeries(student.homework7dSeconds), 7);
  const seriesVocab = ensureSeriesLength(mapSeries(student.vocab7dSeconds), 7);

  const total7dActive = seriesActive.reduce((acc, n) => acc + n, 0);
  const avg7dActive = seriesActive.length ? Math.round(total7dActive / seriesActive.length) : 0;

  return {
    id: student.studentId,
    name: student.name || '—',
    email: student.email,
    lastSeenTs: student.lastSeenTs,
    online: onlineNowSet.has(student.studentId) || Boolean(student.online),
    streakDays: Math.max(0, student.streakDays ?? 0),
    riskLevel: student.riskLevel,
    riskReasons: Array.isArray(student.riskReasons) ? student.riskReasons.filter(Boolean) as string[] : [],
    riskTags: Array.isArray(student.riskTags) ? student.riskTags.filter(Boolean) as string[] : [],
    todayMinutes: {
      active: activeMinutesToday,
      homework: homeworkMinutesToday,
      vocab: vocabMinutesToday,
    },
    series7d: {
      active: seriesActive,
      homework: seriesHomework,
      vocab: seriesVocab,
    },
    stats: {
      total7dActiveMinutes: total7dActive,
      average7dActiveMinutes: avg7dActive,
    },
    meta: student.meta,
  };
};

export const buildStudentViewModels = (
  response: ActivitySummaryResponse | undefined
): StudentActivityViewModel[] => {
  if (!response?.students?.length) return [];
  const onlineNowSet = new Set(response.onlineNow ?? []);
  return response.students.map((student) => buildStudentViewModel(student, onlineNowSet));
};

export const computeMedian = (values: number[]): number => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  }
  return sorted[mid];
};

export const computeStdDev = (values: number[]): number => {
  const n = values.length;
  if (!n) return 0;
  const mean = values.reduce((acc, v) => acc + v, 0) / n;
  const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / n;
  return Math.sqrt(variance);
};
