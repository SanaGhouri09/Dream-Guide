// Dawa Check launch (LinkedIn, 4:5, 63 s). Pure function of time: window.seek(t) paints frame t.
// Timing is in beats (u) on the measured grid (80 bpm, 1 beat = 0.75 s); docs/shotlist.md is the plan.
// Roman Urdu only. Reading rule: every line holds at least (words / 3 + 1) seconds.
import * as M from './lib/motion.js';

const { W, H, E, prog, lerp, springU, springKeys, SPRING, wobble, font, fill, rrect, crop } = M;

const C = {
  paper: '#F6F4FC', ink: '#21134F', rx: '#4B2BB8', or: '#FFD23F', red: '#C42B1C', soft: '#5E5880',
  line: '#E0DCF0', rxbg: '#EEEAFE', band: '#2A1670', bandSoft: '#BDB3EE', lilac: '#BCAEFF', white: '#FFFFFF',
};
const D = 'Display', UI = 'UI', MARK = 'Mark';
const X0 = 80;

const HITS = [
  [0, 'hook', 'tick'], [3, 'customer asks', 'pop', { pitch: 'E5' }],
  [6.5, 'box on the counter', 'thud', { pitch: 90 }], [7, 'Rs 250', 'pop', { pitch: 'A5' }],
  [10.8, 'cash slides', 'whoosh', { len: 0.35, from: 900, to: 2600 }], [11.4, 'cash taken', 'coins'],
  [13.4, 'band rises', 'whoosh', { len: 0.45, from: 400, to: 1600 }],
  [14.6, 'Rs 800', 'tick'], [15.4, 'Rs 3,500', 'thud'],
  [24, 'swell into the drop', 'swell', { len: 1.5 }], [24, 'logo lands', 'impact'], [24.6, 'check draws', 'bell', { pitch: 'C6' }],
  [28.9, 'phone rises', 'whoosh', { len: 0.5, from: 300, to: 1400 }],
  [30, 'typing name', 'type', { len: 0.9, n: 9 }], [31, 'results', 'click'], [32.2, 'pack tap', 'click'],
  [33, 'Rs 120', 'tick'], [34, 'Rs 160', 'tick'], [35, 'Rs 250 in the red', 'thud'],
  [35.4, 'push in', 'whoosh', { len: 0.4, from: 600, to: 2400 }],
  [36, 'verdict', 'impact'],
  [41.4, 'back to the counter', 'whoosh', { len: 0.4, from: 2400, to: 700 }],
  [42.5, 'sorry ji', 'pop', { pitch: 'G5' }], [44, 'refund', 'coins'], [45, 'tick badge', 'bell', { pitch: 'C6' }],
  [46.4, 'to the second hook', 'whoosh', { len: 0.4, from: 700, to: 2600, pan: 0.3 }],
  [49.4, 'asli bhi hai', 'thud', { pitch: 70 }],
  [54.4, 'band rises', 'whoosh', { len: 0.45, from: 400, to: 1600 }],
  [55.6, '248', 'thud'], [57.8, '417', 'thud'],
  [62.4, 'whip to batch', 'whoosh', { len: 0.4, from: 700, to: 2600, pan: 0.3 }],
  [64, 'typing batch', 'type', { len: 1.1, n: 6 }], [66.5, 'DRAP ALERT', 'impact'],
  [70.4, 'to the shelf', 'whoosh', { len: 0.4, from: 2600, to: 700, pan: -0.3 }],
  [71.5, 'shelf pans', 'tick'],
  [76.6, 'circle wipe', 'whoosh', { len: 0.4, from: 2600, to: 600 }],
  [77, 'end card', 'impact'], [77.5, 'logo check', 'bell', { pitch: 'C6' }],
  [78.2, 'free', 'pop', { pitch: 'E5' }], [79, 'made for Pakistan', 'pop', { pitch: 'G5' }],
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
  const k = springU(u, 28.6, SPRING.snappy);
  const out = E.inCubic(prog(u, 76.4, 76.9));
  if (k <= 0 || out >= 1) return;
  ctx.save(); ctx.translate(0, -(1 - k) * 80 - out * 120);
  logo(ctx, X0 + 26, 96, 58, 1);
  wordmark(ctx, X0 + 62, 110, 40);
  ctx.restore();
}

// ---------------------------------------------------------------- the medical store (site hero art)
// Layers share one 480x300 viewBox; each moves on its own.
const ART = { w: 480, h: 300 };
const SX = 0, SY = 110, SW = 1080, SS = SW / ART.w, SH = ART.h * SS;
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

