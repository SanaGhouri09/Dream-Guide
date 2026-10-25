// DawaCheck explainer (LinkedIn, 4:5, 45 s). Pure function of time: window.seek(t) paints frame t.
// Timing is in beats (u) on the measured grid (100 bpm, 1 beat = 0.6 s); docs/shotlist.md is the plan.
// English by default; dawa-explainer-ru/ loads this same file and gets the Roman Urdu copy and captures.
// Reading rule: every line holds at least (words / 3 + 1) seconds.
import * as M from './lib/motion.js';

const { W, H, E, prog, lerp, springU, springKeys, SPRING, wobble, font, fill, rrect, crop } = M;

const RU = location.pathname.includes('dawa-explainer-ru');
const tr = (en, ru) => (RU ? ru : en);
const C = {
  paper: '#F6F4FC', ink: '#21134F', rx: '#4B2BB8', or: '#FFD23F', red: '#C42B1C', soft: '#5E5880',
  line: '#E0DCF0', rxbg: '#EEEAFE', band: '#2A1670', bandSoft: '#BDB3EE', lilac: '#BCAEFF', white: '#FFFFFF',
};
const D = 'Display', UI = 'UI', MARK = 'Mark';
const X0 = 80;

// Quiet accents only: ticks, clicks, one chime. No whooshes, impacts or risers.
const HITS = [
  [1.2, 'tag Rs 250', 'tick'], [1.8, 'tag Rs 160.57', 'tick'],
  [9, 'ring on the legal price', 'blip', { pitch: 'A5', gain: 0.12 }],
  [15.4, 'Rs 3,500', 'tick'], [23, '248', 'tick'], [25.4, '+417', 'tick'],
  [34.4, 'logo', 'bell', { pitch: 'D6', gain: 0.16 }],
  [41, 'typing', 'type', { len: 0.9, n: 9, gain: 0.1 }], [42.4, 'pack', 'click', { gain: 0.12 }],
  [49, 'verdict', 'blip', { pitch: 'F#5', gain: 0.12 }],
  [57.6, 'typing batch', 'type', { len: 1.1, n: 6, gain: 0.1 }], [60, 'DRAP alert', 'blip', { pitch: 'D6', gain: 0.12 }],
  [70.8, 'end logo', 'bell', { pitch: 'D6', gain: 0.14 }],
];

// ---------------------------------------------------------------- type helpers
const f = (size, weight = 800, fam = D) => font(size, weight, fam);
function widthOf(ctx, str, ft) { ctx.font = ft; return ctx.measureText(str).width; }
// A line of coloured segments rising out of a mask on its baseline. exitU: the line drops back under it.
function line(ctx, segs, x, y, size, u, u0, { weight = 800, fam = D, align = 'left', cfg = SPRING.snappy, exitU = null } = {}) {
  const k = springU(u, u0, cfg);
  if (k <= 0) return 0;
  const out = exitU == null ? 0 : E.inCubic(prog(u, exitU, exitU + 0.5));
  if (out >= 1) return 0;
  const ft = f(size, weight, fam);
  const total = segs.reduce((a, s) => a + widthOf(ctx, s[0], ft), 0);
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  ctx.save();
  ctx.beginPath(); ctx.rect(0, y - size * 1.15, W, size * 1.45); ctx.clip();
  const dy = (1 - k) * size * 1.2 - out * size * 1.3;
  for (const [str, color] of segs) {
    ctx.font = ft; ctx.fillStyle = color; ctx.textAlign = 'left';
    ctx.fillText(str, cx, y + dy);
    cx += widthOf(ctx, str, ft);
  }
  ctx.restore();
  return total;
}
function txt(ctx, str, x, y, ft, color, align = 'left') { ctx.font = ft; ctx.fillStyle = color; ctx.textAlign = align; ctx.fillText(str, x, y); }
const card = (ctx, x, y, w, h, r, color = C.white) => {
  ctx.save(); ctx.shadowColor = 'rgba(33,19,79,.16)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 14;
  rrect(ctx, x, y, w, h, r); ctx.fillStyle = color; ctx.fill(); ctx.restore();
};

