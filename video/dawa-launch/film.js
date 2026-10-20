// Dawa Check launch (LinkedIn, 4:5, 75 s). Pure function of time: window.seek(t) paints frame t.
// Timing is in beats (u) on the measured grid (80 bpm, 1 beat = 0.75 s); docs/shotlist.md is the plan.
// Reading rule: every line stays on screen for at least (words / 3 + 1) seconds.
import * as M from './lib/motion.js';

const { W, H, E, prog, lerp, springU, springKeys, SPRING, wobble, font, fill, rrect, crop } = M;

// Brand tokens from the live site. Purple is the accent, yellow the brand's highlighter,
// red only for overcharge and alert moments.
const C = {
  paper: '#F6F4FC', ink: '#21134F', rx: '#4B2BB8', or: '#FFD23F', red: '#C42B1C', soft: '#5E5880',
  line: '#E0DCF0', rxbg: '#EEEAFE', band: '#2A1670', bandSoft: '#BDB3EE', lilac: '#BCAEFF', white: '#FFFFFF',
};
const D = 'Display', UI = 'UI', MARK = 'Mark';
const X0 = 80;

// Every accent: [beat, label, sfx, opts]. scripts/sfx.mjs voices each one on the grid.
// The bed is lo-fi and soft, so the accents are kept small: ticks, pops and a few thuds.
const HITS = [
  [0, 'walk in', 'tick'], [6, 'customer asks', 'pop', { pitch: 'E5' }],
  [10.5, 'box on the counter', 'thud', { pitch: 90 }], [11, 'Rs 250', 'pop', { pitch: 'A5' }],
  [15, 'cash slides', 'whoosh', { len: 0.35, from: 900, to: 2600 }], [15.6, 'cash taken', 'coins'],
  [16.5, 'box handed over', 'tick'],
  [18.8, 'question card rises', 'whoosh', { len: 0.45, from: 400, to: 1600 }],
  [19.3, 'question', 'tick'], [20.3, 'price check', 'blip', { pitch: 'E5' }],
  [28.8, 'to me too', 'whoosh', { len: 0.4, from: 1600, to: 500 }],
  [29.2, 'Main bhi', 'thud', { pitch: 70 }],
  [33.2, 'turn', 'tick'], [33.6, 'DRAP', 'blip', { pitch: 'E5' }], [35.5, 'lower', 'tick'],
  [38.6, 'band wipe', 'whoosh', { len: 0.4, from: 400, to: 1800 }],
  [39.8, 'stat 4x', 'thud'], [42.8, 'stat 1 in 10', 'thud'], [45.8, 'stat 248', 'thud'],
  [52, 'riser into the drop', 'swell', { len: 1.5 }],
  [52, 'logo lands', 'impact'], [52.6, 'check draws', 'bell', { pitch: 'C6' }],
  [55.6, 'phone rises', 'whoosh', { len: 0.5, from: 300, to: 1400 }],
  [57, 'typing name', 'type', { len: 0.9, n: 9 }], [58, 'results', 'click'], [59, 'pack tap', 'click'],
  [60, 'Rs 120', 'tick'], [61, 'Rs 160', 'tick'], [62, 'Rs 250 in the red', 'thud'],
  [62.4, 'push in', 'whoosh', { len: 0.4, from: 600, to: 2400 }],
  [63, 'verdict', 'impact'], [64.5, 'count Rs 89.43', 'coins'],
  [68.5, 'back to the counter', 'whoosh', { len: 0.4, from: 2400, to: 700 }],
  [70, 'sorry ji', 'pop', { pitch: 'G5' }], [71.5, 'refund', 'coins'], [72.5, 'tick badge', 'bell', { pitch: 'C6' }],
  [74.5, 'whip to batch', 'whoosh', { len: 0.4, from: 700, to: 2600, pan: 0.3 }],
  [76, 'typing batch', 'type', { len: 1.1, n: 6 }], [79, 'DRAP ALERT', 'impact'],
  [81.5, 'whip to complaints', 'whoosh', { len: 0.4, from: 2600, to: 700, pan: -0.3 }],
  [83, 'step 1', 'pop', { pitch: 'C5' }], [84.3, 'step 2', 'pop', { pitch: 'E5' }],
  [85.6, 'step 3', 'pop', { pitch: 'G5' }], [86.9, 'step 4', 'pop', { pitch: 'C6' }],
  [88.6, 'circle wipe', 'whoosh', { len: 0.4, from: 2600, to: 600 }],
  [89, 'Free', 'pop', { pitch: 'C5' }], [89.8, 'No login', 'pop', { pitch: 'E5' }], [90.6, 'Roman Urdu + English', 'pop', { pitch: 'G5' }],
  [91.4, 'count 21,534', 'coins'],
  [94, 'end card', 'impact'], [94.5, 'logo check', 'bell', { pitch: 'C6' }],
];

