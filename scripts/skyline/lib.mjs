// Shared helpers for the profile SVG generators. No dependencies.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

export function fontFace(family, file, weight = '400') {
  const b64 = readFileSync(join(here, 'fonts', file)).toString('base64');
  return `@font-face{font-family:'${family}';font-weight:${weight};src:url(data:font/woff2;base64,${b64}) format('woff2');}`;
}

// Stable 32-bit seed from a string (FNV-1a), so a week's building keeps its look every night.
export function seedFrom(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// Deterministic PRNG so the drawing is stable between runs with the same data.
export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

export const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export const r1 = (n) => Math.round(n * 10) / 10;

// calendar: GitHub GraphQL contributionCalendar
export function loadCalendar(path) {
  const raw = JSON.parse(readFileSync(path, 'utf8'));
  const cal = raw.data ? raw.data.user.contributionsCollection.contributionCalendar : raw;
  const weeks = cal.weeks.map((w) => w.contributionDays.map((d) => ({ date: d.date, count: d.contributionCount })));
  const days = weeks.flat();
  const weekTotals = weeks.map((w) => w.reduce((a, d) => a + d.count, 0));
  const total = cal.totalContributions;
  const activeDays = days.filter((d) => d.count > 0).length;
  const bestWeek = Math.max(...weekTotals);
  const bestDay = days.reduce((a, d) => (d.count > a.count ? d : a), days[0]);
  return { weeks, days, weekTotals, total, activeDays, bestWeek, bestDay, first: days[0].date, last: days[days.length - 1].date };
}

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const monthLabel = (iso) => `${MONTHS[+iso.slice(5, 7) - 1]} ${iso.slice(0, 4)}`;
