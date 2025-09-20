// Utilities for date/time formatting and parsing across the app
// Frontend widgets use <input type="datetime-local"> which returns a local time string like
//   YYYY-MM-DDTHH:mm (optionally with seconds)
// Backend (homeworkservice) expects OffsetDateTime strings (RFC 3339), e.g. 2025-09-13T19:31:00+03:00
// and returns all date/time fields in OffsetDateTime format as well.

/**
 * Convert a `datetime-local` value (assumed local timezone) to an RFC3339 offset datetime string.
 * - If input is falsy, returns undefined to ease optional payload fields.
 * - Adds seconds if missing.
 * - Preserves local timezone offset.
 */
export function toOffsetDateTime(value?: string | null): string | undefined {
  if (!value) return undefined;
  // Some browsers may include seconds; if not, append :00
  let local = value;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) {
    local = local + ":00";
  }
  // Construct a Date by interpreting the string as local time
  const [y, m, d, hh, mm, ss] = [
    Number(local.slice(0, 4)),
    Number(local.slice(5, 7)),
    Number(local.slice(8, 10)),
    Number(local.slice(11, 13)),
    Number(local.slice(14, 16)),
    Number(local.slice(17, 19) || 0),
  ];
  const date = new Date(y, (m - 1), d, hh, mm, ss, 0);
  // Offset in minutes (e.g., -180 for +03:00). getTimezoneOffset returns minutes to add to local to get UTC.
  const offsetMin = -date.getTimezoneOffset();
  const sign = offsetMin >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMin);
  const offHH = String(Math.floor(abs / 60)).padStart(2, "0");
  const offMM = String(abs % 60).padStart(2, "0");

  // Format date parts
  const isoY = String(date.getFullYear()).padStart(4, "0");
  const isoM = String(date.getMonth() + 1).padStart(2, "0");
  const isoD = String(date.getDate()).padStart(2, "0");
  const isoH = String(date.getHours()).padStart(2, "0");
  const isoN = String(date.getMinutes()).padStart(2, "0");
  const isoS = String(date.getSeconds()).padStart(2, "0");

  return `${isoY}-${isoM}-${isoD}T${isoH}:${isoN}:${isoS}${sign}${offHH}:${offMM}`;
}

/**
 * Parse an RFC3339 OffsetDateTime string to a value suitable for `datetime-local` input.
 * Drops the offset and converts to local time.
 */
export function fromOffsetDateTimeToLocalInput(value?: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  // Build local datetime without seconds for cleaner input appearance
  const y = String(d.getFullYear()).padStart(4, "0");
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${hh}:${mm}`;
}
