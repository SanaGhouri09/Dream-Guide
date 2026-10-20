// Dawa Check launch (LinkedIn, 4:5, 45 s). Pure function of time: window.seek(t) paints frame t.
// Timing is in beats (u) on the measured grid (96 bpm, 1 beat = 0.625 s); docs/shotlist.md is the plan.
import * as M from './lib/motion.js';

const { W, H, E, prog, lerp, clamp, springU, springKeys, SPRING, wobble, font, fill, rrect, cover, crop, kf } = M;

// Brand tokens from the live site (assets/brand.json). Purple is the accent; yellow is the brand's
// highlighter; red only for the overcharge and alert moments, as on the site.
const C = {
  paper: '#F6F4FC', ink: '#21134F', rx: '#4B2BB8', or: '#FFD23F', red: '#C42B1C', soft: '#5E5880',
  line: '#E0DCF0', rxbg: '#EEEAFE', band: '#2A1670', bandSoft: '#BDB3EE', lilac: '#BCAEFF', white: '#FFFFFF',
};
const D = 'Display', UI = 'UI', MARK = 'Mark';
const X0 = 80;                       // left margin (4x5 safe area)

// Every accent: [beat, label, sfx, opts]. scripts/sfx.mjs voices each one on the grid.
const HITS = [
  [0, 'hook line 1', 'thud', { pitch: 70 }],
  [0.5, 'hook line 2', 'tick'], [1.5, 'price check', 'tick'], [2, 'hook line 4', 'tick'], [2.5, 'hook line 5', 'tick'],
  [3, 'highlighter swipe', 'whoosh', { len: 0.3, from: 1800, to: 4200 }],
  [6, 'bubble Rs 250', 'pop', { pitch: 'A5' }],
  [8, 'cash slides', 'whoosh', { len: 0.35, from: 900, to: 2600 }],
  [8.5, 'cash lands', 'coins'],
  [9.7, 'camera drifts up', 'whoosh', { len: 0.5, from: 500, to: 1600 }],
  [10, 'line', 'tick'], [10.5, 'line', 'tick'], [11, 'DRAP', 'blip', { pitch: 'E5' }],
  [13, 'less', 'thud'], [14, 'public', 'tick'], [15, 'buried', 'sub', { len: 0.6 }],
  [15.6, 'band wipe', 'whoosh', { len: 0.4, from: 400, to: 1800 }],
  [16.5, 'stat 4x', 'thud'], [18.5, 'stat 1 in 10', 'thud'], [20.5, 'stat 248', 'thud'],
  [24, 'riser into drop', 'riser', { len: 1.4 }],
  [24, 'logo lands', 'impact'],
  [24.6, 'check draws', 'bell', { pitch: 'D6' }],
  [25, 'highlighter', 'whoosh', { len: 0.3, from: 1800, to: 4200 }],
  [27.5, 'phone rises', 'whoosh', { len: 0.5, from: 300, to: 1400 }],
  [29, 'typing name', 'type', { len: 0.8, n: 9 }],
  [30, 'results', 'click'], [31, 'pack tap', 'click'],
  [32, 'Rs 120', 'tick'], [33, 'Rs 160', 'tick'], [34, 'Rs 250 in the red', 'thud'],
  [35.6, 'push in', 'whoosh', { len: 0.4, from: 600, to: 2400 }],
  [36, 'verdict stamps', 'impact'], [37.5, 'count Rs 89.43', 'coins'], [40.5, 'show the screen', 'tick'],
  [43.6, 'slide to batch', 'whoosh', { len: 0.4, from: 2400, to: 700 }],
  [44, 'batch caption', 'tick'], [45, 'typing batch', 'type', { len: 1.1, n: 6 }],
  [48, 'DRAP ALERT stamp', 'impact'], [49, '756 alerts', 'tick'],
  [51.6, 'whip to complaints', 'whoosh', { len: 0.4, from: 700, to: 2600, pan: 0.3 }],
  [52, 'complaint caption', 'tick'],
  [52.6, 'step 1', 'pop', { pitch: 'D5' }], [54.2, 'step 2', 'pop', { pitch: 'F5' }],
  [55.8, 'step 3', 'pop', { pitch: 'A5' }], [57.4, 'step 4', 'pop', { pitch: 'C6' }],
  [59.6, 'collapse', 'whoosh', { len: 0.4, from: 2600, to: 600 }],
  [59.8, 'Free', 'pop', { pitch: 'D5' }], [61, 'No login', 'pop', { pitch: 'F5' }], [62, 'Roman Urdu + English', 'pop', { pitch: 'A5' }],
  [63.5, 'count 21,534', 'coins'], [65, '756 alerts', 'tick'],
  [68, 'end card', 'impact'], [68.5, 'logo', 'bell', { pitch: 'D6' }],
];