// ---------------------------------------------------------------- 1 hook over the purchase   (u 0..14)
function sHook(ctx, u, IMG) {
  fill(ctx, C.paper);
  const walk = E.outCubic(prog(u, -0.8, 2.6));
  const custX = lerp(-260, 0, walk);
  const bob = walk < 1 ? -Math.abs(Math.sin(u * Math.PI * 1.6)) * 4 : 0;
  const up = springU(u, 6.5, SPRING.snappy);
  const hand = E.inOutCubic(prog(u, 12, 12.9));
  const boxA = u < 6.5 ? 0 : 1 - prog(u, 12.7, 13);
  const slide = E.inOutCubic(prog(u, 10.8, 11.4));
  const cashA = u < 10.4 ? 0 : Math.min(1, prog(u, 10.4, 10.6)) * (1 - prog(u, 11.7, 12));
  store(ctx, IMG, { custX, bob, boxX: -100 * hand, boxY: lerp(40, 0, Math.min(up, 1)), boxA, cash: slide * 150, cashA });
  const ka = springU(u, 3, SPRING.bouncy) * (1 - E.inBack(prog(u, 6.2, 6.6)));
  const [hx, hy] = pt(126, 98);
  bubble(ctx, hx, hy, 'Bhai, Panadol Extend dena.', ka, { size: 48, side: 'left', weight: 700, fam: UI });
  const kb = springU(u, 7, SPRING.bouncy) * (1 - E.inBack(prog(u, 10.4, 10.8)));
  const [px, py] = pt(352, 98);
  bubble(ctx, px, py, 'Rs 250.', kb, { size: 78, side: 'right' });
  // the hook line, Roman only, under the counter
  const y0 = SY + SH + 95, L = 80, S = 66;
  riseLine(ctx, [['Kya aap bhi', C.ink]], X0, y0, S, u, -0.4);
  riseLine(ctx, [['pharmacy jaa kar', C.ink]], X0, y0 + L, S, u, 0.4);
  riseLine(ctx, [['bagair ', C.ink], ['price check', C.rx, { hl: 2.6 }], [' kiye', C.ink]], X0, y0 + 2 * L, S, u, 1.2);
  riseLine(ctx, [['ya ', C.ink], ['verify', C.rx, { hl: 3.4 }], [' kiye', C.ink]], X0, y0 + 3 * L, S, u, 2);
  riseLine(ctx, [['dawa khareed lete hain?', C.ink]], X0, y0 + 4 * L, S, u, 2.8);
}

// ---------------------------------------------------------------- 2 the price stat   (u 13.4..24.1)
function sPriceStat(ctx, u) {
  const top = lerp(H + 20, 0, E.inOutCubic(prog(u, 13.4, 14)));
  ctx.fillStyle = C.band; ctx.fillRect(0, top, W, H - top + 2);
  if (top > 0.5) return;
  const leave = E.inBack(prog(u, 23.2, 23.9), 1.1);
  ctx.save(); ctx.translate(-leave * 1200, 0);
  riseLine(ctx, [['YEH SIRF AAP KE SAATH NAHI HOTA', C.bandSoft]], X0, 200, 34, u, 14.1, { weight: 700, fam: UI });
  // Rs 800 -> Rs 3,500, the real case
  const k1 = springU(u, 14.6, SPRING.snappy);
  if (k1 > 0) {
    riseLine(ctx, [['Rs 800', C.bandSoft]], X0, 420, 110, u, 14.6);
    const st = E.outCubic(prog(u, 15.1, 15.6));
    if (st > 0) { ctx.fillStyle = C.red; ctx.fillRect(X0 - 6, 380, (widthOf(ctx, 'Rs 800', f(110)) + 12) * st, 12); }
  }
  const k2 = springU(u, 15.4, SPRING.bouncy);
  if (k2 > 0) {
    const q = 0.12 * wobble(u - 15.4, 2.2, 5), sc = lerp(1.4, 1, Math.min(k2, 1));
    ctx.save(); ctx.translate(X0, 600); ctx.scale(sc * (1 + q), sc * (1 - q)); txt(ctx, 'Rs 3,500', 0, 0, f(170), C.or); ctx.restore();
  }
  riseLine(ctx, [['Karachi mein Rs 800 ka heparin', C.white]], X0, 720, 50, u, 16.4, { weight: 600, fam: UI });
  riseLine(ctx, [['injection Rs 3,500 mein bik raha tha.', C.white]], X0, 784, 50, u, 16.6, { weight: 600, fam: UI });
  riseLine(ctx, [['DRAP ke chhapon mein pakra gaya.', C.white]], X0, 848, 50, u, 17.6, { weight: 600, fam: UI });
  riseLine(ctx, [['Source: Dawn, Nov 2023', C.bandSoft]], X0, 950, 32, u, 18.6, { weight: 700, fam: UI });
  ctx.restore();
}

