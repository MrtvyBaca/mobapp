// src/shared/lib/date.ts

// ---- Typy a interné pomocníky ----
export type DateInput = Date | string;

/** Bezpečné parsovanie dátumu.
 *  Reťazec vo formáte 'YYYY-MM-DD' parsujeme ako *lokálny* dátum,
 *  aby nevznikali posuny (UTC) o deň.
 */
export function parseDate(input: DateInput): Date {
  if (input instanceof Date) return new Date(input.getTime());
  const s = String(input).trim();

  // 'YYYY-MM-DD' → lokálny dátum (new Date(y, m-1, d))
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) {
    const y = Number(m[1]);
    const mm = Number(m[2]) - 1;
    const dd = Number(m[3]);
    return new Date(y, mm, dd);
  }

  // fallback – nechá JS rozhodnúť (môže byť UTC)
  return new Date(s);
}

export const pad2 = (n: number) => String(n).padStart(2, '0');

// ---- Kľúče pre obdobia ----
/** 'YYYY-MM' podľa lokálneho času */
export function toMonthKey(input: DateInput): string {
  const d = parseDate(input);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

/** 'YYYY-MM-DD' podľa lokálneho času */
export function toDateKey(input: DateInput): string {
  const d = parseDate(input);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// ---- Týždne (Po–Ne) ----
/** Pondelok daného týždňa (00:00:00, lokálne) */
export function mondayOf(input: DateInput): Date {
  const d = parseDate(input);
  const day = (d.getDay() + 6) % 7; // Po=0 ... Ne=6
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate()); // orez čas
  out.setDate(out.getDate() - day);
  out.setHours(0, 0, 0, 0);
  return out;
}

/** Kľúč pondelka: 'YYYY-MM-DD' */
export function weekStartKey(input: DateInput): string {
  return toDateKey(mondayOf(input));
}

/** ISO týždeň (W01–W53). ISO sa počíta v UTC (štandard).
 *  Vráti aj skratku roka `yy` a kód `YYYY-Www`.
 */
export function isoWeekInfo(input: DateInput): {
  year: number;
  week: number;
  yy: string;
  code: string;
} {
  const d0 = parseDate(input);
  const d = new Date(Date.UTC(d0.getFullYear(), d0.getMonth(), d0.getDate()));
  const wd = d.getUTCDay() === 0 ? 7 : d.getUTCDay(); // Ne -> 7
  d.setUTCDate(d.getUTCDate() + 4 - wd); // štvrtok ISO týždňa
  const year = d.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  const yy = String(year).slice(-2);
  return { year, week, yy, code: `${year}-W${pad2(week)}` };
}

/** Z 'YYYY-MM-DD' (pondelok týždňa) urob 'DD.MM' */
export function startLabelFromWeekKey(weekKey: string): string {
  const [, m, d] = weekKey.split('-').map(Number);
  return `${pad2(d)}.${pad2(m)}`;
}

/** Pre rozsah týždňa zobraz 'DD.MM – DD.MM' (lokálne).
 *  Očakáva weekKey = 'YYYY-MM-DD' ako pondelok.
 */
export function weekLabel(weekKey: string): string {
  const [y, m, d] = weekKey.split('-').map(Number);
  const start = new Date(y, m - 1, d);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const fmt = (x: Date) => `${pad2(x.getDate())}.${pad2(x.getMonth() + 1)}`;
  return `${fmt(start)} – ${fmt(end)}`;
}

// ---- Mesiace ----
/** Počet dní v mesiaci (m = 1..12) */
export const daysInMonth = (year: number, m1to12: number) => new Date(year, m1to12, 0).getDate();

/** Jednoduchý label mesiaca. Default vráti 'YYYY-MM'. */
export function monthLabel(monthKey: string, format: 'YYYY-MM' | 'MM/YYYY' = 'YYYY-MM'): string {
  if (format === 'MM/YYYY') {
    const [y, m] = monthKey.split('-').map(Number);
    return `${pad2(m)}/${y}`;
  }
  return monthKey;
}