// ---------------------------------------------------------------- copy
const T = {
  hook1: tr('Same medicine.', 'Ek hi dawa.'), hook2: tr('Two prices.', 'Do qeematein.'),
  hookQ: tr('Which one is legal?', 'Sahi kaunsi hai?'),
  ans1: tr('Rs 160.57.', 'Rs 160.57.'), ans2: tr('The legal price.', 'Yahi legal qeemat hai.'),
  drap: tr('Set by DRAP', 'DRAP ne tay ki'),
  told: tr('Most of us pay what we\'re told.', 'Hum aksar jo bola jaye, de dete hain.'),
  eyebrow1: tr('IT\'S NOT JUST ONE PHARMACY', 'YEH SIRF EK PHARMACY KA MASLA NAHI'),
  hep1: tr('In Karachi, an Rs 800 heparin', 'Karachi mein Rs 800 ka heparin'),
  hep2: tr('injection was selling for Rs 3,500.', 'injection Rs 3,500 mein bik raha tha.'),
  src1: tr('Source: Dawn, Nov 2023', 'Source: Dawn, Nov 2023'),
  eyebrow2: tr('DRAP\'S OWN ALERTS', 'DRAP KE APNE ALERTS'),
  fake1: tr('batches declared fake', 'batches naqli declare hue'), fake2: tr('since July 2021.', 'July 2021 se.'),
  failed: tr('more failed lab tests.', 'aur lab test mein fail.'),
  src2: tr('Source: DRAP recall and rapid alerts', 'Source: DRAP recall aur rapid alerts'),
  pub1: tr('All of it is public.', 'Yeh sab public hai.'), pub2: tr('Just hard to find.', 'Bas dhoondna mushkil hai.'),
  tag: tr('Official prices. Fake-batch alerts.', 'Asli qeemat. Naqli batch alerts.'),
  s1: tr('Type the medicine.', 'Dawa ka naam likhein.'), s2a: tr('Enter what you ', 'Jitne diye, '), s2b: tr('paid.', 'likhein.'),
  show1: tr('Show the pharmacist', 'Pharmacist ko yeh'), show2: tr('this screen.', 'screen dikhayein.'),
  cmp1: tr('Still overcharged? Call DRAP,', 'Phir bhi zyada? DRAP ko call karein,'),
  cmp2: tr('or send the ready complaint.', 'ya tayyar complaint bhejein.'),
  b1: tr('Check the batch too.', 'Batch bhi check karein.'),
  b2: tr('Type the batch number from the box.', 'Dibbe par likha batch number daalein.'),
  b3: tr('Matched against 756 DRAP alerts.', '756 DRAP alerts se foran match.'),
  chipsEy: tr('DAWACHECK.PK IS', 'DAWACHECK.PK'),
  chips: tr(['Free', 'No login, no sign-up', 'English + Roman Urdu', '21,551 official prices'],
    ['Free', 'Na login, na sign-up', 'Roman Urdu + English', '21,551 official qeematein']),
  end1: tr('Check before you pay.', 'Paise dene se pehle check karein.'), end2: tr('Made for Pakistan.', 'Pakistan ke liye bana.'),
  box1: 'Panadol Extend', box2: tr('665mg · 20 tablets', '665mg · 20 goliyan'),
};
const P = RU ? 'r_' : 'x_';