// ---------------------------------------------------------------- 3 so I built dawacheck.pk   (u 23.3..29)
function sBuilt(ctx, u) {
  if (u >= 24) fill(ctx, C.paper);
  const fly = E.outCubic(prog(u, 23.3, 24));
  const k = springU(u, 24, SPRING.bouncy);
  const shrink = E.inOutCubic(prog(u, 28.2, 28.9));
  const cx = lerp(1400, 540, fly), cy = 470;
  const size = lerp(300, 0, shrink) * (u < 24 ? 0.9 : lerp(0.9, 1, Math.min(k, 1.2)));
  const q = 0.1 * wobble(u - 24, 2.2, 5);
  if (size > 1) {
    ctx.save(); ctx.translate(cx, cy); ctx.scale(1 + q, 1 - q); ctx.translate(-cx, -cy);
    logo(ctx, cx, cy, size, prog(u, 24.4, 24.9), (1 - fly) * 3);
    ctx.restore();
  }
  if (u < 24) return;
  ctx.save(); ctx.globalAlpha = 1 - shrink; ctx.translate(0, -shrink * 200);
  riseLine(ctx, [['Is liye maine banaya', C.soft]], 540, 250, 54, u, 24.1, { weight: 700, fam: UI, align: 'center' });
  const wk = springU(u, 24.5, SPRING.snappy);
  if (wk > 0) {
    ctx.save(); ctx.beginPath(); ctx.rect(0, 600, W, 220); ctx.clip(); ctx.translate(0, (1 - wk) * 200);
    wordmark(ctx, 540, 760, 150, { align: 'center', hlP: E.outCubic(prog(u, 25, 25.6)), pk: C.rx, pkP: E.outCubic(prog(u, 25.2, 25.8)) });
    ctx.restore();
  }
  riseLine(ctx, [['Dawa ki asli qeemat,', C.ink]], 540, 930, 54, u, 25.6, { weight: 700, fam: UI, align: 'center' });
  riseLine(ctx, [['sirf 10 second mein.', C.ink]], 540, 1000, 54, u, 25.8, { weight: 700, fam: UI, align: 'center' });
  ctx.restore();
}

