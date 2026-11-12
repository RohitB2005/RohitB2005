// Draws the profile header: an Auckland skyline from the last 12 months of GitHub contributions.
// One building per week, one lit window per contribution. Writes skyline-dark.svg and skyline-light.svg.
// Usage: node skyline.mjs <calendar.json> <outDir>   (calendar.json comes from fetch-calendar.mjs)
import { writeFileSync, existsSync, readFileSync } from 'node:fs';
import { fontFace, rng, seedFrom, r1, loadCalendar, monthLabel } from './lib.mjs';

const [, , calPath, outDir = '.'] = process.argv;
const cal = loadCalendar(calPath);

const W = 846, H = 400, BASE = 362; // BASE = waterline
const MARGIN = 14, MAX_H = 168, MIN_FLOOR_H = 3;
// Three window columns per building, widened only if a week ever has more contributions than fit.
const MAX_FLOORS = Math.floor((MAX_H - 4) / MIN_FLOOR_H);
const COLS = Math.min(5, Math.max(3, Math.ceil(Math.max(...cal.weekTotals, 1) / MAX_FLOORS)));

const THEMES = {
  dark: {
    sky: `<radialGradient id="sky" cx="50%" cy="30%" r="85%"><stop offset="0" stop-color="#1B2735"/><stop offset="1" stop-color="#090A0F"/></radialGradient>`,
    glow: '#2a4a5a', glowOpacity: 0.55,
    name: '#FFFFFF', role: '#00E676', meta: '#8b98a9',
    star: '#FFFFFF',
    far: '#1a2636', back: '#121c27', tower: '#22313f', towerEdge: '#3a5266', pod: '#bfefff',
    bldg: ['#0c1219', '#0f161f', '#111a24', '#0d141c'],
    lit: ['#00E676', '#5CF2A6', '#B9F6CA', '#00C853'], litGlow: '#00E676',
    water: ['#0b1118', '#06090d'], reflect: 0.32,
    beacon: '#ff4d4d', now: '#00E676',
  },
  light: {
    sky: `<radialGradient id="sky" cx="50%" cy="28%" r="90%"><stop offset="0" stop-color="#B0E0E6"/><stop offset="1" stop-color="#4682B4"/></radialGradient>`,
    glow: '#e8f7fb', glowOpacity: 0.5,
    name: '#1c2a3a', role: '#0058b8', meta: '#1c2a3a',
    star: '#FFFFFF',
    far: '#86abc7', back: '#6d93b4', tower: '#e4edf3', towerEdge: '#a9bfd0', pod: '#ffffff',
    bldg: ['#2c4a66', '#34557a', '#2a4560', '#3a5d80'],
    lit: ['#FFFFFF', '#E6F6FF', '#CDEBFF', '#FFFFFF'], litGlow: '#FFFFFF',
    water: ['#5b8db8', '#3f6f99'], reflect: 0.38,
    beacon: '#ff3b3b', now: '#0069d9',
  },
};

