const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SLASH_DATE_RE = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/;

/**
 * The app's own <input type="date"> fields always produce YYYY-MM-DD, but
 * older CSV imports used "M/D/YY". Normalize anything matching that legacy
 * shape so newly-imported rounds don't reintroduce the mixed formats that
 * migration 0003 cleaned up in the database.
 */
export function normalizeDatePlayed(raw: string): string {
  const value = raw.trim();
  if (ISO_DATE_RE.test(value)) return value;

  const match = value.match(SLASH_DATE_RE);
  if (!match) return value;

  const [, month, day, year] = match;
  const fullYear = year.length === 2 ? `20${year}` : year;
  return `${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}