// ---------------------------------------------------------------- type helpers
const f = (size, weight = 800, fam = D) => font(size, weight, fam);
function widthOf(ctx, str, ft) { ctx.font = ft; return ctx.measureText(str).width; }
// A line of coloured segments rising out of a mask on its baseline (no fades).
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
// Capsule-with-check logo from the site's SVG (viewBox 100). check: 0..1 draw-on.
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
// "dawacheck" wordmark, optionally with ".pk" attached on the same baseline.
function wordmark(ctx, x, y, size, { dawa = C.rx, check = C.band, pk = null, hlP = 1, align = 'left', hl = true, pkP = 1 } = {}) {
  const ft = f(size, 800, MARK);
  const tr = -0.045 * size;
  ctx.font = ft; ctx.letterSpacing = `${tr}px`;
  const wd = ctx.measureText('dawa').width, wc = ctx.measureText('check').width;
  const pkSize = size * 0.62, pkFt = f(pkSize, 800, MARK);
  let wp = 0;
  if (pk) { ctx.font = pkFt; wp = ctx.measureText('.pk').width; ctx.font = ft; }
  const total = wd + wc + wp;
  const x0 = align === 'center' ? x - total / 2 : x;
  if (hl && hlP > 0) { ctx.fillStyle = C.or; ctx.fillRect(x0 + wd - 2, y - size * 0.42, (wc + 4) * hlP, size * 0.34); }
  ctx.fillStyle = dawa; ctx.textAlign = 'left'; ctx.fillText('dawa', x0, y);
  ctx.fillStyle = check; ctx.fillText('check', x0 + wd, y);
  if (pk && pkP > 0) {
    ctx.save(); ctx.beginPath(); ctx.rect(x0 + wd + wc - 4, y - size, wp + 40, size * 1.3); ctx.clip();
    ctx.font = pkFt; ctx.fillStyle = pk; ctx.fillText('.pk', x0 + wd + wc + 4, y + (1 - pkP) * size);
    ctx.restore();
  }
  ctx.letterSpacing = '0px';
  return total;
}
// Small brand bug, top-left, during the product section.
function bug(ctx, u) {
  const k = springU(u, 55.2, SPRING.snappy);
  const out = E.inCubic(prog(u, 88.4, 88.8));
  if (k <= 0 || out >= 1) return;
  ctx.save(); ctx.translate(0, -(1 - k) * 80 - out * 120);
  logo(ctx, X0 + 26, 96, 58, 1);
  wordmark(ctx, X0 + 62, 110, 40);
  ctx.restore();
}

// ---------------------------------------------------------------- the medical store (site hero art)
// Layers share one 480x300 viewBox; each moves on its own.
const ART = { w: 480, h: 300 };
const SX = 0, SY = 160, SW = 1080, SS = SW / ART.w, SH = ART.h * SS;
function store(ctx, IMG, o) {
  const { custX = 0, bob = 0, smile = false, phone = false, boxX = 0, boxY = 0, boxA = 1,
    cash = 0, cashA = 0, cash2 = 0, cash2A = 0, ok = 0 } = o;
  const s = SS, x = SX, y = SY, w = SW, h = SH;
  ctx.drawImage(IMG.back, x, y, w, h);
  ctx.save(); ctx.font = f(13 * s, 800, UI); ctx.letterSpacing = `${2 * s}px`; ctx.fillStyle = C.white; ctx.textAlign = 'center';
  ctx.fillText('MEDICAL STORE', x + 254 * s, y + 33 * s); ctx.restore();
  ctx.save(); ctx.translate(custX * s, bob * s);
  ctx.drawImage(smile ? IMG.custSmile : IMG.cust, x, y, w, h);
  if (phone) ctx.drawImage(IMG.hphone, x, y, w, h);
  ctx.restore();
  if (boxA > 0) { ctx.save(); ctx.globalAlpha = boxA; ctx.translate(boxX * s, boxY * s); ctx.drawImage(IMG.box, x, y, w, h); ctx.restore(); }
  ctx.drawImage(IMG.counter, x, y, w, h);
  if (cashA > 0) {
    ctx.save(); ctx.globalAlpha = cashA; ctx.translate(cash * s, 0);
    ctx.drawImage(IMG.cash, x, y, w, h);
    txt(ctx, '250', x + 188 * s, y + 190.5 * s, f(11 * s, 800, UI), '#1F4F2C', 'center');
    ctx.restore();
  }
  if (cash2A > 0) {
    ctx.save(); ctx.globalAlpha = cash2A; ctx.translate(cash2 * s, 0);
    ctx.drawImage(IMG.cash2, x, y, w, h);
    txt(ctx, '89.43', x + 340 * s, y + 190.5 * s, f(10 * s, 800, UI), '#1F4F2C', 'center');
    ctx.restore();
  }
  if (ok > 0) {
    ctx.save(); const cx = x + 160 * s, cy = y + 92 * s; ctx.translate(cx, cy); ctx.scale(ok, ok); ctx.translate(-cx, -cy);
    ctx.drawImage(IMG.ok, x, y, w, h); ctx.restore();
  }
}
// Speech bubble anchored at (ax, ay) = the tip of its tail.
function bubble(ctx, ax, ay, label, k, { size = 70, side = 'right', weight = 800, fam = D } = {}) {
  if (k <= 0) return;
  ctx.save();
  ctx.translate(ax, ay); ctx.scale(k, k);
  ctx.font = f(size, weight, fam); const tw = ctx.measureText(label).width;
  const pw = tw + size * 0.9, ph = size * 1.55;
  const bx = side === 'right' ? -pw * 0.78 : -pw * 0.22, by = -ph - 22;
  rrect(ctx, bx, by, pw, ph, ph * 0.32);
  ctx.fillStyle = C.white; ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = C.ink; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-16, by + ph - 3); ctx.lineTo(0, 0); ctx.lineTo(16, by + ph - 3); ctx.closePath();
  ctx.fillStyle = C.white; ctx.fill(); ctx.stroke();
  ctx.fillStyle = C.white; ctx.fillRect(-13, by + ph - 9, 26, 9);
  ctx.fillStyle = C.ink; ctx.textAlign = 'left'; ctx.fillText(label, bx + size * 0.45, by + ph * 0.68);
  ctx.restore();
}
const pt = (ux, uy) => [SX + ux * SS, SY + uy * SS];