// ---------------------------------------------------------------- type helpers
const f = (size, weight = 800, fam = D) => font(size, weight, fam);
function widthOf(ctx, str, ft) { ctx.font = ft; return ctx.measureText(str).width; }
// A line made of coloured segments, rising out of a mask on its baseline (no fades).
// segs: [[text, color, {hl: u0 of highlighter swipe}]...]
function riseLine(ctx, segs, x, y, size, u, u0, { weight = 800, fam = D, align = 'left', cfg = SPRING.snappy, hl = C.or } = {}) {
  const k = springU(u, u0, cfg);
  if (k <= 0) return 0;
  const ft = f(size, weight, fam);
  const total = segs.reduce((a, s) => a + widthOf(ctx, s[0], ft), 0);
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  ctx.save();
  ctx.beginPath(); ctx.rect(0, y - size * 1.15, W, size * 1.45); ctx.clip();
  const dy = (1 - k) * size * 1.2;
  for (const [str, color, o = {}] of segs) {
    const w = widthOf(ctx, str, ft);
    if (o.hl !== undefined) {
      const p = E.outCubic(prog(u, o.hl, o.hl + 0.6));
      if (p > 0) { ctx.fillStyle = hl; ctx.fillRect(cx - 4, y + dy - size * 0.36, (w + 8) * p, size * 0.36); }
    }
    ctx.font = ft; ctx.fillStyle = color; ctx.textAlign = 'left';
    ctx.fillText(str, cx, y + dy);
    cx += w;
  }
  ctx.restore();
  return total;
}
function txt(ctx, str, x, y, ft, color, align = 'left') { ctx.font = ft; ctx.fillStyle = color; ctx.textAlign = align; ctx.fillText(str, x, y); }

// ---------------------------------------------------------------- brand art
// The capsule-with-check logo, from the site's SVG (viewBox 100). check: 0..1 draw-on.
function logo(ctx, cx, cy, size, check = 1, rot = 0) {
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(rot); ctx.scale(size / 100, size / 100); ctx.translate(-50, -50);
  ctx.save(); ctx.translate(50, 50); ctx.rotate((-35 * Math.PI) / 180); ctx.translate(-50, -50);
  ctx.fillStyle = C.or; ctx.fill(new Path2D('M50 33 H73 A17 17 0 0 1 73 67 H50 Z'));
  ctx.fillStyle = C.rx; ctx.fill(new Path2D('M27 33 H50 V67 H27 A17 17 0 0 1 27 33 Z'));
  ctx.restore();
  if (check > 0) {
    ctx.strokeStyle = C.band; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.setLineDash([32 * check, 100]);
    ctx.stroke(new Path2D('M56 52 L63 59 L77 42'));
    ctx.setLineDash([]);
  }
  ctx.restore();
}
// "dawacheck" wordmark: dawa in purple, check with the yellow highlighter (as on the site).
function wordmark(ctx, x, y, size, { dawa = C.rx, check = C.band, hlP = 1, align = 'left', hl = true } = {}) {
  const ft = f(size, 800, MARK);
  ctx.font = ft;
  const tr = -0.045 * size;
  ctx.letterSpacing = `${tr}px`;
  const wd = ctx.measureText('dawa').width, wc = ctx.measureText('check').width;
  const x0 = align === 'center' ? x - (wd + wc) / 2 : x;
  if (hl && hlP > 0) { ctx.fillStyle = C.or; ctx.fillRect(x0 + wd - 2, y - size * 0.42 + size * 0.0, (wc + 4) * hlP, size * 0.34); }
  ctx.fillStyle = dawa; ctx.textAlign = 'left'; ctx.fillText('dawa', x0, y);
  ctx.fillStyle = check; ctx.fillText('check', x0 + wd, y);
  ctx.letterSpacing = '0px';
  return wd + wc;
}
// Small brand bug, top-left, during the product section.
function bug(ctx, u) {
  const k = springU(u, 27.2, SPRING.snappy);
  const out = E.inCubic(prog(u, 59.4, 59.8));
  if (k <= 0 || out >= 1) return;
  ctx.save(); ctx.translate(0, -(1 - k) * 80 - out * 120);
  logo(ctx, X0 + 26, 96, 58, 1);
  wordmark(ctx, X0 + 62, 110, 40);
  ctx.restore();
}