// ---------------------------------------------------------------- 4 the price check   (u 28.9..36)
function sPrice(ctx, u, IMG) {
  fill(ctx, C.paper);
  const cap1 = 1 - E.inCubic(prog(u, 32, 32.4));
  if (cap1 > 0) { ctx.save(); ctx.translate(0, -(1 - cap1) * 60); riseLine(ctx, [['Dawa ka naam likhein.', C.ink]], X0, 250, 72, u, 29.1); ctx.restore(); }
  if (u > 32.1) riseLine(ctx, [['Jitne diye, woh ', C.ink], ['likhein.', C.rx]], X0, 250, 72, u, 32.4);
  const rise = springU(u, 28.9, SPRING.gentle);
  const zoom = E.inExpo(prog(u, 35.3, 36));
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
  const scroll = springKeys(u, [[29, 0], [31.2, 360], [32.4, 690]], SPRING.gentle);
  const top = sy + 30 - scroll;
  ctx.drawImage(IMG.priceEmpty, sx, top, sw, 1203 * k);
  const tp = prog(u, 30, 30.9);
  if (tp > 0) { ctx.save(); ctx.beginPath(); ctx.rect(sx, top, sw * (tp < 1 ? 0.25 + 0.6 * tp : 1), 1203 * k); ctx.clip(); ctx.drawImage(IMG.priceTyped, sx, top, sw, 1203 * k); ctx.restore(); }
  const rk = springU(u, 31, SPRING.snappy);
  if (rk > 0) { ctx.save(); ctx.translate(0, (1 - rk) * 60); ctx.drawImage(IMG.pack, sx, top + 1203 * k + 20, sw, 801 * k); ctx.restore(); }
  const payY = top + 1203 * k + 20 + 801 * k - 6;
  const pk = springU(u, 32.2, SPRING.snappy);
  if (pk > 0) {
    const im = u < 34 ? IMG.pay120 : u < 35 ? IMG.pay160 : IMG.pay250;
    const pw2 = 960 * k;
    ctx.save(); ctx.translate(0, (1 - pk) * 50); ctx.drawImage(im, sx + (sw - pw2) / 2, payY, pw2, 558 * k); ctx.restore();
  }
  ctx.restore();
  rrect(ctx, px + pw / 2 - 70, py + 30, 140, 30, 15); ctx.fillStyle = C.ink; ctx.fill();
  ctx.restore();
  if (zoom > 0.6) { ctx.fillStyle = C.red; ctx.globalAlpha = E.inCubic(prog(zoom, 0.6, 1)); ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
}

// ---------------------------------------------------------------- 5 the verdict   (u 36..42)
function sVerdict(ctx, u, IMG) {
  fill(ctx, C.paper);
  const leave = E.inOutCubic(prog(u, 41.4, 42)) * -H;
  ctx.save(); ctx.translate(0, leave);
  const k = springU(u, 36, SPRING.bouncy);
  const q = 0.07 * wobble(u - 36, 2.4, 6);
  const cw = 900, ch = cw * 710 / 858, cx = (W - cw) / 2, cy = 200;
  const s = lerp(1.14, 1, Math.min(k, 1.1));
  ctx.save(); ctx.translate(W / 2, cy + ch / 2); ctx.scale(s * (1 + q), s * (1 - q)); ctx.translate(-W / 2, -(cy + ch / 2));
  ctx.save(); rrect(ctx, cx, cy, cw, ch, 34); ctx.clip();
  crop(ctx, IMG.verdict, [0, 0, 858, 710], cx, cy, cw, ch);
  ctx.restore(); ctx.restore();
  const y = cy + ch + 120;
  riseLine(ctx, [['Pharmacist ko yeh', C.ink]], X0, y, 72, u, 37);
  riseLine(ctx, [['screen dikhayein.', C.rx]], X0, y + 86, 72, u, 37.4);
  riseLine(ctx, [['Na maanein, to complaint ka rasta bhi yahin.', C.soft]], X0, y + 170, 38, u, 38.6, { weight: 600, fam: UI });
  ctx.restore();
}

// ---------------------------------------------------------------- 6 back at the counter   (u 41.4..47)
function sRefund(ctx, u, IMG) {
  const enter = 1 - E.inOutCubic(prog(u, 41.4, 42));
  const leave = E.inOutCubic(prog(u, 46.4, 47));
  ctx.save(); ctx.translate(-leave * W, enter * H);
  fill(ctx, C.paper);
  const back = E.inOutCubic(prog(u, 44, 44.7));
  const cash2A = u < 43.8 ? 0 : Math.min(1, prog(u, 43.8, 44)) * (1 - prog(u, 44.8, 45.1));
  const ok = springU(u, 45, SPRING.bouncy);
  store(ctx, IMG, { phone: true, smile: u >= 44.8, boxA: 0, cash2: -150 * back, cash2A, ok: Math.min(ok, 1.2) });
  const kb = springU(u, 42.5, SPRING.bouncy) * (1 - E.inBack(prog(u, 46, 46.4)));
  const [px, py] = pt(352, 98);
  bubble(ctx, px, py, 'Sorry ji, Rs 89.43 wapas.', kb, { size: 46, side: 'right', weight: 700, fam: UI });
  const cy = SY + SH + 150;
  riseLine(ctx, [['Screen dikhayi.', C.ink]], X0, cy, 88, u, 42.8);
  riseLine(ctx, [['Paise wapas.', C.rx]], X0, cy + 104, 88, u, 43.5);
  ctx.restore();
}

// ---------------------------------------------------------------- 7 the second hook   (u 46.4..55)
function sHook2(ctx, u) {
  const enter = 1 - E.inOutCubic(prog(u, 46.4, 47));
  ctx.save(); ctx.translate(enter * W, 0);
  fill(ctx, C.paper);
  riseLine(ctx, [['Aur masla sirf', C.ink]], X0, 400, 84, u, 47.2);
  riseLine(ctx, [['qeemat ka nahi.', C.ink]], X0, 500, 84, u, 47.7);
  riseLine(ctx, [['Kya aap ki dawa', C.ink]], X0, 720, 104, u, 49);
  const k = springU(u, 49.4, SPRING.bouncy);
  if (k > 0) {
    const q = 0.1 * wobble(u - 49.4, 2.2, 5), sc = lerp(1.3, 1, Math.min(k, 1));
    ctx.save(); ctx.translate(X0, 850); ctx.scale(sc * (1 + q), sc * (1 - q)); txt(ctx, 'asli bhi hai?', 0, 0, f(124), C.red); ctx.restore();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- 8 the fake-medicine stat   (u 54.4..63)
function sFakeStat(ctx, u) {
  const top = lerp(H + 20, 0, E.inOutCubic(prog(u, 54.4, 55)));
  const leave = E.inOutCubic(prog(u, 62.4, 63));
  ctx.save(); ctx.translate(-leave * W, 0);
  ctx.fillStyle = C.band; ctx.fillRect(0, top, W, H - top + 2);
  if (top < 0.5) {
    riseLine(ctx, [['DRAP KE APNE ALERTS', C.bandSoft]], X0, 200, 34, u, 55.1, { weight: 700, fam: UI });
    const k = springU(u, 55.6, SPRING.bouncy);
    if (k > 0) {
      const n = Math.round(248 * E.outCubic(prog(u, 55.6, 56.8)));
      const q = 0.12 * wobble(u - 55.6, 2.2, 5), sc = lerp(1.4, 1, Math.min(k, 1));
      ctx.save(); ctx.translate(X0, 420); ctx.scale(sc * (1 + q), sc * (1 - q)); txt(ctx, String(n), 0, 0, f(190), C.or); ctx.restore();
    }
    riseLine(ctx, [['batches July 2021 se', C.white]], X0, 510, 54, u, 56.1, { weight: 700, fam: UI });
    riseLine(ctx, [['naqli declare hue.', C.white]], X0, 576, 54, u, 56.3, { weight: 700, fam: UI });
    const k2 = springU(u, 57.8, SPRING.bouncy);
    if (k2 > 0) { const sc = lerp(1.3, 1, Math.min(k2, 1)); ctx.save(); ctx.translate(X0, 780); ctx.scale(sc, sc); txt(ctx, '+ 417', 0, 0, f(130), C.or); ctx.restore(); }
    riseLine(ctx, [['batches lab test mein fail.', C.white]], X0, 860, 54, u, 58.2, { weight: 700, fam: UI });
    riseLine(ctx, [['Source: DRAP recall aur rapid alerts', C.bandSoft]], X0, 980, 32, u, 59.2, { weight: 700, fam: UI });
  }
  ctx.restore();
}

// ---------------------------------------------------------------- 9 the batch check + the fake shelf   (u 62.4..77)
function sBatch(ctx, u, IMG) {
  const enter = 1 - E.inOutCubic(prog(u, 62.4, 63));
  const leave = E.inOutCubic(prog(u, 70.4, 71));
  ctx.save(); ctx.translate((enter - leave) * W, 0);
  fill(ctx, C.paper);
  riseLine(ctx, [['Dibbe par likha ', C.ink], ['batch number', C.rx], [' daalein.', C.ink]], X0, 240, 54, u, 63.1);
  riseLine(ctx, [['756 DRAP alerts se foran match.', C.soft]], X0, 302, 40, u, 67.2, { weight: 600, fam: UI });
  const src = [0, 0, 1050, 1180];
  const cw = 860, ch = cw * 1180 / 1050, cx = (W - cw) / 2, cy = 350;
  const hit = u >= 66.5;
  const pk = hit ? 1 + 0.07 * wobble(u - 66.5, 2.6, 6) : 1;
  ctx.save(); ctx.translate(W / 2, cy + ch / 2); ctx.scale(pk, pk); ctx.translate(-W / 2, -(cy + ch / 2));
  if (hit && u < 67.3) M.shake(ctx, u, 66.5, 12);
  ctx.save(); rrect(ctx, cx, cy, cw, ch, 30); ctx.clip();
  if (hit) crop(ctx, IMG.batchAlert, src, cx, cy, cw, ch);
  else {
    crop(ctx, IMG.batchEmpty, src, cx, cy, cw, ch);
    const tp = prog(u, 64, 65.2);
    if (tp > 0) {
      const k = cw / 1050;
      ctx.save(); ctx.beginPath(); ctx.rect(cx, cy, (tp < 1 ? (360 + 260 * tp) : 1050) * k, ch); ctx.clip();
      crop(ctx, IMG.batchTyped, src, cx, cy, cw, ch);
      ctx.restore();
    }
  }
  ctx.restore(); ctx.restore(); ctx.restore();
}
function sShelf(ctx, u, IMG) {
  const enter = 1 - E.inOutCubic(prog(u, 70.4, 71));
  ctx.save(); ctx.translate(enter * W, 0);
  fill(ctx, C.paper);
  riseLine(ctx, [['Haal hi mein pakri gayi', C.ink]], X0, 300, 72, u, 70.9);
  riseLine(ctx, [['naqli dawaein', C.red], [' bhi site par.', C.ink]], X0, 388, 72, u, 71.3);
  // the site's own shelf of recent DRAP alerts (product names blurred: the alerts are about batches)
  const sh = 600, s = sh / 498, sw = 5348 * s;
  const pan = E.inOutSine(prog(u, 71.5, 76.6));
  const x = 40 - pan * (sw - W + 80);
  const k = springU(u, 71.2, SPRING.gentle);
  ctx.save(); ctx.translate(0, (1 - Math.min(k, 1)) * 200);
  ctx.drawImage(IMG.shelf, x, 470, sw, sh);
  ctx.restore();
  riseLine(ctx, [['Tap karein, batch check ho jayega.', C.soft]], X0, 1150, 44, u, 72.6, { weight: 600, fam: UI });
  ctx.restore();
}

// ---------------------------------------------------------------- 10 end card   (u 76.6..84)
function sEnd(ctx, u) {
  const bg = E.inOutCubic(prog(u, 76.6, 77.2));
  ctx.save(); ctx.beginPath(); ctx.arc(W / 2, 600, lerp(0, 1500, bg), 0, Math.PI * 2); ctx.fillStyle = C.rx; ctx.fill(); ctx.restore();
  if (bg < 0.4) return;
  const k = springU(u, 76.8, SPRING.bouncy);
  const q = 0.08 * wobble(u - 76.8, 2.2, 5);
  if (k > 0) {
    const s = Math.min(k, 1.1);
    ctx.save(); ctx.translate(540, 400); ctx.scale(1 + q, 1 - q); ctx.translate(-540, -400);
    ctx.beginPath(); ctx.arc(540, 400, 150 * s, 0, Math.PI * 2); ctx.fillStyle = C.paper; ctx.fill();
    logo(ctx, 540, 400, 230 * s, prog(u, 77.3, 77.8));
    ctx.restore();
  }
  const wk = springU(u, 77, SPRING.snappy);
  if (wk > 0) {
    ctx.save(); ctx.beginPath(); ctx.rect(0, 600, W, 220); ctx.clip(); ctx.translate(0, (1 - wk) * 200);
    wordmark(ctx, 540, 760, 150, { align: 'center', dawa: C.white, check: C.or, hl: false, pk: C.lilac, pkP: E.outCubic(prog(u, 77.6, 78.2)) });
    ctx.restore();
  }
  riseLine(ctx, [['Free. Na login, na sign-up.', C.white]], 540, 920, 54, u, 78.2, { weight: 700, fam: UI, align: 'center' });
  riseLine(ctx, [['Pakistan ke liye bana.', C.or]], 540, 1000, 54, u, 79, { weight: 700, fam: UI, align: 'center' });
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
    shelf: 'assets/shots/v_shelf_blur.png',
  },
  hits: HITS,
  draw(ctx, u, t, IMG) {
    if (u < 14.1) sHook(ctx, u, IMG);
    if (u >= 13.4 && u < 24.1) sPriceStat(ctx, u);
    if (u >= 23.3 && u < 28.9) sBuilt(ctx, u);
    if (u >= 28.9 && u < 36) sPrice(ctx, u, IMG);
    if (u >= 36 && u < 42) sVerdict(ctx, u, IMG);
    if (u >= 41.4 && u < 47) sRefund(ctx, u, IMG);
    if (u >= 46.4 && u < 55.1) sHook2(ctx, u);
    if (u >= 54.4 && u < 63) sFakeStat(ctx, u);
    if (u >= 62.4 && u < 71) sBatch(ctx, u, IMG);
    if (u >= 70.4 && u < 77.3) sShelf(ctx, u, IMG);
    if (u >= 76.6) sEnd(ctx, u);
    if (u >= 28.6 && u < 76.9 && !(u >= 54.6 && u < 62.8)) bug(ctx, u);
  },
});