// ---------------------------------------------------------------- A-D the purchase   (u 0..19.3)
function sPurchase(ctx, u, IMG) {
  fill(ctx, C.paper);
  // walk in: slide with a small step bob, settle on beat 4
  const walk = E.outCubic(prog(u, -0.6, 4));
  const custX = lerp(-260, 0, walk);
  const bob = walk < 1 ? -Math.abs(Math.sin(u * Math.PI * 1.6)) * 4 : 0;
  // the box: up from behind the counter on 10.5, handed to the customer on 16.5
  const up = springU(u, 10.5, SPRING.snappy);
  const hand = E.inOutCubic(prog(u, 16.5, 17.4));
  const boxY = lerp(40, 0, Math.min(up, 1)) ;
  const boxX = -100 * hand;
  const boxA = u < 10.5 ? 0 : 1 - prog(u, 17.2, 17.5);
  // cash across on 15, taken on 15.9
  const slide = E.inOutCubic(prog(u, 15, 15.6));
  const cashA = u < 14.6 ? 0 : 1 - prog(u, 15.9, 16.2);
  store(ctx, IMG, { custX, bob, boxX, boxY, boxA, cash: slide * 150, cashA: Math.min(1, prog(u, 14.6, 14.8)) * cashA });
  // the customer asks
  const ka = springU(u, 6, SPRING.bouncy) * (1 - E.inBack(prog(u, 10.4, 10.8)));
  const [hx, hy] = pt(126, 98);
  bubble(ctx, hx, hy, 'Bhai, Panadol Extend dena.', ka, { size: 48, side: 'left', weight: 700, fam: UI });
  // the pharmacist answers
  const kb = springU(u, 11, SPRING.bouncy) * (1 - E.inBack(prog(u, 14.6, 15)));
  const [px, py] = pt(352, 98);
  bubble(ctx, px, py, 'Rs 250.', kb, { size: 78, side: 'right' });
  // captions, under the counter
  const cy = SY + SH + 120;
  const capA = 1 - E.inCubic(prog(u, 5.4, 5.9));
  if (capA > 0) {
    ctx.save(); ctx.translate(0, -(1 - capA) * 40);
    riseLine(ctx, [['Ek aam din,', C.ink]], X0, cy, 72, u, -0.4);
    riseLine(ctx, [['ek medical store.', C.rx]], X0, cy + 86, 72, u, 0.6);
    riseLine(ctx, [['An ordinary day at the pharmacy.', C.soft]], X0, cy + 156, 42, u, 1.6, { weight: 600, fam: UI });
    ctx.restore();
  }
  if (u >= 6.4 && u < 10.8) riseLine(ctx, [['"Brother, Panadol Extend, please."', C.soft]], X0, cy, 42, u, 6.6, { weight: 600, fam: UI });
  if (u >= 11.3 && u < 15) riseLine(ctx, [['"Rs 250," the pharmacist says.', C.soft]], X0, cy, 42, u, 11.4, { weight: 600, fam: UI });
  if (u >= 15) {
    riseLine(ctx, [['Na price dekhi.', C.ink]], X0, cy + 30, 84, u, 15.3);
    riseLine(ctx, [['Na poochha.', C.rx]], X0, cy + 130, 84, u, 16.1);
    riseLine(ctx, [["Didn't check. Didn't ask.", C.soft]], X0, cy + 204, 42, u, 16.8, { weight: 600, fam: UI });
  }
}

