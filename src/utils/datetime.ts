export const toOffsetDateTime = (value?: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  // Handle already ISO-formatted strings with timezone by normalizing via Date
  if (/Z$/i.test(trimmed) || /[+-]\d{2}:?\d{2}$/.test(trimmed)) {
    const date = new Date(trimmed);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString();
  }

  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) {
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  const [, year, month, day, hour, minute, second] = match;
  const dt = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    second ? Number(second) : 0,
    0
  );

  if (Number.isNaN(dt.getTime())) return null;

  const pad = (num: number) => num.toString().padStart(2, '0');
  const offsetMinutes = -dt.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  const offsetHours = Math.floor(abs / 60);
  const offsetMins = abs % 60;

  const timePart = `${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
  const offsetPart = `${sign}${pad(offsetHours)}:${pad(offsetMins)}`;

  return `${year}-${month}-${day}T${timePart}${offsetPart}`;
};

export default toOffsetDateTime;