// ---------------------------------------------------------------- brand art
// Capsule logo: tilted capsule, the seam between the halves is an upright tick cut out of it. check: 0..1 draws it.
const CAP = new Path2D('M28 30H72A20 20 0 0 1 72 70H28A20 20 0 0 1 28 30Z');
let logoBuf = null;
function logo(ctx, cx, cy, size, check = 1) {
  const R = 400;
  if (!logoBuf) logoBuf = document.createElement('canvas'), logoBuf.width = logoBuf.height = R;
  const g = logoBuf.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, R, R); g.scale(R / 100, R / 100);
  const capsule = (c) => { g.save(); g.translate(50, 50); g.rotate((-30 * Math.PI) / 180); g.translate(-50, -50); g.fillStyle = c; g.fill(CAP); g.restore(); };
  capsule(C.or);
  g.save(); g.clip(new Path2D('M0 0H75L50 64L37 51V100H0Z')); capsule(C.rx); g.restore();
  if (check > 0) {
    g.globalCompositeOperation = 'destination-out'; g.lineWidth = 6; g.lineCap = 'round'; g.lineJoin = 'round';
    g.setLineDash([88 * check, 200]); g.stroke(new Path2D('M37 51 L50 64 L75 0'));
    g.setLineDash([]); g.globalCompositeOperation = 'source-over';
  }
  ctx.drawImage(logoBuf, cx - size / 2, cy - size / 2, size, size);
}
function wordmark(ctx, x, y, size, { dawa = C.rx, check = C.band, pk = null, hl = true, align = 'left', pkP = 1 } = {}) {
  const ft = f(size, 800, MARK);
  ctx.font = ft; ctx.letterSpacing = `${-0.045 * size}px`;
  const wd = ctx.measureText('dawa').width, wc = ctx.measureText('check').width;
  const pkFt = f(size * 0.62, 800, MARK);
  let wp = 0;
  if (pk) { ctx.font = pkFt; wp = ctx.measureText('.pk').width; ctx.font = ft; }
  const x0 = align === 'center' ? x - (wd + wc + wp) / 2 : x;
  if (hl) { ctx.fillStyle = C.or; ctx.fillRect(x0 + wd - 2, y - size * 0.42, wc + 4, size * 0.34); }
  ctx.fillStyle = dawa; ctx.textAlign = 'left'; ctx.fillText('dawa', x0, y);
  ctx.fillStyle = check; ctx.fillText('check', x0 + wd, y);
  if (pk && pkP > 0) {
    ctx.save(); ctx.beginPath(); ctx.rect(x0 + wd + wc - 4, y - size, wp + 40, size * 1.3); ctx.clip();
    ctx.font = pkFt; ctx.fillStyle = pk; ctx.fillText('.pk', x0 + wd + wc + 4, y + (1 - pkP) * size); ctx.restore();
  }
  ctx.letterSpacing = '0px';
}
function bug(ctx, u) { // small brand mark top-left during the product section
  const k = springU(u, 39.6, SPRING.snappy), out = E.inCubic(prog(u, 69.6, 70.1));
  if (k <= 0 || out >= 1) return;
  ctx.save(); ctx.translate(0, -(1 - k) * 80 - out * 120);
  logo(ctx, X0 + 24, 92, 54); wordmark(ctx, X0 + 58, 106, 38);
  ctx.restore();
}