// ---------------------------------------------------------------- E the question   (u 18.8..29.3)
function sQuestion(ctx, u) {
  const top = lerp(H + 10, 0, E.inOutCubic(prog(u, 18.8, 19.4)));
  const lift = E.inOutCubic(prog(u, 28.7, 29.3)) * -H;
  ctx.save(); ctx.translate(0, lift);
  ctx.fillStyle = C.band; ctx.fillRect(0, top, W, H - top + 2);
  if (top < 1) {
    const y0 = 300, L = 108, S = 92;
    riseLine(ctx, [['Kya aap bhi', C.white]], X0, y0, S, u, 19.3);
    riseLine(ctx, [['pharmacy jaa kar', C.white]], X0, y0 + L, S, u, 19.8);
    riseLine(ctx, [['price check', C.or]], X0, y0 + 2 * L, S, u, 20.3);
    riseLine(ctx, [['kiye baghair', C.white]], X0, y0 + 3 * L, S, u, 20.8);
    riseLine(ctx, [['paise de dete hain?', C.white]], X0, y0 + 4 * L, S - 6, u, 21.3);
    riseLine(ctx, [['Do you also pay at the pharmacy', C.bandSoft]], X0, y0 + 5 * L + 30, 44, u, 22.6, { weight: 600, fam: UI });
    riseLine(ctx, [['without checking the price?', C.bandSoft]], X0, y0 + 5 * L + 88, 44, u, 22.8, { weight: 600, fam: UI });
  }
  ctx.restore();
}

// ---------------------------------------------------------------- F + G me too, and the turn   (u 28.7..39.4)
function sTurn(ctx, u) {
  fill(ctx, C.paper);
  const up = E.inBack(prog(u, 32.5, 33.2), 1.1) * -900;
  ctx.save(); ctx.translate(0, up);
  riseLine(ctx, [['Main bhi.', C.ink]], X0, 520, 130, u, 29.2);
  riseLine(ctx, [['Har baar.', C.rx]], X0, 660, 130, u, 29.9);
  riseLine(ctx, [['Me too. Every time.', C.soft]], X0, 750, 48, u, 30.6, { weight: 600, fam: UI });
  ctx.restore();
  if (u < 33) return;
  const y0 = 470;
  riseLine(ctx, [['So I looked up', C.ink]], X0, y0, 92, u, 33.2);
  const w = riseLine(ctx, [['DRAP', C.rx], ["'s official prices.", C.ink]], X0, y0 + 104, 92, u, 33.6);
  const ul = E.outCubic(prog(u, 34.3, 35));
  if (ul > 0 && w) { ctx.fillStyle = C.ink; ctx.fillRect(X0, y0 + 128, w * ul, 8); }
  riseLine(ctx, [['Many were ', C.ink], ['lower.', C.rx]], X0, y0 + 280, 76, u, 35.5);
  const sink = E.inOutCubic(prog(u, 37.6, 38.1));
  ctx.save(); ctx.globalAlpha = 1 - 0.5 * sink; ctx.translate(0, sink * 26);
  riseLine(ctx, [['All public. Just buried on', C.soft]], X0, y0 + 370, 50, u, 36.2, { weight: 700, fam: UI });
  riseLine(ctx, [['a government portal.', C.soft]], X0, y0 + 432, 50, u, 36.4, { weight: 700, fam: UI });
  ctx.restore();
  const dash = E.outCubic(prog(u, 37.4, 37.9));
  if (dash > 0) {
    ctx.save(); ctx.strokeStyle = C.rx; ctx.lineWidth = 5; ctx.setLineDash([22, 14]);
    ctx.beginPath(); ctx.moveTo(X0, y0 + 316); ctx.lineTo(X0 + 920 * dash, y0 + 316); ctx.stroke(); ctx.restore();
  }
}

// ---------------------------------------------------------------- H root cause   (u 38.6..52.3)
const STATS = [
  { u: 39.8, num: '4×', lines: ['A Rs 800 heparin injection was', 'sold for Rs 3,500 in Karachi.'], src: 'DAWN, NOV 2023 · DRAP RAIDS' },
  { u: 42.8, num: '1 in 10', lines: ['medical products in countries', 'like Pakistan is substandard or fake.'], src: 'WORLD HEALTH ORGANIZATION, 2017' },
  { u: 45.8, num: '248', count: 248, lines: ['batches declared fake by DRAP', 'since July 2021.'], src: 'DRAP ALERTS, COUNTED BY DAWA CHECK' },
];
function sStats(ctx, u) {
  const top = lerp(H + 20, 0, E.inOutCubic(prog(u, 38.6, 39.2)));
  ctx.fillStyle = C.band; ctx.fillRect(0, top, W, H - top);
  if (top > 0.5) return;
  const leave = E.inBack(prog(u, 51.2, 51.9), 1.1);
  ctx.save(); ctx.translate(-leave * 1200, 0);
  riseLine(ctx, [["IT'S NOT JUST ME", C.bandSoft]], X0, 180, 38, u, 39.2, { weight: 700, fam: UI });
  STATS.forEach((s, i) => {
    const y = 340 + i * 345;
    const k = springU(u, s.u, SPRING.bouncy);
    if (k <= 0) return;
    const q = 0.14 * wobble(u - s.u, 2.2, 5);
    let label = s.num;
    if (s.count) label = String(Math.round(s.count * E.outCubic(prog(u, s.u, s.u + 1.2))));
    const sc = lerp(1.4, 1, Math.min(k, 1));
    ctx.save(); ctx.translate(X0, y); ctx.scale(sc * (1 + q), sc * (1 - q)); txt(ctx, label, 0, 0, f(150), C.or); ctx.restore();
    riseLine(ctx, [[s.lines[0], C.white]], X0, y + 70, 46, u, s.u + 0.35, { weight: 600, fam: UI });
    riseLine(ctx, [[s.lines[1], C.white]], X0, y + 126, 46, u, s.u + 0.5, { weight: 600, fam: UI });
    riseLine(ctx, [[s.src, C.bandSoft]], X0, y + 180, 28, u, s.u + 0.8, { weight: 700, fam: UI });
  });
  ctx.restore();
}

