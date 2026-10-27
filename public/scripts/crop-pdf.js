/* ===================== TOOL: Crop PDF ===================== */
function mountCropPdf(root){
  root.innerHTML = `<style>
  .cr-vp{border:1px solid var(--line);border-radius:12px;background:var(--surface2);padding:10px;text-align:center}
  .cr-vp canvas{max-width:100%;height:auto;display:block;margin:0 auto;box-shadow:0 2px 14px rgba(0,0,0,.35);touch-action:none;cursor:crosshair}
  </style>
  <div class="card"><label for="f">1. Choose a PDF</label><input id="f" type="file" accept="application/pdf,.pdf"><p id="info" class="hint">No file chosen.</p></div>
  <div id="ed" hidden>
    <div class="card"><label>2. Drag the box to choose what to keep</label>
      <div class="row" style="align-items:center"><div><button id="pp" class="alt" type="button">← Prev</button></div><div style="text-align:center"><b id="pgl"></b></div><div><button id="pn" class="alt" type="button">Next →</button></div></div>
      <div class="cr-vp" style="margin-top:10px"><canvas id="cv"></canvas></div>
      <p class="hint">Drag the corners and edges, or move the whole box. The darker area will be cut away.</p>
      <div class="row" style="margin-top:6px"><div><label for="mt" style="font-weight:600">Top %</label><input id="mt" type="number" min="0" max="90" step="1"></div><div><label for="mr" style="font-weight:600">Right %</label><input id="mr" type="number" min="0" max="90" step="1"></div><div><label for="mb" style="font-weight:600">Bottom %</label><input id="mb" type="number" min="0" max="90" step="1"></div><div><label for="ml" style="font-weight:600">Left %</label><input id="ml" type="number" min="0" max="90" step="1"></div></div>
      <div class="row" style="margin-top:10px"><div><button id="au" class="alt" type="button">Find the content automatically</button></div><div><button id="rs" class="alt" type="button">Reset</button></div></div></div>
    <div class="card"><label for="ap">3. Apply to</label><select id="ap"><option value="all">All pages</option><option value="this">This page only</option><option value="range">Page range</option></select>
      <input id="rg" type="text" placeholder="e.g. 1-3, 5" style="margin-top:8px" hidden>
      <div class="row" style="margin-top:14px"><div><button id="go">Crop PDF</button></div></div><progress id="bar" hidden></progress><div id="status" aria-live="polite"></div>
      <p class="hint">The margins are cut in the same proportion on every page you choose.</p></div></div>${PL.resultCard}`;
  let bytes = null, pd = null, n = 0, name = "document", cur = 1, base = null, W = 0, H = 0, f = {l:.05, t:.05, r:.05, b:.05}, mode = null, tok = 0;
  const cv = $("cv"), g = cv.getContext("2d"), clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const fail = m => { $("status").className = "err"; $("status").textContent = m; };
  function inputs(){ $("mt").value = Math.round(f.t * 100); $("mr").value = Math.round(f.r * 100); $("mb").value = Math.round(f.b * 100); $("ml").value = Math.round(f.l * 100); }
  function draw(){
    if(!base) return; cv.width = base.width; cv.height = base.height; g.drawImage(base, 0, 0); const w = cv.width, h = cv.height, x0 = f.l * w, x1 = w - f.r * w, y0 = f.t * h, y1 = h - f.b * h;
    g.fillStyle = "rgba(0,0,0,.5)"; g.fillRect(0, 0, w, y0); g.fillRect(0, y1, w, h - y1); g.fillRect(0, y0, x0, y1 - y0); g.fillRect(x1, y0, w - x1, y1 - y0);
    g.strokeStyle = "#ffb020"; g.lineWidth = 2; g.strokeRect(x0, y0, x1 - x0, y1 - y0); g.fillStyle = "#fff"; g.strokeStyle = "#ffb020";
    for(const [x, y] of [[x0,y0],[x1,y0],[x0,y1],[x1,y1],[(x0+x1)/2,y0],[(x0+x1)/2,y1],[x0,(y0+y1)/2],[x1,(y0+y1)/2]]){ g.fillRect(x - 6, y - 6, 12, 12); g.strokeRect(x - 6, y - 6, 12, 12); }
    $("pgl").textContent = "Page " + cur + " of " + n; $("pp").disabled = cur <= 1; $("pn").disabled = cur >= n; inputs();
  }
  async function show(p){ cur = clamp(p, 1, n); const my = ++tok, c = document.createElement("canvas"); await PL.render(pd, cur, c, 900); if(my !== tok) return; base = c; draw(); }
  const pt = e => { const r = cv.getBoundingClientRect(); return {x:(e.clientX - r.left) / r.width, y:(e.clientY - r.top) / r.height}; };
  cv.onpointerdown = e => {
    const p = pt(e), w = cv.width, h = cv.height, tx = 14 / (cv.getBoundingClientRect().width), ty = 14 / (cv.getBoundingClientRect().height), x0 = f.l, x1 = 1 - f.r, y0 = f.t, y1 = 1 - f.b;
    const nl = Math.abs(p.x - x0) < tx, nr = Math.abs(p.x - x1) < tx, nt = Math.abs(p.y - y0) < ty, nb = Math.abs(p.y - y1) < ty;
    const inX = p.x > x0 - tx && p.x < x1 + tx, inY = p.y > y0 - ty && p.y < y1 + ty; let m = null;
    if(inX && inY){ if(nl || nr || nt || nb) m = {l:nl, r:nr, t:nt, b:nb}; else if(p.x > x0 && p.x < x1 && p.y > y0 && p.y < y1) m = {move:true, p0:p, f0:{...f}}; }
    if(!m){ m = {l:false, r:false, t:false, b:false, draw:true, p0:p}; f = {l:clamp(p.x, 0, .95), t:clamp(p.y, 0, .95), r:1 - clamp(p.x, .05, 1), b:1 - clamp(p.y, .05, 1)}; m.r = true; m.b = true; m.draw = false; }
    mode = m; cv.setPointerCapture(e.pointerId); draw();
  };
  cv.onpointermove = e => {
    if(!mode) return; const p = pt(e);
    if(mode.move){ const dx = p.x - mode.p0.x, dy = p.y - mode.p0.y, w = 1 - mode.f0.l - mode.f0.r, h = 1 - mode.f0.t - mode.f0.b, l = clamp(mode.f0.l + dx, 0, 1 - w), t = clamp(mode.f0.t + dy, 0, 1 - h); f = {l, t, r:1 - l - w, b:1 - t - h}; }
    else{ if(mode.l) f.l = clamp(p.x, 0, 1 - f.r - .05); if(mode.r) f.r = clamp(1 - p.x, 0, 1 - f.l - .05); if(mode.t) f.t = clamp(p.y, 0, 1 - f.b - .05); if(mode.b) f.b = clamp(1 - p.y, 0, 1 - f.t - .05); }
    draw();
  };
  cv.onpointerup = cv.onpointercancel = () => { mode = null; };
  [["mt", "t"], ["mr", "r"], ["mb", "b"], ["ml", "l"]].forEach(([id, k]) => $(id).oninput = () => {
    f[k] = clamp((+$(id).value || 0) / 100, 0, .9);
    if(f.l + f.r > .95) f[k] = .95 - (k === "l" ? f.r : f.l); if(f.t + f.b > .95) f[k] = .95 - (k === "t" ? f.b : f.t);
    const v = $(id).value; draw(); $(id).value = v;
  });
  $("rs").onclick = () => { f = {l:.05, t:.05, r:.05, b:.05}; draw(); };
  $("au").onclick = () => {
    if(!base) return; const c = base.getContext("2d"), w = base.width, h = base.height, d = c.getImageData(0, 0, w, h).data; let x0 = w, x1 = -1, y0 = h, y1 = -1;
    for(let y = 0; y < h; y += 2) for(let x = 0; x < w; x += 2){ const i = (y * w + x) * 4; if(d[i + 3] > 20 && (d[i] + d[i + 1] + d[i + 2]) / 3 < 235){ if(x < x0) x0 = x; if(x > x1) x1 = x; if(y < y0) y0 = y; if(y > y1) y1 = y; } }
    if(x1 < 0) return fail("This page looks empty."); const pad = .01; f = {l:clamp(x0 / w - pad, 0, .9), t:clamp(y0 / h - pad, 0, .9), r:clamp(1 - x1 / w - pad, 0, .9), b:clamp(1 - y1 / h - pad, 0, .9)}; $("status").textContent = ""; draw();
  };
  $("pp").onclick = () => show(cur - 1); $("pn").onclick = () => show(cur + 1); $("ap").onchange = () => { $("rg").hidden = $("ap").value !== "range"; };
  $("f").onchange = async e => {
    const file = e.target.files[0]; $("ed").hidden = true; $("out").hidden = true; if(pd){ pd.destroy(); pd = null; } if(!file) return; name = file.name.replace(/\.pdf$/i, ""); $("info").className = "hint"; $("info").textContent = "Loading...";
    try{ bytes = await file.arrayBuffer(); const d = await PDFLib.PDFDocument.load(bytes, {ignoreEncryption:true}); if(d.isEncrypted) throw new Error("enc"); pd = await pdfjsLib.getDocument({data:new Uint8Array(bytes.slice(0))}).promise; n = pd.numPages;
      $("info").textContent = file.name + " (" + n + " pages)"; $("ed").hidden = false; f = {l:.05, t:.05, r:.05, b:.05}; await show(1); }
    catch(err){ $("info").className = "hint err"; $("info").textContent = err.message === "enc" ? "This PDF is password protected. Remove the password first." : "Could not read this PDF."; }
  };
  $("go").onclick = async () => {
    let pages; const ap = $("ap").value;
    if(ap === "this") pages = new Set([cur - 1]); else if(ap === "range"){ const r = PL.ranges($("rg").value, n); if(r.err) return fail(r.err); pages = new Set(r.groups.flat()); } else pages = null;
    $("go").disabled = true; $("status").className = ""; $("status").textContent = "Cropping..."; $("bar").hidden = false; await new Promise(r => setTimeout(r, 30));
    try{
      const doc = await PDFLib.PDFDocument.load(bytes, {ignoreEncryption:true}); let first = 0, k = 0;
      doc.getPages().forEach((p, i) => { if(pages && !pages.has(i)) return; const r = PL.cropRect(p, f); p.setMediaBox(r.x, r.y, r.w, r.h); p.setCropBox(r.x, r.y, r.w, r.h); if(!k++) first = i; });
      await PL.finish(await doc.save(), name + "_cropped.pdf", k + " page(s) cropped.", first + 1); $("status").textContent = "";
    }catch(err){ fail("Could not crop this PDF."); }
    $("bar").hidden = true; $("go").disabled = false;
  };
  return () => { if(pd) pd.destroy(); PL.cleanup(); };
}
mountCropPdf(document.getElementById("tool"));