function city(t) {
  const n = cal.weekTotals.length;
  const slot = (W - 2 * MARGIN) / n;
  const maxT = Math.max(...cal.weekTotals, 1);
  const maxFloors = Math.ceil(maxT / COLS);
  const fh = Math.max(MIN_FLOOR_H, Math.min(6.2, (MAX_H - 6) / maxFloors));
  let bodies = '', windows = '', roofs = '';
  let delayBase = 0.35;
  cal.weekTotals.forEach((tot, i) => {
    const R = rng(seedFrom(cal.weeks[i][0].date)); // seeded by the week, so it looks the same tomorrow
    const gap = 1.2 + R() * 2.2;
    const bw = slot - gap;
    const x = MARGIN + i * slot + gap / 2;
    const need = Math.ceil(tot / COLS);
    const floors = Math.max(need, 3 + Math.floor(R() * 5));
    const capFloors = Math.min(floors, Math.floor((MAX_H - 4) / fh));
    const h = capFloors * fh + 4;
    const y = BASE - h;
    const fill = t.bldg[Math.floor(R() * t.bldg.length)];
    bodies += `<rect x="${r1(x)}" y="${r1(y)}" width="${r1(bw)}" height="${r1(h)}" fill="${fill}"/>`;
    // roof furniture (decorative, never counted)
    const roll = R();
    if (roll < 0.28 && h > 30) {
      const ax = x + bw * (0.3 + R() * 0.4), ah = 4 + R() * 8;
      roofs += `<line x1="${r1(ax)}" y1="${r1(y)}" x2="${r1(ax)}" y2="${r1(y - ah)}" stroke="${fill}" stroke-width="1"/>`;
    } else if (roll < 0.45) {
      const rw = bw * (0.35 + R() * 0.3);
      roofs += `<rect x="${r1(x + (bw - rw) / 2)}" y="${r1(y - 3)}" width="${r1(rw)}" height="3" fill="${fill}"/>`;
    }
    // windows: choose exactly `tot` slots (capped) deterministically
    const slots = capFloors * COLS;
    const lit = Math.min(tot, slots);
    const order = Array.from({ length: slots }, (_, k) => k);
    for (let k = slots - 1; k > 0; k--) { const j = Math.floor(R() * (k + 1)); [order[k], order[j]] = [order[j], order[k]]; }
    const ww = Math.min(2.6, (bw - 4) / COLS - 1), wh = Math.max(1.4, fh * 0.52);
    const gx = (bw - COLS * ww) / (COLS + 1);
    for (let k = 0; k < lit; k++) {
      const s = order[k], col = s % COLS, fl = Math.floor(s / COLS);
      const wx = x + gx + col * (ww + gx), wy = BASE - 2 - (fl + 1) * fh + (fh - wh) / 2;
      const c = t.lit[Math.floor(R() * t.lit.length)];
      const d = (delayBase + i * 0.045 + fl * 0.012).toFixed(2);
      windows += `<rect class="w" style="animation-delay:${d}s" x="${r1(wx)}" y="${r1(wy)}" width="${r1(ww)}" height="${r1(wh)}" fill="${c}"/>`;
    }
  });
  return { bodies, windows, roofs };
}

function skyTower(t, cx, top) {
  const Ht = BASE - top; // full height
  const yAt = (p) => BASE - Ht * p; // p = fraction of height from ground
  const seg = (p0, p1, w0, w1) => `M${r1(cx - w0 / 2)} ${r1(yAt(p0))}L${r1(cx - w1 / 2)} ${r1(yAt(p1))}L${r1(cx + w1 / 2)} ${r1(yAt(p1))}L${r1(cx + w0 / 2)} ${r1(yAt(p0))}Z`;
  const parts = [
    seg(0, 0.06, 15, 7.5), seg(0.06, 0.57, 7.5, 6.4),
    seg(0.57, 0.6, 6.4, 23), seg(0.6, 0.635, 23, 23), seg(0.635, 0.655, 23, 11),
    seg(0.655, 0.69, 10, 9), seg(0.69, 0.7, 9, 5), seg(0.7, 0.995, 3.6, 1.1),
  ];
  const ring = (p, w) => `<rect x="${r1(cx - w / 2)}" y="${r1(yAt(p))}" width="${r1(w)}" height="1" fill="${t.towerEdge}"/>`;
  const podY = yAt(0.6175);
  const podLights = `<ellipse cx="${cx}" cy="${r1(podY)}" rx="22" ry="9" fill="url(#podglow)"/><rect x="${r1(cx - 10.5)}" y="${r1(yAt(0.625))}" width="21" height="1.6" fill="${t.pod}" opacity=".85"/><rect x="${r1(cx - 4)}" y="${r1(yAt(0.684))}" width="8" height="1.1" fill="${t.pod}" opacity=".7"/>`;
  return `<g><path d="${parts.join('')}" fill="${t.tower}"/>${ring(0.6, 23)}${ring(0.8, 2.6)}${ring(0.86, 2.2)}${podLights}<circle class="beacon" cx="${cx}" cy="${r1(yAt(1))}" r="1.9" fill="${t.beacon}"/></g>`;
}