// ---------------------------------------------------------------- I the drop   (u 51.3..55.6)
function sDrop(ctx, u) {
  if (u >= 52) fill(ctx, C.paper);
  const fly = E.outCubic(prog(u, 51.3, 52));
  const k = springU(u, 52, SPRING.bouncy);
  const shrink = E.inOutCubic(prog(u, 54.9, 55.6));
  const cx = lerp(1400, 540, fly), cy = 470;
  const size = lerp(300, 0, shrink) * (u < 52 ? 0.9 : lerp(0.9, 1, Math.min(k, 1.2)));
  const q = 0.1 * wobble(u - 52, 2.2, 5);
  if (size > 1) {
    ctx.save(); ctx.translate(cx, cy); ctx.scale(1 + q, 1 - q); ctx.translate(-cx, -cy);
    logo(ctx, cx, cy, size, prog(u, 52.4, 52.9), (1 - fly) * 3);
    ctx.restore();
  }
  if (u < 52) return;
  ctx.save(); ctx.globalAlpha = 1 - shrink; ctx.translate(0, -shrink * 200);
  riseLine(ctx, [['So I built', C.soft]], 540, 250, 52, u, 52.1, { weight: 700, fam: UI, align: 'center' });
  const wk = springU(u, 52.5, SPRING.snappy);
  if (wk > 0) {
    ctx.save(); ctx.beginPath(); ctx.rect(0, 600, W, 220); ctx.clip(); ctx.translate(0, (1 - wk) * 200);
    wordmark(ctx, 540, 760, 170, { align: 'center', hlP: E.outCubic(prog(u, 53, 53.6)) });
    ctx.restore();
  }
  riseLine(ctx, [['Official medicine prices and', C.ink]], 540, 930, 46, u, 53.2, { weight: 600, fam: UI, align: 'center' });
  riseLine(ctx, [['fake-medicine alerts, in 10 seconds.', C.ink]], 540, 990, 46, u, 53.4, { weight: 600, fam: UI, align: 'center' });
  ctx.restore();
}