// ---------------------------------------------------------------- the counter scene (site hero art)
const ART = { w: 480, h: 300 };
// Layers share one 480x300 viewBox, so they stack at the same rect; motion is per layer.
function counter(ctx, IMG, x, y, w, u, { cash = 0, cashA = 1, smile = false, phone = false } = {}) {
  const s = w / ART.w, h = ART.h * s;
  ctx.drawImage(IMG.back, x, y, w, h);
  // the sign's words, in the brand face (SVG images can't use web fonts)
  ctx.save(); ctx.font = f(13 * s, 800, UI); ctx.letterSpacing = `${2 * s}px`; ctx.fillStyle = C.white; ctx.textAlign = 'center';
  ctx.fillText('MEDICAL STORE', x + 254 * s, y + 33 * s); ctx.restore();
  ctx.drawImage(smile ? IMG.custSmile : IMG.cust, x, y, w, h);
  if (phone) ctx.drawImage(IMG.hphone, x, y, w, h);
  ctx.drawImage(IMG.front, x, y, w, h);
  if (cashA > 0) {
    ctx.save(); ctx.globalAlpha = cashA; ctx.translate(cash * s, 0);
    ctx.drawImage(IMG.cash, x, y, w, h);
    ctx.font = f(11 * s, 800, UI); ctx.fillStyle = '#1F4F2C'; ctx.textAlign = 'center';
    ctx.fillText('250', x + 188 * s, y + 190.5 * s);
    ctx.restore();
  }
  return { s, h };
}
function bubble(ctx, cx, by, label, k, { size = 70, tail = 'right' } = {}) {
  if (k <= 0) return;
  ctx.save();
  ctx.translate(cx, by); ctx.scale(k, k);
  ctx.font = f(size); const tw = ctx.measureText(label).width;
  const pw = tw + size * 0.9, ph = size * 1.5;
  rrect(ctx, -pw / 2, -ph, pw, ph, ph * 0.32);
  ctx.fillStyle = C.white; ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = C.ink; ctx.stroke();
  // tail
  ctx.beginPath(); const tx = tail === 'right' ? pw * 0.18 : -pw * 0.18;
  ctx.moveTo(tx - 18, -3); ctx.lineTo(tx, 26); ctx.lineTo(tx + 18, -3); ctx.closePath();
  ctx.fillStyle = C.white; ctx.fill(); ctx.stroke();
  ctx.fillStyle = C.white; ctx.fillRect(tx - 15, -8, 30, 8);
  ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.fillText(label, 0, -ph * 0.3);
  ctx.restore();
}

// ---------------------------------------------------------------- S1 hook question   (u 0..6.4)
function sHook(ctx, u, IMG) {
  fill(ctx, C.paper);
  // the counter, soft and quiet behind the question
  const focus = E.inOutCubic(prog(u, 5.4, 6.2));
  const sw = 1080, sh = sw * 300 / 480, sy = H - sh + 40 - focus * (H - sh + 40 - 120);
  ctx.save(); ctx.globalAlpha = 0.32 + 0.68 * focus;
  ctx.drawImage(IMG.blurred, 0, sy, sw, sh);
  ctx.restore();
  const exit = E.inBack(prog(u, 5.0, 5.7), 1.2) * -1100;
  ctx.save(); ctx.translate(0, exit);
  const S = 100, L = 112, y0 = 210;
  const lines = [
    [[['Kya aap bhi', C.ink]], -0.35],
    [[['pharmacy pe', C.ink]], 0.5],
    [[['price check', C.rx, { hl: 3 }]], 1.5],
    [[['kiye baghair', C.ink]], 2],
    [[['dawa khareed', C.ink]], 2.5],
    [[['lete hain?', C.ink]], 3],
  ];
  lines.forEach(([segs, u0], i) => riseLine(ctx, segs, X0, y0 + i * L, S, u, u0));
  riseLine(ctx, [['Do you buy medicine without', C.soft]], X0, y0 + 6 * L + 10, 42, u, 3.6, { weight: 600, fam: UI });
  riseLine(ctx, [['checking the price first?', C.soft]], X0, y0 + 6 * L + 64, 42, u, 3.75, { weight: 600, fam: UI });
  ctx.restore();
}

// ---------------------------------------------------------------- S2 the counter   (u 6..10.2)
function sCounter(ctx, u, IMG) {
  fill(ctx, C.paper);
  const push = 1 + 0.06 * E.inOutSine(prog(u, 6, 10));
  const w = 1080 * push, x = (1080 - w) / 2, y = 120 - (w - 1080) * 0.25;
  const slide = E.inOutCubic(prog(u, 7.8, 8.6));
  const taken = prog(u, 8.9, 9.3);
  const r = counter(ctx, IMG, x, y, w, u, { cash: slide * 150, cashA: 1 - taken });
  // pharmacist: "Rs 250"
  const kb = springU(u, 6, SPRING.bouncy) * (1 - E.inBack(prog(u, 9.3, 9.8)));
  bubble(ctx, x + 330 * r.s, y + 92 * r.s, 'Rs 250', kb, { size: 76, tail: 'right' });
  // caption
  const cy = y + r.h + 110;
  riseLine(ctx, [['"Rs 250," pharmacist ne kaha.', C.soft]], X0, cy, 46, u, 6.3, { weight: 600, fam: UI });
  riseLine(ctx, [['Main bhi.', C.ink]], X0, cy + 120, 96, u, 8);
  riseLine(ctx, [['Har baar.', C.rx]], X0 + widthOf(ctx, 'Main bhi. ', f(96)), cy + 120, 96, u, 8.6);
  riseLine(ctx, [['Me too. Every time.', C.soft]], X0, cy + 194, 42, u, 9.0, { weight: 600, fam: UI });
}