function backLayer(t) {
  const R = rng(99);
  let x = 300, s = '';
  while (x < W) {
    const w = 16 + R() * 26, h = 22 + R() * 46;
    s += `<rect x="${r1(x)}" y="${r1(BASE - h)}" width="${r1(w)}" height="${r1(h)}" fill="${t.back}"/>`;
    x += w + R() * 6;
  }
  return s;
}

function rangitoto(t) {
  // Wide, symmetric shield-volcano profile on the far left, sitting on the waterline.
  return `<path d="M-30 ${BASE}C40 ${BASE - 6} 90 ${BASE - 34} 132 ${BASE - 46}C140 ${BASE - 49} 146 ${BASE - 47} 150 ${BASE - 50}C155 ${BASE - 48} 162 ${BASE - 49} 170 ${BASE - 45}C214 ${BASE - 33} 268 ${BASE - 6} 330 ${BASE}Z" fill="${t.far}"/>`;
}

function stars(t) {
  const R = rng(777);
  let s = '';
  for (let i = 0; i < 90; i++) {
    const x = R() * W, y = 8 + R() * (BASE - 150) * (0.35 + 0.65 * R());
    const r = 0.45 + R() * R() * 1.3;
    const tw = i % 4 === 0 ? ` class="tw" style="animation-delay:${(R() * 6).toFixed(2)}s;animation-duration:${(3 + R() * 4).toFixed(1)}s"` : '';
    s += `<circle${tw} cx="${r1(x)}" cy="${r1(y)}" r="${r1(r)}" fill="${t.star}" opacity="${(0.35 + R() * 0.6).toFixed(2)}"/>`;
  }
  return s;
}

function clouds() {
  const R = rng(4242);
  let s = '';
  for (let i = 0; i < 5; i++) {
    const x = R() * W, y = 150 + R() * 70, sc = 0.6 + R() * 0.9;
    const dur = 140 + R() * 80;
    s += `<g class="cloud" style="animation-duration:${dur.toFixed(0)}s;animation-delay:-${(R() * dur).toFixed(0)}s"><g transform="translate(${r1(x)} ${r1(y)}) scale(${r1(sc)})" fill="#ffffff" opacity="0.55"><ellipse cx="0" cy="0" rx="34" ry="9"/><ellipse cx="-12" cy="-6" rx="14" ry="9"/><ellipse cx="9" cy="-8" rx="17" ry="11"/></g></g>`;
  }
  return s;
}