// ---------------------------------------------------------------- J the price check   (u 55.6..63)
function sPrice(ctx, u, IMG) {
  fill(ctx, C.paper);
  const cap1 = 1 - E.inCubic(prog(u, 58.8, 59.3));
  if (cap1 > 0) { ctx.save(); ctx.translate(0, -(1 - cap1) * 60); riseLine(ctx, [['Type the medicine.', C.ink]], X0, 250, 74, u, 55.8); ctx.restore(); }
  if (u > 59) riseLine(ctx, [['Enter what you ', C.ink], ['paid.', C.rx]], X0, 250, 74, u, 59.3);
  const rise = springU(u, 55.6, SPRING.gentle);
  const zoom = E.inExpo(prog(u, 62.2, 63));
  const pw = 640, px = (W - pw) / 2, py = lerp(H + 40, 320, Math.min(rise, 1.05));
  const z = Math.exp(Math.log(5.5) * zoom);
  ctx.save();
  const fx = 660, fy = 980;
  ctx.translate(fx, fy); ctx.scale(z, z); ctx.translate(-fx, -fy);
  rrect(ctx, px, py, pw, 1300, 78); ctx.fillStyle = C.ink; ctx.fill();
  const sx = px + 18, sy = py + 18, sw = pw - 36;
  ctx.save(); rrect(ctx, sx, sy, sw, 1300, 62); ctx.clip();
  ctx.fillStyle = C.paper; ctx.fillRect(sx, sy, sw, 1300);
  const k = sw / 1050;
  const scroll = springKeys(u, [[56, 0], [58.2, 360], [59.4, 690]], SPRING.gentle);
  const top = sy + 30 - scroll;
  ctx.drawImage(IMG.priceEmpty, sx, top, sw, 1203 * k);
  const tp = prog(u, 57, 57.9);
  if (tp > 0) { ctx.save(); ctx.beginPath(); ctx.rect(sx, top, sw * (tp < 1 ? 0.25 + 0.6 * tp : 1), 1203 * k); ctx.clip(); ctx.drawImage(IMG.priceTyped, sx, top, sw, 1203 * k); ctx.restore(); }
  const rk = springU(u, 58, SPRING.snappy);
  if (rk > 0) { ctx.save(); ctx.translate(0, (1 - rk) * 60); ctx.drawImage(IMG.pack, sx, top + 1203 * k + 20, sw, 801 * k); ctx.restore(); }
  const payY = top + 1203 * k + 20 + 801 * k - 6;
  const pk = springU(u, 59.2, SPRING.snappy);
  if (pk > 0) {
    const im = u < 61 ? IMG.pay120 : u < 62 ? IMG.pay160 : IMG.pay250;
    const pw2 = 960 * k;
    ctx.save(); ctx.translate(0, (1 - pk) * 50); ctx.drawImage(im, sx + (sw - pw2) / 2, payY, pw2, 558 * k); ctx.restore();
  }
  ctx.restore();
  rrect(ctx, px + pw / 2 - 70, py + 30, 140, 30, 15); ctx.fillStyle = C.ink; ctx.fill();
  ctx.restore();
  if (zoom > 0.6) { ctx.fillStyle = C.red; ctx.globalAlpha = E.inCubic(prog(zoom, 0.6, 1)); ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
}

// ---------------------------------------------------------------- K the verdict   (u 63..69.1)
function sVerdict(ctx, u, IMG) {
  fill(ctx, C.paper);
  const leave = E.inOutCubic(prog(u, 68.4, 69.1)) * -H;
  ctx.save(); ctx.translate(0, leave);
  const k = springU(u, 63, SPRING.bouncy);
  const q = 0.07 * wobble(u - 63, 2.4, 6);
  const cw = 900, ch = cw * 710 / 858, cx = (W - cw) / 2, cy = 200;
  const s = lerp(1.14, 1, Math.min(k, 1.1));
  ctx.save(); ctx.translate(W / 2, cy + ch / 2); ctx.scale(s * (1 + q), s * (1 - q)); ctx.translate(-W / 2, -(cy + ch / 2));
  ctx.save(); rrect(ctx, cx, cy, cw, ch, 34); ctx.clip();
  crop(ctx, IMG.verdict, [0, 0, 858, 710], cx, cy, cw, ch);
  ctx.restore(); ctx.restore();
  const y = cy + ch + 130;
  riseLine(ctx, [['You were overcharged', C.ink]], X0, y, 76, u, 63.8);
  const n = 89.43 * E.outCubic(prog(u, 64.5, 65.7));
  if (u >= 64.5) riseLine(ctx, [[`Rs ${n.toFixed(2)}.`, C.red]], X0, y + 96, 96, u, 64.5);
  riseLine(ctx, [['Show the pharmacist this screen.', C.soft]], X0, y + 180, 44, u, 66.2, { weight: 600, fam: UI });
  ctx.restore();
}

// ---------------------------------------------------------------- K2 back at the counter   (u 68.4..75)
function sRefund(ctx, u, IMG) {
  const enter = 1 - E.inOutCubic(prog(u, 68.4, 69.1));
  const leave = E.inOutCubic(prog(u, 74.4, 75.1));
  ctx.save(); ctx.translate(-leave * W, enter * H);
  fill(ctx, C.paper);
  const back = E.inOutCubic(prog(u, 71.5, 72.2));
  const cash2A = u < 71.3 ? 0 : 1 - prog(u, 72.3, 72.6);
  const ok = springU(u, 72.5, SPRING.bouncy);
  store(ctx, IMG, { phone: true, smile: u >= 72.3, boxA: 0, cash2: -150 * back, cash2A: Math.min(1, prog(u, 71.3, 71.5)) * cash2A, ok: Math.min(ok, 1.2) });
  const kb = springU(u, 70, SPRING.bouncy) * (1 - E.inBack(prog(u, 74, 74.4)));
  const [px, py] = pt(352, 98);
  bubble(ctx, px, py, 'Sorry ji, Rs 89.43 wapas.', kb, { size: 46, side: 'right', weight: 700, fam: UI });
  const cy = SY + SH + 140;
  riseLine(ctx, [['Screen dikhayi.', C.ink]], X0, cy, 84, u, 70.4);
  riseLine(ctx, [['Paise wapas.', C.rx]], X0, cy + 100, 84, u, 71.1);
  riseLine(ctx, [['Show the screen. Get your money back.', C.soft]], X0, cy + 174, 42, u, 71.9, { weight: 600, fam: UI });
  ctx.restore();
}

// ---------------------------------------------------------------- L the batch check   (u 74.4..82.1)
function sBatch(ctx, u, IMG) {
  const enter = 1 - E.inOutCubic(prog(u, 74.4, 75.1));
  const leave = E.inOutCubic(prog(u, 81.4, 82.1));
  ctx.save(); ctx.translate((enter - leave) * W, 0);
  fill(ctx, C.paper);
  riseLine(ctx, [['Is it real? Check the ', C.ink], ['batch.', C.rx]], X0, 240, 66, u, 74.6);
  riseLine(ctx, [['Matched against 756 DRAP alerts.', C.soft]], X0, 302, 40, u, 79.6, { weight: 600, fam: UI });
  const src = [0, 0, 1050, 1180];
  const cw = 860, ch = cw * 1180 / 1050, cx = (W - cw) / 2, cy = 350;
  const hit = u >= 79;
  const pk = hit ? 1 + 0.07 * wobble(u - 79, 2.6, 6) : 1;
  ctx.save(); ctx.translate(W / 2, cy + ch / 2); ctx.scale(pk, pk); ctx.translate(-W / 2, -(cy + ch / 2));
  if (hit && u < 79.8) M.shake(ctx, u, 79, 12);
  ctx.save(); rrect(ctx, cx, cy, cw, ch, 30); ctx.clip();
  if (hit) crop(ctx, IMG.batchAlert, src, cx, cy, cw, ch);
  else {
    crop(ctx, IMG.batchEmpty, src, cx, cy, cw, ch);
    const tp = prog(u, 76, 77.2);
    if (tp > 0) {
      const k = cw / 1050;
      ctx.save(); ctx.beginPath(); ctx.rect(cx, cy, (tp < 1 ? (360 + 260 * tp) : 1050) * k, ch); ctx.clip();
      crop(ctx, IMG.batchTyped, src, cx, cy, cw, ch);
      ctx.restore();
    }
  }
  ctx.restore(); ctx.restore(); ctx.restore();
}

// ---------------------------------------------------------------- M complaint steps   (u 81.4..89.2)
const LADDER = [[0, 0, 1050, 519], [0, 552, 1050, 621], [0, 1212, 1050, 677], [0, 1929, 1050, 725]];
function sLadder(ctx, u, IMG) {
  const enter = 1 - E.inOutCubic(prog(u, 81.4, 82.1));
  const col = E.inBack(prog(u, 88.4, 89), 1.3);
  ctx.save(); ctx.translate(enter * W, 0);
  fill(ctx, C.paper);
  riseLine(ctx, [["Pharmacist won't agree?", C.ink]], X0, 230, 70, u, 81.6);
  riseLine(ctx, [['The complaint steps are right there.', C.soft]], X0, 292, 40, u, 82.3, { weight: 600, fam: UI });
  const cw = 900, k = cw / 1050, cx = (W - cw) / 2;
  LADDER.forEach((r, i) => {
    const u0 = 83 + i * 1.3;
    const sk = springU(u, u0, SPRING.bouncy);
    if (sk <= 0) return;
    const y = 350 + i * 150 + (1 - Math.min(sk, 1.2)) * 120;
    const h = r[3] * k;
    ctx.save();
    const cs = 1 - col; ctx.translate(W / 2, 700); ctx.scale(cs, cs); ctx.translate(-W / 2, -700);
    ctx.shadowColor = 'rgba(42,22,112,0.22)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10;
    rrect(ctx, cx, y, cw, h, 26); ctx.fillStyle = C.paper; ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.save(); rrect(ctx, cx, y, cw, h, 26); ctx.clip(); crop(ctx, IMG.ladder, r, cx, y, cw, h); ctx.restore();
    ctx.restore();
  });
  ctx.restore();
}

// ---------------------------------------------------------------- N what it costs you   (u 88.6..93.7)
function sValues(ctx, u) {
  const bg = E.inOutCubic(prog(u, 88.6, 89.2));
  ctx.save(); ctx.beginPath(); ctx.arc(W / 2, 700, lerp(0, 1500, bg), 0, Math.PI * 2); ctx.fillStyle = C.rx; ctx.fill(); ctx.restore();
  if (bg < 0.5) return;
  ctx.save(); ctx.translate(0, -E.inBack(prog(u, 93, 93.7), 1.2) * H);
  [['Free', 89], ['No login', 89.8], ['Roman Urdu + English', 90.6]].forEach(([label, u0], i) => {
    const k = springU(u, u0, SPRING.bouncy);
    if (k <= 0) return;
    ctx.font = f(64); const tw = ctx.measureText(label).width;
    const pw = tw + 80, ph = 104, x = X0, yy = 300 + i * 132 - (1 - Math.min(k, 1.1)) * 300;
    ctx.save(); ctx.translate(x + pw / 2, yy + ph / 2); ctx.rotate((i - 1) * -0.025); ctx.scale(Math.min(k, 1.15), Math.min(k, 1.15)); ctx.translate(-(x + pw / 2), -(yy + ph / 2));
    rrect(ctx, x, yy, pw, ph, ph / 2); ctx.fillStyle = C.or; ctx.fill();
    txt(ctx, label, x + 40, yy + 74, f(64), C.band);
    ctx.restore();
  });
  if (u >= 91.4) {
    const n = Math.round(21534 * E.outCubic(prog(u, 91.4, 92.6))).toLocaleString('en');
    riseLine(ctx, [[n, C.white]], X0, 860, 150, u, 91.4);
    riseLine(ctx, [['official DRAP medicine prices', C.lilac]], X0, 930, 44, u, 91.7, { weight: 600, fam: UI });
  }
  riseLine(ctx, [['+ 756 fake and failed medicine alerts', C.white]], X0, 1040, 44, u, 92.3, { weight: 700, fam: UI });
  ctx.restore();
}

// ---------------------------------------------------------------- O end card: dawacheck.pk lockup   (u 93.6..)
function sEnd(ctx, u) {
  fill(ctx, C.rx);
  const k = springU(u, 93.7, SPRING.bouncy);
  const q = 0.08 * wobble(u - 93.7, 2.2, 5);
  if (k > 0) {
    const s = Math.min(k, 1.1);
    ctx.save(); ctx.translate(540, 420); ctx.scale(1 + q, 1 - q); ctx.translate(-540, -420);
    ctx.beginPath(); ctx.arc(540, 420, 150 * s, 0, Math.PI * 2); ctx.fillStyle = C.paper; ctx.fill();
    logo(ctx, 540, 420, 230 * s, prog(u, 94.3, 94.8));
    ctx.restore();
  }
  // the lockup: dawacheck is the brand, .pk rides on the same baseline as the address
  const wk = springU(u, 94, SPRING.snappy);
  if (wk > 0) {
    ctx.save(); ctx.beginPath(); ctx.rect(0, 620, W, 220); ctx.clip(); ctx.translate(0, (1 - wk) * 200);
    wordmark(ctx, 540, 780, 150, { align: 'center', dawa: C.white, check: C.or, hl: false, pk: C.lilac, pkP: E.outCubic(prog(u, 94.6, 95.2)) });
    ctx.restore();
  }
  riseLine(ctx, [['Sahi qeemat, asli dawa.', C.white]], 540, 930, 54, u, 95.2, { weight: 700, fam: UI, align: 'center' });
  riseLine(ctx, [['Free · No login · Roman Urdu + English', C.lilac]], 540, 1010, 36, u, 95.8, { weight: 600, fam: UI, align: 'center' });
}

// ---------------------------------------------------------------- film
M.film({
  fonts: [f(100), f(40, 500, UI), f(40, 600, UI), f(40, 700, UI), f(100, 800, MARK)],
  samples: 10,
  images: {
    back: 'assets/scene/back.svg', cust: 'assets/scene/cust.svg', custSmile: 'assets/scene/cust_smile.svg',
    hphone: 'assets/scene/hphone.svg', counter: 'assets/scene/counter.svg', box: 'assets/scene/box.svg',
    cash: 'assets/scene/cash.svg', cash2: 'assets/scene/cash2.svg', ok: 'assets/scene/ok.svg',
    priceEmpty: 'assets/shots/v_price_empty.png', priceTyped: 'assets/shots/v_price_typed.png', pack: 'assets/shots/v_pack.png',
    pay120: 'assets/shots/v_pay_120.png', pay160: 'assets/shots/v_pay_160.png', pay250: 'assets/shots/v_pay_250.png',
    verdict: 'assets/shots/v_verdict.png',
    batchEmpty: 'assets/shots/v_batch_empty.png', batchTyped: 'assets/shots/v_batch_typed.png', batchAlert: 'assets/shots/v_batch_alert.png',
    ladder: 'assets/shots/prod_ladder.png',
  },
  hits: HITS,
  draw(ctx, u, t, IMG) {
    if (u < 19.4) sPurchase(ctx, u, IMG);
    if (u >= 18.8 && u < 29.3) sQuestion(ctx, u);
    if (u >= 28.7 && u < 39.2) {
      // the question card lifts away and "Main bhi" is underneath
      if (u < 29.3) { ctx.save(); ctx.beginPath(); ctx.rect(0, H + E.inOutCubic(prog(u, 28.7, 29.3)) * -H, W, H); ctx.clip(); sTurn(ctx, u); ctx.restore(); sQuestion(ctx, u); }
      else sTurn(ctx, u);
    }
    if (u >= 38.6 && u < 52) sStats(ctx, u);
    if (u >= 51.3 && u < 55.6) sDrop(ctx, u);
    if (u >= 55.6 && u < 63) sPrice(ctx, u, IMG);
    if (u >= 63 && u < 69.1) sVerdict(ctx, u, IMG);
    if (u >= 68.4 && u < 75.1) sRefund(ctx, u, IMG);
    if (u >= 74.4 && u < 82.1) sBatch(ctx, u, IMG);
    if (u >= 81.4 && u < 89.2) sLadder(ctx, u, IMG);
    if (u >= 88.6 && u < 93.7) sValues(ctx, u);
    if (u >= 93.6) sEnd(ctx, u);
    if (u >= 55.2 && u < 88.8) bug(ctx, u);
  },
});