// ---------------------------------------------------------------- S3 + S4 the turn   (u 9.7..16.4)
function sTurn(ctx, u) {
  fill(ctx, C.paper);
  const up = E.inOutCubic(prog(u, 12.6, 13.3)) * -360;
  ctx.save(); ctx.translate(0, up);
  const y0 = 330, L = 118, S = 104;
  riseLine(ctx, [['Then I looked', C.ink]], X0, y0, S, u, 10);
  riseLine(ctx, [['up the official', C.ink]], X0, y0 + L, S, u, 10.5);
  const w = riseLine(ctx, [['DRAP', C.rx], [' price.', C.ink]], X0, y0 + 2 * L, S, u, 11);
  const ul = E.outCubic(prog(u, 11.6, 12.3));
  if (ul > 0 && w) { ctx.fillStyle = C.ink; ctx.fillRect(X0, y0 + 2 * L + 26, w * ul, 9); }
  ctx.restore();
  // S4
  const y1 = 700 + 0;
  const lessK = springU(u, 13.4, SPRING.bouncy);
  riseLine(ctx, [['It was ', C.ink]], X0, y1, 120, u, 13);
  if (u >= 13) {
    const sz = lerp(120, 84, lessK);
    riseLine(ctx, [['less.', C.rx]], X0 + widthOf(ctx, 'It was ', f(120)), y1, sz, u, 13);
  }
  riseLine(ctx, [['Public all along.', C.ink]], X0, y1 + 120, 72, u, 14);
  const sink = E.inOutCubic(prog(u, 15.1, 15.6));
  const dash = E.outCubic(prog(u, 14.9, 15.4));
  ctx.save(); ctx.globalAlpha = 1 - 0.55 * sink; ctx.translate(0, sink * 34);
  riseLine(ctx, [['Just buried on a', C.soft]], X0, y1 + 212, 60, u, 14.5, { weight: 700, fam: UI });
  riseLine(ctx, [['government portal.', C.soft]], X0, y1 + 284, 60, u, 14.75, { weight: 700, fam: UI });
  ctx.restore();
  if (dash > 0) {
    ctx.save(); ctx.strokeStyle = C.rx; ctx.lineWidth = 5; ctx.setLineDash([22, 14]);
    ctx.beginPath(); ctx.moveTo(X0, y1 + 160); ctx.lineTo(X0 + 920 * dash, y1 + 160); ctx.stroke(); ctx.restore();
  }
}

// ---------------------------------------------------------------- S5 root cause   (u 15.5..24.4)
const STATS = [
  { u: 16.5, num: '4×', lines: ['A Rs 800 heparin injection was', 'sold for Rs 3,500 in Karachi.'], src: 'DAWN, NOV 2023 · DRAP RAIDS' },
  { u: 18.5, num: '1 in 10', lines: ['medical products in countries', 'like Pakistan is substandard or fake.'], src: 'WORLD HEALTH ORGANIZATION, 2017' },
  { u: 20.5, num: '248', count: 248, lines: ['batches declared fake by DRAP', 'since July 2021.'], src: 'DRAP ALERTS, COUNTED BY DAWA CHECK' },
];
function sStats(ctx, u) {
  // the band rises from the dashed line and covers the frame
  const top = lerp(H + 20, 0, E.inOutCubic(prog(u, 15.6, 16.2)));
  ctx.fillStyle = C.band; ctx.fillRect(0, top, W, H - top);
  if (top > 0.5) return;
  const leave = E.inBack(prog(u, 23.2, 23.9), 1.1);
  ctx.save(); ctx.translate(-leave * 1200, 0);
  riseLine(ctx, [["IT'S NOT JUST ME", C.bandSoft]], X0, 170, 36, u, 16, { weight: 700, fam: UI });
  STATS.forEach((s, i) => {
    const y = 320 + i * 340;
    const k = springU(u, s.u, SPRING.bouncy);
    if (k <= 0) return;
    const q = 0.16 * wobble(u - s.u, 2.2, 5);
    let label = s.num;
    if (s.count) label = String(Math.round(s.count * E.outCubic(prog(u, s.u, s.u + 1.2))));
    ctx.save(); ctx.translate(X0, y); ctx.scale(lerp(1.5, 1, Math.min(k, 1)) * (1 + q), lerp(1.5, 1, Math.min(k, 1)) * (1 - q));
    txt(ctx, label, 0, 0, f(150), C.or); ctx.restore();
    riseLine(ctx, [[s.lines[0], C.white]], X0, y + 70, 46, u, s.u + 0.35, { weight: 600, fam: UI });
    riseLine(ctx, [[s.lines[1], C.white]], X0, y + 126, 46, u, s.u + 0.5, { weight: 600, fam: UI });
    riseLine(ctx, [[s.src, C.bandSoft]], X0, y + 180, 28, u, s.u + 0.8, { weight: 700, fam: UI });
  });
  ctx.restore();
}