// ---------------------------------------------------------------- 1 hook: one box, two prices   (u 0..14)
// A plain carton in the site's style (not the maker's packaging).
function box(ctx, cx, cy, s) {
  const w = 520 * s, h = 300 * s, x = cx - w / 2, y = cy - h / 2;
  card(ctx, x, y, w, h, 18 * s);
  ctx.save(); rrect(ctx, x, y, w, h, 18 * s); ctx.clip();
  ctx.fillStyle = C.rx; ctx.fillRect(x, y, w, 64 * s); ctx.fillStyle = C.or; ctx.fillRect(x + w * 0.66, y, w * 0.34, 64 * s);
  ctx.restore();
  txt(ctx, T.box1, x + 40 * s, y + 150 * s, f(50 * s, 700, UI), C.ink);
  txt(ctx, T.box2, x + 40 * s, y + 205 * s, f(32 * s, 500, UI), C.soft);
  ctx.fillStyle = C.line; rrect(ctx, x + 40 * s, y + 238 * s, 180 * s, 12 * s, 6 * s); ctx.fill();
}
function tag(ctx, x, y, label, rot, { color = C.ink, bg = C.white, scale = 1 } = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(scale, scale);
  ctx.font = f(64, 800); const tw = ctx.measureText(label).width;
  const w = tw + 120, h = 108;
  ctx.save(); ctx.shadowColor = 'rgba(33,19,79,.18)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10;
  ctx.beginPath(); ctx.moveTo(-w / 2 + 34, -h / 2); ctx.lineTo(w / 2 - 14, -h / 2); ctx.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + 14);
  ctx.lineTo(w / 2, h / 2 - 14); ctx.quadraticCurveTo(w / 2, h / 2, w / 2 - 14, h / 2); ctx.lineTo(-w / 2 + 34, h / 2); ctx.lineTo(-w / 2, 0); ctx.closePath();
  ctx.fillStyle = bg; ctx.fill(); ctx.restore();
  ctx.beginPath(); ctx.arc(-w / 2 + 34, 0, 10, 0, Math.PI * 2); ctx.fillStyle = C.paper; ctx.fill();
  txt(ctx, label, 26, 24, f(64, 800), color, 'center');
  ctx.restore();
  return w;
}
function sHook(ctx, u) {
  fill(ctx, C.paper);
  const leave = E.inOutCubic(prog(u, 14, 14.6)); // the band covers it; nothing moves out
  // headline: question, then the answer replaces it
  line(ctx, [[T.hook1, C.ink]], X0, 210, 86, u, -0.5, { exitU: 8 });
  line(ctx, [[T.hook2, C.rx]], X0, 310, 86, u, 0.2, { exitU: 8.05 });
  line(ctx, [[T.ans1, C.rx]], X0, 210, 86, u, 8.5);
  line(ctx, [[T.ans2, C.ink]], X0, 310, 86, u, 8.8);
  // the box
  const kb = springU(u, -0.6, SPRING.gentle);
  box(ctx, W / 2, lerp(H + 200, 610, Math.min(kb, 1.04)), 1.45);
  // tags: Rs 250 from the left, Rs 160.57 from the right
  const k1 = springU(u, 1.0, SPRING.snappy), k2 = springU(u, 1.6, SPRING.snappy);
  const drop = E.inBack(prog(u, 8, 8.9), 1.3);
  if (drop < 1) tag(ctx, lerp(-400, 290, Math.min(k1, 1.05)), 960 + drop * 700, 'Rs 250', -0.08 - drop * 0.5, { scale: 1.15 });
  const toC = E.inOutCubic(prog(u, 8.3, 9.1));
  const tx = lerp(lerp(W + 400, 770, Math.min(k2, 1.05)), W / 2, toC), ty = lerp(1000, 975, toC);
  const tw = tag(ctx, tx, ty, 'Rs 160.57', lerp(0.06, 0, toC), { scale: lerp(1.15, 1.3, toC) }) * lerp(1.15, 1.3, toC);
  // the ring and the DRAP label on the legal price
  const ring = E.outCubic(prog(u, 8.9, 9.7));
  if (ring > 0) {
    ctx.save(); ctx.lineWidth = 8; ctx.strokeStyle = C.rx; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.ellipse(tx, ty, tw * 0.6, 112, -0.05, -Math.PI / 2, -Math.PI / 2 + ring * Math.PI * 2); ctx.stroke(); ctx.restore();
    const kp = springU(u, 9.6, SPRING.bouncy);
    if (kp > 0) {
      ctx.save(); ctx.translate(tx, ty - 145); ctx.scale(Math.min(kp, 1.1), Math.min(kp, 1.1));
      ctx.font = f(34, 700, UI); const pw = ctx.measureText(T.drap).width + 40;
      rrect(ctx, -pw / 2, -30, pw, 56, 28); ctx.fillStyle = C.rx; ctx.fill();
      txt(ctx, T.drap, 0, 10, f(34, 700, UI), C.white, 'center'); ctx.restore();
    }
  }
  // bottom line: the question, then the habit
  line(ctx, [[T.hookQ, C.ink]], X0, 1225, 74, u, 3.2, { exitU: 8 });
  line(ctx, [[T.told, C.ink]], X0, 1225, 56, u, 10.2, { weight: 700, fam: UI });
  void leave;
}