function svg(theme) {
  const t = THEMES[theme];
  const { bodies, windows, roofs } = city(t);
  const css = `
${fontFace('Orbitron', 'orbitron-500.woff2', '500')}
${fontFace('Quicksand', 'quicksand.woff2', '300 700')}
.name{font:500 54px Orbitron,sans-serif;fill:${t.name};letter-spacing:1px}
.role{font:700 21px Quicksand,sans-serif;fill:${t.role};letter-spacing:.6px}
.meta{font:600 11px Quicksand,sans-serif;fill:${t.meta};opacity:.7;letter-spacing:.4px}
.w{animation:on .6s ease-out backwards}
@keyframes on{from{opacity:0}}
.tw{animation:tw 4s ease-in-out infinite alternate}
@keyframes tw{to{opacity:.12}}
.beacon{animation:bl 2.4s steps(1) infinite}
@keyframes bl{50%{opacity:.15}}
.now{animation:bl 1.2s steps(1) infinite}
.cloud{animation:drift linear infinite}
@keyframes drift{from{transform:translateX(-${W}px)}to{transform:translateX(${W}px)}}
.shoot{animation:shoot 11s ease-in 3s infinite;opacity:0}
@keyframes shoot{0%{opacity:0;transform:translate(0,0)}2%{opacity:1}7%{opacity:0;transform:translate(-210px,84px)}100%{opacity:0;transform:translate(-210px,84px)}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}.shoot{display:none}}`;
  const sky = theme === 'dark' ? stars(t) + `<g class="shoot"><line x1="700" y1="40" x2="742" y2="23" stroke="url(#trail)" stroke-width="1.6" stroke-linecap="round"/></g>` : `<circle cx="720" cy="62" r="60" fill="url(#sun)"/>` + clouds();
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="t d">
<title id="t">Rohit Balaji: Software Engineer · AI Engineering · Full-Stack</title>
<desc id="d">An Auckland skyline drawn from ${cal.total} contributions in the last year: one building per week, one lit window per contribution.</desc>
<style>${css}</style>
<defs>${t.sky}
<linearGradient id="trail" x1="0" x2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<radialGradient id="sun"><stop offset="0" stop-color="#fffbe6" stop-opacity=".95"/><stop offset=".35" stop-color="#fff6cc" stop-opacity=".55"/><stop offset="1" stop-color="#fff6cc" stop-opacity="0"/></radialGradient>
<radialGradient id="podglow"><stop offset="0" stop-color="${t.pod}" stop-opacity="${theme === 'dark' ? 0.35 : 0}"/><stop offset="1" stop-color="${t.pod}" stop-opacity="0"/></radialGradient>
<radialGradient id="glow" cx="50%" cy="100%" r="60%"><stop offset="0" stop-color="${t.glow}" stop-opacity="${t.glowOpacity}"/><stop offset="1" stop-color="${t.glow}" stop-opacity="0"/></radialGradient>
<linearGradient id="water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.water[0]}"/><stop offset="1" stop-color="${t.water[1]}"/></linearGradient>
<linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<mask id="rm"><rect x="0" y="${BASE}" width="${W}" height="${H - BASE}" fill="url(#fade)"/></mask>
<filter id="bloom" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.4"/></filter>
<clipPath id="card"><rect width="${W}" height="${H}" rx="14"/></clipPath>
</defs>
<g clip-path="url(#card)">
<rect width="${W}" height="${H}" fill="url(#sky)"/>
<rect x="0" y="${BASE - 220}" width="${W}" height="220" fill="url(#glow)"/>
${sky}
<text class="name" x="${W / 2}" y="84" text-anchor="middle">Rohit Balaji</text>
<text class="role" x="${W / 2}" y="122" text-anchor="middle">Software Engineer  ·  AI Engineering  ·  Full-Stack</text>
<g id="city">
${rangitoto(t)}
${skyTower(t, 520, 158)}
${backLayer(t)}
<g>${bodies}${roofs}</g>
<g filter="url(#bloom)" opacity="${theme === 'dark' ? 0.7 : 0.45}">${windows}</g>
<g>${windows}</g>
</g>
<rect x="0" y="${BASE}" width="${W}" height="${H - BASE}" fill="url(#water)"/>
<g mask="url(#rm)" opacity="${t.reflect}"><use href="#city" xlink:href="#city" transform="translate(0 ${2 * BASE}) scale(1 -1)"/></g>
<text class="meta" x="${MARGIN + 2}" y="${H - 12}">${monthLabel(cal.first)}</text><text class="meta" x="${W - MARGIN - 2}" y="${H - 12}" text-anchor="end">${monthLabel(cal.last)}</text>
<rect x="0" y="${BASE}" width="${W}" height="0.8" fill="${t.lit[0]}" opacity="${theme === 'dark' ? 0.18 : 0.5}"/>
</g>
</svg>`;
}

// Safety check: refuse to overwrite if the total drops by more than a quarter overnight. A week rolling
// off can't do that, so it usually means the fetch lost access to private contributions. SKYLINE_FORCE=1 overrides.
const prevPath = `${outDir}/skyline-dark.svg`;
if (existsSync(prevPath) && process.env.SKYLINE_FORCE !== '1') {
  const prev = +(readFileSync(prevPath, 'utf8').match(/drawn from (\d+) contributions/) || [])[1];
  if (prev && cal.total < prev * 0.75) {
    console.error(`Refusing to redraw: ${cal.total} contributions vs ${prev} last time. Check the token, or set SKYLINE_FORCE=1.`);
    process.exit(3);
  }
}

console.log(`${cal.total} contributions over ${cal.weeks.length} weeks (${cal.first} to ${cal.last})`);
for (const theme of ['dark', 'light']) {
  const out = `${outDir}/skyline-${theme}.svg`;
  const s = svg(theme);
  writeFileSync(out, s);
  console.log(out, (s.length / 1024).toFixed(1) + 'KB');
}