// ---------------------------------------------------------------- S6 the drop   (u 23.4..28)
function sDrop(ctx, u) {
  if (u >= 24) fill(ctx, C.paper);   // hard cut to paper on the downbeat; before it, the logo flies over the stats
  // capsule flies in from the right, spinning, and lands on the downbeat
  const fly = E.outCubic(prog(u, 23.3, 24));
  const k = springU(u, 24, SPRING.bouncy);
  const shrink = E.inOutCubic(prog(u, 26.9, 27.6));
  const cx = lerp(1400, 540, fly), cy = 470, size = lerp(300, 0, shrink) * (u < 24 ? 0.9 : lerp(0.9, 1, Math.min(k, 1.2)));
  const q = 0.1 * wobble(u - 24, 2.2, 5);
  if (size > 1) {
    ctx.save(); ctx.translate(cx, cy); ctx.scale(1 + q, 1 - q); ctx.translate(-cx, -cy);
    logo(ctx, cx, cy, size, prog(u, 24.4, 24.9), (1 - fly) * 3);
    ctx.restore();
  }
  const out = 1 - shrink;
  ctx.save(); ctx.globalAlpha = out; ctx.translate(0, -shrink * 200);
  riseLine(ctx, [['So I built', C.soft]], 540, 250, 50, u, 24, { weight: 700, fam: UI, align: 'center' });
  const wk = springU(u, 24.5, SPRING.snappy);
  if (wk > 0) {
    ctx.save(); ctx.beginPath(); ctx.rect(0, 600, W, 220); ctx.clip();
    ctx.translate(0, (1 - wk) * 200);
    wordmark(ctx, 540, 760, 170, { align: 'center', hlP: E.outCubic(prog(u, 25, 25.6)) });
    ctx.restore();
  }
  riseLine(ctx, [['Official medicine prices and', C.ink]], 540, 930, 46, u, 25.5, { weight: 600, fam: UI, align: 'center' });
  riseLine(ctx, [['fake-medicine alerts, in 10 seconds.', C.ink]], 540, 990, 46, u, 25.7, { weight: 600, fam: UI, align: 'center' });
  ctx.restore();
}