// ---------------------------------------------------------------- 2 the problem   (u 14..29)
function sProblem(ctx, u) {
  const top = lerp(H + 20, 0, E.inOutCubic(prog(u, 13.8, 14.5)));
  const gone = E.inOutCubic(prog(u, 29, 29.6)); // slides down, the paper is under it
  ctx.save(); ctx.translate(0, gone * H);
  ctx.fillStyle = C.band; ctx.fillRect(0, top, W, H - top + 2);
  if (top > 0.5) { ctx.restore(); return; }
  // heparin: u 14.6..22
  const outC = E.inBack(prog(u, 21.6, 22.2), 1.1);
  if (outC < 1) {
    ctx.save(); ctx.translate(-outC * 1200, 0);
    line(ctx, [[T.eyebrow1, C.bandSoft]], X0, 220, 32, u, 14.6, { weight: 700, fam: UI });
    line(ctx, [['Rs 800', C.bandSoft]], X0, 430, 110, u, 15);
    const st = E.outCubic(prog(u, 15.3, 15.8));
    if (st > 0) { ctx.fillStyle = C.red; ctx.fillRect(X0 - 6, 392, (widthOf(ctx, 'Rs 800', f(110)) + 12) * st, 12); }
    const k2 = springU(u, 15.4, SPRING.bouncy);
    if (k2 > 0) { const sc = lerp(1.25, 1, Math.min(k2, 1)); ctx.save(); ctx.translate(X0, 610); ctx.scale(sc, sc); txt(ctx, 'Rs 3,500', 0, 0, f(170), C.or); ctx.restore(); }
    line(ctx, [[T.hep1, C.white]], X0, 730, 50, u, 16.4, { weight: 600, fam: UI });
    line(ctx, [[T.hep2, C.white]], X0, 794, 50, u, 16.6, { weight: 600, fam: UI });
    line(ctx, [[T.src1, C.bandSoft]], X0, 900, 30, u, 17.8, { weight: 700, fam: UI });
    ctx.restore();
  }
  // fake batches: u 22..29
  const inD = 1 - E.outCubic(prog(u, 21.8, 22.5));
  if (u > 21.8) {
    ctx.save(); ctx.translate(inD * 1200, 0);
    txt(ctx, T.eyebrow2, X0, 220, f(32, 700, UI), C.bandSoft);
    const n = Math.round(lerp(120, 248, E.outCubic(prog(u, 22.4, 23.6))));
    txt(ctx, String(n), X0, 450, f(200), C.or);
    line(ctx, [[T.fake1, C.white]], X0, 540, 54, u, 23, { weight: 700, fam: UI });
    line(ctx, [[T.fake2, C.white]], X0, 606, 54, u, 23.2, { weight: 700, fam: UI });
    const k = springU(u, 25.4, SPRING.bouncy);
    if (k > 0) { const sc = lerp(1.25, 1, Math.min(k, 1)); ctx.save(); ctx.translate(X0, 800); ctx.scale(sc, sc); txt(ctx, '+ 417', 0, 0, f(140), C.or); ctx.restore(); }
    line(ctx, [[T.failed, C.white]], X0, 880, 54, u, 25.8, { weight: 700, fam: UI });
    line(ctx, [[T.src2, C.bandSoft]], X0, 990, 30, u, 26.6, { weight: 700, fam: UI });
    ctx.restore();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- 3 public, but buried   (u 29..34)
function sBuried(ctx, u) {
  fill(ctx, C.paper);
  // rows of grey bars: the shape of a dense government table (abstract, not a screen), blurring as it scrolls
  const scroll = (u - 29) * 46;
  ctx.save(); ctx.filter = `blur(${lerp(0, 5, prog(u, 30.6, 32))}px)`; ctx.globalAlpha = 0.55;
  for (let i = 0; i < 30; i++) {
    const y = 470 + i * 46 - scroll;
    if (y < 420 || y > H) continue;
    ctx.fillStyle = i % 2 ? '#E7E3F3' : '#DCD7EC'; ctx.fillRect(X0, y, W - 2 * X0, 40);
    for (let c = 0; c < 4; c++) { ctx.fillStyle = '#C3BCDB'; ctx.fillRect(X0 + 20 + c * 230, y + 15, 60 + M.hash01(i * 7 + c) * 120, 10); }
  }
  ctx.restore();
  line(ctx, [[T.pub1, C.ink]], X0, 250, 80, u, 29.6);
  line(ctx, [[T.pub2, C.rx]], X0, 350, 80, u, 30.2);
}

// ---------------------------------------------------------------- 4 reveal   (u 34..40)
function sReveal(ctx, u) {
  fill(ctx, C.paper);
  const k = springU(u, 33.8, SPRING.bouncy);
  const leave = E.inOutCubic(prog(u, 38.9, 39.4));
  ctx.save(); ctx.translate(0, -leave * 200); ctx.globalAlpha = 1 - leave;
  if (k > 0) {
    const q = 0.08 * wobble(u - 33.8, 2.2, 5), s = Math.min(k, 1.1);
    ctx.save(); ctx.translate(540, 430); ctx.scale(s * (1 + q), s * (1 - q)); ctx.translate(-540, -430);
    logo(ctx, 540, 430, 300, prog(u, 34.3, 34.9)); ctx.restore();
  }
  const wk = springU(u, 34.5, SPRING.snappy);
  if (wk > 0) {
    ctx.save(); ctx.beginPath(); ctx.rect(0, 610, W, 220); ctx.clip(); ctx.translate(0, (1 - wk) * 200);
    wordmark(ctx, 540, 760, 150, { align: 'center', pk: C.rx, pkP: E.outCubic(prog(u, 35, 35.6)) });
    ctx.restore();
  }
  line(ctx, [[T.tag, C.ink]], 540, 930, 52, u, 35.6, { weight: 700, fam: UI, align: 'center' });
  ctx.restore();
}

// ---------------------------------------------------------------- 5 price check on the phone   (u 40..49)
const PH = RU ? 1203 : 1125; // the Roman price box is a little taller
function sPrice(ctx, u, IMG) {
  fill(ctx, C.paper);
  const cap1 = 1 - E.inCubic(prog(u, 43.8, 44.2));
  if (cap1 > 0) { ctx.save(); ctx.translate(0, -(1 - cap1) * 60); line(ctx, [['1  ', C.lilac], [T.s1, C.ink]], X0, 250, 66, u, 39.6); ctx.restore(); }
  if (u > 43.9) line(ctx, [['2  ', C.lilac], [T.s2a, C.ink], [T.s2b, C.rx]], X0, 250, 66, u, 44.1);
  const rise = springU(u, 39.3, SPRING.gentle);
  const zoom = E.inExpo(prog(u, 48.3, 49));
  const pw = 640, px = (W - pw) / 2, py = lerp(H + 40, 320, Math.min(rise, 1.05));
  ctx.save();
  const z = Math.exp(Math.log(5) * zoom), fx = 660, fy = 1000;
  ctx.translate(fx, fy); ctx.scale(z, z); ctx.translate(-fx, -fy);
  rrect(ctx, px, py, pw, 1300, 78); ctx.fillStyle = C.ink; ctx.fill();
  const sx = px + 18, sy = py + 18, sw = pw - 36;
  ctx.save(); rrect(ctx, sx, sy, sw, 1300, 62); ctx.clip();
  ctx.fillStyle = C.paper; ctx.fillRect(sx, sy, sw, 1300);
  const k = sw / 1050;
  const scroll = springKeys(u, [[40, 0], [42.6, 300 + (PH - 1125) * k], [44.2, 620 + (PH - 1125) * k]], SPRING.gentle);
  const top = sy + 30 - scroll;
  ctx.drawImage(IMG.priceEmpty, sx, top, sw, PH * k);
  const tp = prog(u, 41, 41.9);
  if (tp > 0) { ctx.save(); ctx.beginPath(); ctx.rect(sx, top, sw * (tp < 1 ? 0.25 + 0.6 * tp : 1), PH * k); ctx.clip(); ctx.drawImage(IMG.priceTyped, sx, top, sw, PH * k); ctx.restore(); }
  const rk = springU(u, 42.2, SPRING.snappy);
  if (rk > 0) { ctx.save(); ctx.translate(0, (1 - rk) * 60); ctx.drawImage(IMG.pack, sx, top + PH * k + 20, sw, 801 * k); ctx.restore(); }
  const pk = springU(u, 44.2, SPRING.snappy);
  if (pk > 0) {
    const im = u < 46 ? IMG.pay120 : u < 47 ? IMG.pay160 : IMG.pay250, pw2 = 960 * k;
    ctx.save(); ctx.translate(0, (1 - pk) * 50); ctx.drawImage(im, sx + (sw - pw2) / 2, top + PH * k + 20 + 801 * k - 6, pw2, 558 * k); ctx.restore();
  }
  ctx.restore();
  rrect(ctx, px + pw / 2 - 70, py + 30, 140, 30, 15); ctx.fillStyle = C.ink; ctx.fill();
  ctx.restore();
  if (zoom > 0.6) { ctx.fillStyle = C.paper; ctx.globalAlpha = E.inCubic(prog(zoom, 0.6, 1)); ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
}

// ---------------------------------------------------------------- 6 the verdict, then where to complain   (u 49..56)
function sVerdict(ctx, u, IMG) {
  fill(ctx, C.paper);
  const leave = E.inOutCubic(prog(u, 55.6, 56.2));
  ctx.save(); ctx.translate(-leave * W, 0);
  const k = springU(u, 49, SPRING.bouncy), q = 0.05 * wobble(u - 49, 2.4, 6);
  const cw = 880, s = cw / 858, wh = 740, cx = (W - cw) / 2, cy = 190;
  const sc = lerp(1.1, 1, Math.min(k, 1.1));
  // the card scrolls from the verdict down to the complaint options
  const scr = springKeys(u, [[49, 0], [52.4, 560]], SPRING.gentle);
  ctx.save(); ctx.translate(W / 2, cy + wh / 2); ctx.scale(sc * (1 + q), sc * (1 - q)); ctx.translate(-W / 2, -(cy + wh / 2));
  card(ctx, cx, cy, cw, wh, 34, '#FCE9E7');
  ctx.save(); rrect(ctx, cx, cy, cw, wh, 34); ctx.clip();
  crop(ctx, IMG.verdict, [0, scr, 858, wh / s], cx, cy, cw, wh);
  ctx.restore(); ctx.restore();
  const y = cy + wh + 120;
  line(ctx, [[T.show1, C.ink]], X0, y, 66, u, 49.8, { exitU: 52.2 });
  line(ctx, [[T.show2, C.rx]], X0, y + 80, 66, u, 50.1, { exitU: 52.25 });
  line(ctx, [[T.cmp1, C.ink]], X0, y, 50, u, 52.6, { weight: 700, fam: UI });
  line(ctx, [[T.cmp2, C.rx]], X0, y + 66, 50, u, 52.9, { weight: 700, fam: UI });
  ctx.restore();
}

// ---------------------------------------------------------------- 7 batch check   (u 56..66)
function sBatch(ctx, u, IMG) {
  const enter = 1 - E.inOutCubic(prog(u, 55.6, 56.2));
  const leave = E.inOutCubic(prog(u, 65.6, 66.2));
  ctx.save(); ctx.translate((enter - leave) * W, 0);
  fill(ctx, C.paper);
  line(ctx, [[T.b1, C.ink]], X0, 230, 62, u, 56.3, { exitU: 60.1 });
  line(ctx, [[T.b2, C.rx]], X0, 306, 50, u, 56.8, { weight: 700, fam: UI, exitU: 60.15 });
  line(ctx, [[T.b3, C.ink]], X0, 270, 52, u, 60.6, { weight: 700, fam: UI });
  const cw = 840, k = cw / 1050, src = [0, 0, 1050, 1180], ch = 1180 * k, cx = (W - cw) / 2, cy = 380;
  const hit = u >= 60;
  const pk = hit ? 1 + 0.05 * wobble(u - 60, 2.6, 6) : 1;
  ctx.save(); ctx.translate(W / 2, cy + ch / 2); ctx.scale(pk, pk); ctx.translate(-W / 2, -(cy + ch / 2));
  card(ctx, cx, cy, cw, ch, 30);
  ctx.save(); rrect(ctx, cx, cy, cw, ch, 30); ctx.clip();
  if (hit) crop(ctx, IMG.batchAlert, src, cx, cy, cw, ch);
  else {
    crop(ctx, IMG.batchEmpty, src, cx, cy, cw, ch);
    const tp = prog(u, 57.6, 58.8); // the batch number types in, left to right
    if (tp > 0) { ctx.save(); ctx.beginPath(); ctx.rect(cx, cy, (tp < 1 ? 360 + 260 * tp : 1050) * k, ch); ctx.clip(); crop(ctx, IMG.batchTyped, src, cx, cy, cw, ch); ctx.restore(); }
  }
  ctx.restore(); ctx.restore(); ctx.restore();
}

// ---------------------------------------------------------------- 8 what it is   (u 66..70)
function sValues(ctx, u) {
  const enter = 1 - E.inOutCubic(prog(u, 65.6, 66.2));
  ctx.save(); ctx.translate(enter * W, 0);
  fill(ctx, C.paper);
  txt(ctx, T.chipsEy, X0, 330, f(32, 700, UI), C.rx);
  T.chips.forEach((c, i) => {
    const k = springU(u, 65.7 + i * 0.35, SPRING.bouncy);
    if (k <= 0) return;
    const y = 420 + i * 150, ft = f(56, 700, UI), w = widthOf(ctx, c, ft) + 88;
    ctx.save(); ctx.translate(X0, y + 50); ctx.scale(Math.min(k, 1.06), Math.min(k, 1.06));
    rrect(ctx, 0, -50, w, 104, 52); ctx.fillStyle = i === 0 ? C.rx : C.rxbg; ctx.fill();
    txt(ctx, c, 44, 20, ft, i === 0 ? C.white : C.ink); ctx.restore();
  });
  ctx.restore();
}

// ---------------------------------------------------------------- 9 end card   (u 70..75)
function sEnd(ctx, u) {
  const bg = E.inOutCubic(prog(u, 69.9, 70.6));
  ctx.save(); ctx.beginPath(); ctx.arc(W / 2, 560, lerp(0, 1500, bg), 0, Math.PI * 2); ctx.fillStyle = C.rx; ctx.fill(); ctx.restore();
  if (bg < 0.4) return;
  const k = springU(u, 70.3, SPRING.bouncy), q = 0.06 * wobble(u - 70.3, 2.2, 5);
  if (k > 0) {
    const s = Math.min(k, 1.1);
    ctx.save(); ctx.translate(540, 400); ctx.scale(1 + q, 1 - q); ctx.translate(-540, -400);
    ctx.beginPath(); ctx.arc(540, 400, 150 * s, 0, Math.PI * 2); ctx.fillStyle = C.paper; ctx.fill();
    logo(ctx, 540, 400, 230 * s, prog(u, 70.8, 71.3)); ctx.restore();
  }
  const wk = springU(u, 70.5, SPRING.snappy);
  if (wk > 0) {
    ctx.save(); ctx.beginPath(); ctx.rect(0, 600, W, 220); ctx.clip(); ctx.translate(0, (1 - wk) * 200);
    wordmark(ctx, 540, 760, 150, { align: 'center', dawa: C.white, check: C.or, hl: false, pk: C.lilac, pkP: E.outCubic(prog(u, 71, 71.6)) });
    ctx.restore();
  }
  line(ctx, [[T.end1, C.white]], 540, 930, 58, u, 71.4, { weight: 700, fam: UI, align: 'center' });
  line(ctx, [[T.end2, C.or]], 540, 1010, 50, u, 72, { weight: 700, fam: UI, align: 'center' });
}

// ---------------------------------------------------------------- film
M.film({
  fonts: [f(100), f(40, 500, UI), f(40, 600, UI), f(40, 700, UI), f(100, 800, MARK)],
  samples: 10,
  images: {
    priceEmpty: `assets/shots/${P}price_empty.png`, priceTyped: `assets/shots/${P}price_typed.png`, pack: `assets/shots/${P}pack.png`,
    pay120: `assets/shots/${P}pay_120.png`, pay160: `assets/shots/${P}pay_160.png`, pay250: `assets/shots/${P}pay_250.png`,
    verdict: `assets/shots/${P}verdict.png`,
    batchEmpty: `assets/shots/${P}batch_empty.png`, batchTyped: `assets/shots/${P}batch_typed.png`, batchAlert: `assets/shots/${P}batch_alert.png`,
  },
  hits: HITS,
  draw(ctx, u, t, IMG) {
    if (u < 14.6) sHook(ctx, u);
    if (u >= 29 && u < 34.4) sBuried(ctx, u);
    if (u >= 13.8 && u < 29.6) sProblem(ctx, u, IMG);
    if (u >= 33.8 && u < 39.4) sReveal(ctx, u);
    if (u >= 39.3 && u < 49) sPrice(ctx, u, IMG);
    if (u >= 49 && u < 56.2) sVerdict(ctx, u, IMG);
    if (u >= 55.6 && u < 66.2) sBatch(ctx, u, IMG);
    if (u >= 65.6 && u < 70.6) sValues(ctx, u);
    if (u >= 69.9) sEnd(ctx, u);
    if (u >= 39.6 && u < 70.1) bug(ctx, u);
  },
});
