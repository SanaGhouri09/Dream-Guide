/* Box scanner, loaded only when someone taps "Scan". Everything runs on the phone; no image leaves it.
   DCScan.open({ mode, text, onResult })
     mode "code":  reads the 2D (GS1 DataMatrix) code DRAP requires on packs -> { batch, expiry, gtin, serial }
                   with a button to fall back to reading the printed batch number -> { batch }
     mode "mrp":   reads the printed MRP / retail price -> { mrp }
   text: the strings for the current language (see T.scan in index.html). */
window.DCScan = (() => {
  const BASE = new URL(".", document.currentScript.src).href; // .../assets/
  let zxing = null, tess = null;

  function loadScript(src) {
    return new Promise((ok, bad) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = bad; document.head.appendChild(s); });
  }
  async function reader() {
    if (!zxing) {
      await loadScript(BASE + "vendor/zxing-reader.js");
      ZXingWASM.prepareZXingModule({ overrides: { locateFile: (p, pre) => (p.endsWith(".wasm") ? BASE + "vendor/" + p : pre + p) }, fireImmediately: true });
      zxing = ZXingWASM;
    }
    return zxing;
  }
  async function ocr() {
    if (!tess) {
      await loadScript(BASE + "vendor/tess/tesseract.min.js");
      tess = await Tesseract.createWorker("eng", 1, {
        workerPath: BASE + "vendor/tess/worker.min.js", corePath: BASE + "vendor/tess/core",
        langPath: BASE + "vendor/tess/lang", workerBlobURL: false, gzip: false,
      });
    }
    return tess;
  }

  /* GS1 element strings, as zxing prints them: (01)08961234567890(17)270331(10)AB1234(21)XYZ */
  function parseGS1(text) {
    const out = {};
    const t = String(text || "").replace(/^\]d2/, "").replace(/<GS>/g, "\x1d");
    const re = /\((\d{2,4})\)([^(]*)/g;
    let m;
    while ((m = re.exec(t))) out[m[1]] = m[2].trim();
    if (!Object.keys(out).length) { // raw form with <GS> separators
      let s = t.replace(/^\x1d/, "");
      const fixed = { "01": 14, "11": 6, "17": 6 };
      while (s.length > 2) {
        const ai = s.slice(0, 2);
        if (fixed[ai]) { out[ai] = s.slice(2, 2 + fixed[ai]); s = s.slice(2 + fixed[ai]); }
        else if (ai === "10" || ai === "21") { const end = s.indexOf("\x1d"); out[ai] = end < 0 ? s.slice(2) : s.slice(2, end); s = end < 0 ? "" : s.slice(end + 1); }
        else break;
      }
    }
    const exp = out["17"] && /^\d{6}$/.test(out["17"]) ? (() => {
      const y = 2000 + +out["17"].slice(0, 2), mo = +out["17"].slice(2, 4), d = +out["17"].slice(4, 6);
      return d ? new Date(Date.UTC(y, mo - 1, d)) : new Date(Date.UTC(y, mo, 0)); // day 00 = end of month
    })() : null;
    return { batch: out["10"] || "", expiry: exp, gtin: out["01"] || "", serial: out["21"] || "" };
  }
  /* printed text -> numbers */
  const num = s => parseFloat(String(s).replace(/,/g, ""));
  function findMrp(text) {
    const t = text.replace(/[|]/g, " ").replace(/\s+/g, " ");
    const pats = [
      /(?:M\.?\s?R\.?\s?P|retail\s*price|max(?:imum)?\.?\s*retail|price)[^0-9]{0,20}?(?:rs\.?|pkr)?\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i,
      /(?:rs\.?|pkr)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i,
    ];
    for (const p of pats) { const m = t.match(p); if (m && num(m[1]) > 0 && num(m[1]) < 5000000) return num(m[1]); }
    return null;
  }
  function findBatch(text) {
    const t = text.replace(/\s+/g, " ");
    const m = t.match(/(?:B\.?\s?No|Batch(?:\s*No)?|Lot(?:\s*No)?)\s*[.:#\-]*\s*([A-Z0-9][A-Z0-9\-\/]{2,15})/i);
    return m ? m[1].toUpperCase() : null;
  }

  /* ------------------------------------------------------------ UI */
  function open({ mode = "code", text: S, onResult }) {
    const wrap = document.createElement("div");
    wrap.className = "scanwrap";
    wrap.setAttribute("role", "dialog");
    wrap.setAttribute("aria-modal", "true");
    wrap.innerHTML = `<div class="scanbox">
      <div class="scanhead"><b></b><button type="button" class="scanx" aria-label="${S.close}">×</button></div>
      <div class="scanview"><video playsinline muted></video><div class="scanframe"></div></div>
      <p class="scanmsg" aria-live="polite"></p>
      <div class="scanres hidden"><label></label><input autocomplete="off" spellcheck="false"><div class="scanbtns"><button type="button" class="sbtn primary" data-use>${S.use}</button><button type="button" class="sbtn" data-retry>${S.retry}</button></div></div>
      <div class="scanbtns" data-main><button type="button" class="sbtn primary hidden" data-shot>${S.capture}</button><button type="button" class="sbtn hidden" data-text>${S.textBtn}</button></div>
      <p class="scanpriv">${S.privacy}</p>
    </div>`;
    document.body.appendChild(wrap);
    const $ = s => wrap.querySelector(s);
    const video = $("video"), msg = $(".scanmsg"), head = $(".scanhead b"), res = $(".scanres"), inp = $(".scanres input");
    const shot = $("[data-shot]"), textBtn = $("[data-text]");
    let stream = null, timer = 0, cur = mode, busy = false, closed = false;
    const canvas = document.createElement("canvas"), ctx = canvas.getContext("2d", { willReadFrequently: true });

    function close() {
      closed = true; clearTimeout(timer);
      if (stream) stream.getTracks().forEach(t => t.stop());
      wrap.remove(); document.removeEventListener("keydown", esc);
    }
    const esc = e => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", esc);
    $(".scanx").onclick = close;
    wrap.addEventListener("click", e => { if (e.target === wrap) close(); });

    function grab(cropToFrame) {
      const vw = video.videoWidth, vh = video.videoHeight;
      if (!vw) return null;
      let sx = 0, sy = 0, sw = vw, sh = vh;
      if (cropToFrame) { // map the yellow frame back to video pixels (the preview is object-fit: cover)
        const vb = video.getBoundingClientRect(), fb = $(".scanframe").getBoundingClientRect();
        const k = Math.max(vb.width / vw, vb.height / vh), ox = (vb.width - vw * k) / 2, oy = (vb.height - vh * k) / 2;
        sx = Math.max(0, (fb.left - vb.left - ox) / k); sy = Math.max(0, (fb.top - vb.top - oy) / k);
        sw = Math.min(vw - sx, fb.width / k); sh = Math.min(vh - sy, fb.height / k);
      }
      const scale = Math.min(1, 1600 / sw);
      canvas.width = Math.round(sw * scale); canvas.height = Math.round(sh * scale);
      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      return ctx.getImageData(0, 0, canvas.width, canvas.height);
    }
    function setMode(m) {
      cur = m; res.classList.add("hidden"); busy = false;
      wrap.dataset.mode = m;
      head.textContent = m === "code" ? S.codeTitle : m === "mrp" ? S.mrpTitle : S.batchTitle;
      msg.textContent = m === "code" ? S.codeHint : m === "mrp" ? S.mrpHint : S.batchHint;
      shot.classList.toggle("hidden", m === "code");
      textBtn.classList.add("hidden");
      clearTimeout(timer);
      if (m === "code") { loopCode(); timer = setTimeout(() => { if (!closed && cur === "code") textBtn.classList.remove("hidden"); }, 6000); }
    }
    async function loopCode() {
      if (closed || cur !== "code") return;
      try {
        const z = await reader();
        const img = grab(false);
        if (img) {
          const hits = await z.readBarcodes(img, { formats: ["DataMatrix", "QRCode"], tryHarder: true, maxNumberOfSymbols: 1 });
          const g = hits.length ? parseGS1(hits[0].text) : null;
          if (g && g.batch) { if (navigator.vibrate) navigator.vibrate(60); close(); onResult({ kind: "code", ...g }); return; }
          if (hits.length) msg.textContent = S.codeNoBatch;
        }
      } catch (e) { msg.textContent = S.failed; }
      if (!closed && cur === "code") setTimeout(loopCode, 220);
    }
    function showResult(label, value) {
      res.classList.remove("hidden");
      res.querySelector("label").textContent = label;
      inp.value = value; inp.inputMode = cur === "mrp" ? "decimal" : "text";
      shot.classList.add("hidden");
    }
    shot.onclick = async () => {
      if (busy) return; busy = true;
      const img = grab(true);
      if (!img) { busy = false; return; }
      msg.textContent = S.reading; shot.disabled = true;
      try {
        const w = await ocr();
        const { data } = await w.recognize(canvas);
        const v = cur === "mrp" ? findMrp(data.text) : findBatch(data.text);
        if (v) { msg.textContent = S.check; showResult(cur === "mrp" ? S.foundMrp : S.foundBatch, String(v)); }
        else msg.textContent = S.none;
      } catch (e) { msg.textContent = S.failed; }
      shot.disabled = false; busy = false;
    };
    textBtn.onclick = () => setMode("batch");
    $("[data-retry]").onclick = () => { res.classList.add("hidden"); setMode(cur); };
    $("[data-use]").onclick = () => {
      const v = inp.value.trim(); if (!v) return;
      close();
      onResult(cur === "mrp" ? { kind: "mrp", mrp: num(v) } : { kind: "text", batch: v.toUpperCase() });
    };

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
        if (closed) { stream.getTracks().forEach(t => t.stop()); return; }
        video.srcObject = stream; await video.play();
        setMode(mode);
        if (mode !== "code") ocr().catch(() => {}); // start downloading the reader while they aim
      } catch (e) { msg.textContent = S.noCam; head.textContent = mode === "mrp" ? S.mrpTitle : S.codeTitle; }
    })();
  }
  return { open, parseGS1, findMrp, findBatch };
})();