// ---------------------------------------------------------------- S7 the price check   (u 27.6..36.2)
// A phone built around the real captures (390 css px wide at 3x = 1050 px).
function sPrice(ctx, u, IMG) {
  fill(ctx, C.paper);
  const cap1 = 1 - E.inCubic(prog(u, 30.9, 31.4));
  ctx.save(); ctx.globalAlpha = 1; ctx.translate(0, -(1 - cap1) * 60);
  if (cap1 > 0) riseLine(ctx, [['Type the medicine.', C.ink]], X0, 250, 74, u, 27.7);
  ctx.restore();
  if (u > 31) riseLine(ctx, [['Enter what you ', C.ink], ['paid.', C.rx]], X0, 250, 74, u, 31.4);
  // phone
  const rise = springU(u, 27.5, SPRING.gentle);
  const zoom = E.inExpo(prog(u, 35.2, 36.2));
  const pw = 640, px = (W - pw) / 2, py = lerp(H + 40, 320, Math.min(rise, 1.05));
  const z = Math.exp(Math.log(1) + (Math.log(5.5) - Math.log(1)) * zoom);
  ctx.save();
  // push into the red end of the meter
  const fx = 540 + 120, fy = 980;
  ctx.translate(fx, fy); ctx.scale(z, z); ctx.translate(-fx, -fy);
  rrect(ctx, px, py, pw, 1300, 78); ctx.fillStyle = C.ink; ctx.fill();
  const sx = px + 18, sy = py + 18, sw = pw - 36;
  ctx.save(); rrect(ctx, sx, sy, sw, 1300, 62); ctx.clip();
  ctx.fillStyle = C.paper; ctx.fillRect(sx, sy, sw, 1300);
  const k = sw / 1050;   // capture px -> screen px
  // scroll the page as the flow goes on
  const scroll = springKeys(u, [[28, 0], [30.2, 360], [31.4, 690]], SPRING.gentle);
  const top = sy + 30 - scroll;
  // search box: empty -> typed (a left-to-right reveal is the typing)
  ctx.drawImage(IMG.priceEmpty, sx, top, sw, 1203 * k);
  const tp = prog(u, 29, 29.9);
  if (tp > 0) { ctx.save(); ctx.beginPath(); ctx.rect(sx, top, sw * (tp < 1 ? 0.25 + 0.6 * tp : 1), 1203 * k); ctx.clip(); ctx.drawImage(IMG.priceTyped, sx, top, sw, 1203 * k); ctx.restore(); }
  // results: the pack card
  const rk = springU(u, 30, SPRING.snappy);
  if (rk > 0) { ctx.save(); ctx.translate(0, (1 - rk) * 60); ctx.drawImage(IMG.pack, sx, top + 1203 * k + 20, sw, 801 * k); ctx.restore(); }
  // pay box: 120 -> 160 -> 250, the real meter at each value
  const payY = top + 1203 * k + 20 + 801 * k - 6;
  const pk = springU(u, 31.2, SPRING.snappy);
  if (pk > 0) {
    const im = u < 33 ? IMG.pay120 : u < 34 ? IMG.pay160 : IMG.pay250;
    const pw2 = 960 * k;
    ctx.save(); ctx.translate(0, (1 - pk) * 50);
    ctx.drawImage(im, sx + (sw - pw2) / 2, payY, pw2, 558 * k);
    ctx.restore();
  }
  ctx.restore();
  // notch
  rrect(ctx, px + pw / 2 - 70, py + 30, 140, 30, 15); ctx.fillStyle = C.ink; ctx.fill();
  ctx.restore();
  // the frame fills with the meter's red as we push in
  if (zoom > 0.6) { ctx.fillStyle = C.red; ctx.globalAlpha = E.inCubic(prog(zoom, 0.6, 1)); ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
}

// ---------------------------------------------------------------- S8 the verdict   (u 36..44.2)
function sVerdict(ctx, u, IMG) {
  fill(ctx, C.paper);
  const leave = E.inOutCubic(prog(u, 43.5, 44.2)) * -H;
  ctx.save(); ctx.translate(0, leave);
  // the real verdict card, cropped to its red block, stamps in
  const k = springU(u, 36, SPRING.bouncy);
  const q = 0.07 * wobble(u - 36, 2.4, 6);
  const cw = 900, ch = cw * 710 / 858, cx = (W - cw) / 2, cy = 200;
  const s = lerp(1.14, 1, Math.min(k, 1.1));
  ctx.save(); ctx.translate(W / 2, cy + ch / 2); ctx.scale(s * (1 + q), s * (1 - q)); ctx.translate(-W / 2, -(cy + ch / 2));
  ctx.save(); rrect(ctx, cx, cy, cw, ch, 34); ctx.clip();
  crop(ctx, IMG.verdict, [0, 0, 858, 710], cx, cy, cw, ch);
  ctx.restore(); ctx.restore();
  const y = cy + ch + 130;
  riseLine(ctx, [['You were overcharged', C.ink]], X0, y, 76, u, 37);
  const n = 89.43 * E.outCubic(prog(u, 37.5, 38.7));
  if (u >= 37.5) riseLine(ctx, [[`Rs ${n.toFixed(2)}.`, C.red]], X0, y + 96, 96, u, 37.5);
  riseLine(ctx, [['Show the pharmacist this screen.', C.soft]], X0, y + 180, 44, u, 40.5, { weight: 600, fam: UI });
  ctx.restore();
}

// ---------------------------------------------------------------- S9 the batch check   (u 43.5..52.2)
function sBatch(ctx, u, IMG) {
  fill(ctx, C.paper);
  const enter = 1 - E.inOutCubic(prog(u, 43.5, 44.2));
  const leave = E.inOutCubic(prog(u, 51.5, 52.2));
  ctx.save(); ctx.translate(-leave * W, enter * H);
  riseLine(ctx, [['Is it real? Check the ', C.ink], ['batch.', C.rx]], X0, 240, 66, u, 44);
  riseLine(ctx, [['Matched against 756 DRAP alerts.', C.soft]], X0, 302, 40, u, 49, { weight: 600, fam: UI });
  // the real batch card (medicine name field left empty, try-chips cropped off)
  const src = [0, 0, 1050, 1180];
  const cw = 860, ch = cw * 1180 / 1050, cx = (W - cw) / 2, cy = 350;
  // DRAP ALERT: on the beat the card becomes the real after-check capture, with a punch and a shake
  const hit = u >= 48;
  const pk = hit ? 1 + 0.07 * wobble(u - 48, 2.6, 6) : 1;
  ctx.save(); ctx.translate(W / 2, cy + ch / 2); ctx.scale(pk, pk); ctx.translate(-W / 2, -(cy + ch / 2));
  if (hit && u < 48.8) M.shake(ctx, u, 48, 12);
  ctx.save(); rrect(ctx, cx, cy, cw, ch, 30); ctx.clip();
  if (hit) { crop(ctx, IMG.batchAlert, src, cx, cy, cw, ch); ctx.restore(); ctx.restore(); ctx.restore(); return; }
  crop(ctx, IMG.batchEmpty, src, cx, cy, cw, ch);
  const tp = prog(u, 45, 46.2);
  if (tp > 0) {
    // typing: reveal the batch number glyphs left to right (B.No field spans x 360..620 in the capture)
    const k = cw / 1050;
    ctx.save(); ctx.beginPath(); ctx.rect(cx, cy, (tp < 1 ? (360 + 260 * tp) : 1050) * k, ch); ctx.clip();
    crop(ctx, IMG.batchTyped, src, cx, cy, cw, ch);
    ctx.restore();
  }
  ctx.restore(); ctx.restore();
  ctx.restore();
}

// ---------------------------------------------------------------- S10 complaint steps   (u 51.5..60.2)
const LADDER = [[0, 0, 1050, 519], [0, 552, 1050, 621], [0, 1212, 1050, 677], [0, 1929, 1050, 725]];
function sLadder(ctx, u, IMG) {
  fill(ctx, C.paper);
  const enter = 1 - E.inOutCubic(prog(u, 51.5, 52.2));
  const col = E.inBack(prog(u, 59.4, 60), 1.3);
  ctx.save(); ctx.translate(enter * W, 0);
  riseLine(ctx, [["Pharmacist won't agree?", C.ink]], X0, 230, 70, u, 51.3);
  riseLine(ctx, [['The complaint steps are right there.', C.soft]], X0, 292, 40, u, 52, { weight: 600, fam: UI });
  const cw = 900, k = cw / 1050, cx = (W - cw) / 2;
  LADDER.forEach((r, i) => {
    const u0 = 52.6 + i * 1.6;
    const sk = springU(u, u0, SPRING.bouncy);
    if (sk <= 0) return;
    const y = 350 + i * 152 + (1 - Math.min(sk, 1.2)) * 120;
    const h = r[3] * k;
    ctx.save();
    const cs = 1 - col; ctx.translate(W / 2, 700); ctx.scale(cs, cs); ctx.translate(-W / 2, -700);
    ctx.shadowColor = 'rgba(42,22,112,0.22)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10;
    rrect(ctx, cx, y, cw, h, 26); ctx.fillStyle = C.paper; ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.save(); rrect(ctx, cx, y, cw, h, 26); ctx.clip();
    crop(ctx, IMG.ladder, r, cx, y, cw, h);
    ctx.restore(); ctx.restore();
  });
  ctx.restore();
}

// ---------------------------------------------------------------- S11 what it costs you   (u 59.6..68.2)
function sValues(ctx, u) {
  const bg = E.inOutCubic(prog(u, 59.6, 60.1));
  const r = lerp(0, 1500, bg);
  ctx.save(); ctx.beginPath(); ctx.arc(W / 2, 700, r, 0, Math.PI * 2); ctx.fillStyle = C.rx; ctx.fill(); ctx.restore();
  if (bg < 0.5) return;
  ctx.save(); ctx.translate(0, -E.inBack(prog(u, 66.9, 67.6), 1.2) * H);
  const pills = [['Free', 59.8], ['No login', 61], ['Roman Urdu + English', 62]];
  let y = 300;
  pills.forEach(([label, u0], i) => {
    const k = springU(u, u0, SPRING.bouncy);
    if (k <= 0) return;
    ctx.font = f(64); const tw = ctx.measureText(label).width;
    const pw = tw + 80, ph = 104, x = X0 + (i % 2) * 0;
    const yy = y + i * 132 - (1 - Math.min(k, 1.1)) * 300;
    ctx.save(); ctx.translate(x + pw / 2, yy + ph / 2); ctx.rotate((i - 1) * -0.025); ctx.scale(Math.min(k, 1.15), Math.min(k, 1.15)); ctx.translate(-(x + pw / 2), -(yy + ph / 2));
    rrect(ctx, x, yy, pw, ph, ph / 2); ctx.fillStyle = C.or; ctx.fill();
    txt(ctx, label, x + 40, yy + 74, f(64), C.band);
    ctx.restore();
  });
  const nk = prog(u, 63.5, 64.8);
  if (u >= 63.5) {
    const n = Math.round(21534 * E.outCubic(nk)).toLocaleString('en');
    riseLine(ctx, [[n, C.white]], X0, 860, 150, u, 63.5);
    riseLine(ctx, [['official DRAP medicine prices', C.lilac]], X0, 930, 44, u, 63.8, { weight: 600, fam: UI });
  }
  riseLine(ctx, [['+ 756 fake and failed medicine alerts', C.white]], X0, 1040, 44, u, 65, { weight: 700, fam: UI });
  ctx.restore();
}

// ---------------------------------------------------------------- S12 end card   (u 67.6..)
function sEnd(ctx, u) {
  fill(ctx, C.rx);
  const k = springU(u, 67.7, SPRING.bouncy);
  const q = 0.08 * wobble(u - 67.7, 2.2, 5);
  if (k > 0) {
    ctx.save(); ctx.translate(540, 400); ctx.scale(1 + q, 1 - q); ctx.translate(-540, -400);
    // logo on a paper disc so both halves read on purple
    const s = Math.min(k, 1.1);
    ctx.beginPath(); ctx.arc(540, 400, 150 * s, 0, Math.PI * 2); ctx.fillStyle = C.paper; ctx.fill();
    logo(ctx, 540, 400, 230 * s, prog(u, 68.4, 68.9));
    ctx.restore();
  }
  const wk = springU(u, 67.9, SPRING.snappy);
  if (wk > 0) {
    ctx.save(); ctx.beginPath(); ctx.rect(0, 600, W, 200); ctx.clip(); ctx.translate(0, (1 - wk) * 180);
    wordmark(ctx, 540, 730, 130, { align: 'center', dawa: C.lilac, check: C.or, hl: false });
    ctx.restore();
  }
  riseLine(ctx, [['dawacheck.pk', C.white]], 540, 900, 96, u, 68.1, { align: 'center' });
  const ul = E.outCubic(prog(u, 68.6, 69.2));
  if (ul > 0) { ctx.fillStyle = C.or; const w = 660 * ul; ctx.fillRect(540 - 330, 930, w, 10); }
  riseLine(ctx, [['Sahi qeemat, asli dawa.', '#E9E4FF']], 540, 1040, 50, u, 68.7, { weight: 600, fam: UI, align: 'center' });
}

// ---------------------------------------------------------------- film
M.film({
  fonts: [f(100), f(40, 500, UI), f(40, 600, UI), f(40, 700, UI), f(100, 800, MARK)],
  samples: 10,
  images: {
    back: 'assets/scene/back.svg', cust: 'assets/scene/cust.svg', custSmile: 'assets/scene/cust_smile.svg',
    hphone: 'assets/scene/hphone.svg', front: 'assets/scene/front.svg', cash: 'assets/scene/cash.svg',
    priceEmpty: 'assets/shots/v_price_empty.png', priceTyped: 'assets/shots/v_price_typed.png', pack: 'assets/shots/v_pack.png',
    pay120: 'assets/shots/v_pay_120.png', pay160: 'assets/shots/v_pay_160.png', pay250: 'assets/shots/v_pay_250.png',
    verdict: 'assets/shots/v_verdict.png',
    batchEmpty: 'assets/shots/v_batch_empty.png', batchTyped: 'assets/shots/v_batch_typed.png', batchAlert: 'assets/shots/v_batch_alert.png',
    ladder: 'assets/shots/prod_ladder.png',
  },
  hits: HITS,
  // a soft copy of the counter for the hook, made once
  init(ctx, IMG) {
    const sw = 1080, sh = sw * 300 / 480;
    const cv = document.createElement('canvas'); cv.width = sw; cv.height = sh;
    const c = cv.getContext('2d');
    c.filter = 'blur(10px)';
    c.drawImage(IMG.back, 0, 0, sw, sh); c.drawImage(IMG.cust, 0, 0, sw, sh); c.drawImage(IMG.front, 0, 0, sw, sh);
    IMG.blurred = cv;
  },
  draw(ctx, u, t, IMG) {
    if (u < 6.4) sHook(ctx, u, IMG);
    if (u >= 5.6 && u < 10.3) {
      // focus pull from the hook into the counter
      if (u >= 6.4) sCounter(ctx, u, IMG);
      else { ctx.save(); ctx.globalAlpha = E.inOutCubic(prog(u, 5.6, 6.4)); sCounter(ctx, u, IMG); ctx.restore(); }
    }
    if (u >= 9.7 && u < 16.3) {
      // camera drifts up: the counter leaves through the top while the type arrives from below
      const p = E.inOutCubic(prog(u, 9.7, 10.3));
      if (u < 10.3) { ctx.save(); ctx.translate(0, -p * H); sCounter(ctx, u, IMG); ctx.restore(); }
      ctx.save(); ctx.translate(0, (1 - p) * H); sTurn(ctx, u); ctx.restore();
    }
    if (u >= 15.5 && u < 24.1) sStats(ctx, u);
    if (u >= 23.3 && u < 27.6) sDrop(ctx, u);
    if (u >= 27.6 && u < 36) sPrice(ctx, u, IMG);
    if (u >= 36 && u < 44.2) sVerdict(ctx, u, IMG);
    if (u >= 43.5 && u < 52.2) sBatch(ctx, u, IMG);
    if (u >= 51.5 && u < 60.1) sLadder(ctx, u, IMG);
    if (u >= 59.6 && u < 67.6) sValues(ctx, u);
    if (u >= 67.6) sEnd(ctx, u);
    if (u >= 27.6 && u < 59.8) bug(ctx, u);
  },
});
