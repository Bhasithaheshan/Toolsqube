/* ===================== TOOL: PDF Watermark editor ===================== */
const WM_FONTS = {
  sans:'Helvetica, Arial, sans-serif', serif:'"Times New Roman", Times, serif', mono:'"Courier New", Courier, monospace',
  display:'Impact, "Arial Black", sans-serif', hand:'"Segoe Script","Brush Script MT","Bradley Hand",cursive', sinhala:'"Nirmala UI","Iskoola Pota","Noto Sans Sinhala",sans-serif',
};
const RAD = Math.PI / 180;
/* bottom-left corner (y up) of a w x h rectangle centred on (cx, cy) and rotated deg counter-clockwise */
function stampCorner(cx, cy, w, h, deg){ const c = Math.cos(deg * RAD), s = Math.sin(deg * RAD); return [cx - (w / 2) * c + (h / 2) * s, cy - (w / 2) * s - (h / 2) * c]; }
/* centres (y up) of a repeated pattern around (cx, cy) that cover the page */
function mosaicPoints(Wd, Hd, cx, cy, w, h, gapPct, deg){
  const g = 1 + gapPct / 100, sx = Math.max(4, w * g), sy = Math.max(4, h * g), c = Math.cos(deg * RAD), s = Math.sin(deg * RAD), N = Math.min(40, Math.ceil(Math.hypot(Wd, Hd) / Math.min(sx, sy)) + 1), out = [];
  for(let j = -N; j <= N; j++) for(let i = -N; i <= N; i++){
    const u = (i + (j % 2 ? 0.5 : 0)) * sx, v = j * sy, x = cx + u * c - v * s, y = cy + u * s + v * c, m = Math.max(w, h);
    if(x > -m && x < Wd + m && y > -m && y < Hd + m) out.push({x, y});
  }
  return out;
}
/* canvas point -> layer-local coordinates (layer drawn rotated by -deg) */
function toLocal(dx, dy, deg){ const a = deg * RAD, c = Math.cos(a), s = Math.sin(a); return [dx * c - dy * s, dx * s + dy * c]; }
function appliesTo(l, i, n, rangeSet){
  switch(l.pages){ case "odd": return (i + 1) % 2 === 1; case "even": return (i + 1) % 2 === 0; case "first": return i === 0; case "last": return i === n - 1; case "custom": return rangeSet ? rangeSet.has(i) : false; default: return true; }
}
/* END CORE */

function mountWatermark(root){
  root.innerHTML = `<style>
  .wm-chips{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px}
  .wm-chip{padding:6px 12px;border:1px solid var(--line);border-radius:999px;background:var(--surface2);cursor:pointer;font-weight:600;font-size:.9rem;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .wm-chip.on{background:var(--acc);color:var(--accink);border-color:var(--acc)}
  .wm-g{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-top:16px}
  .wm-g label{font-weight:600;font-size:.9rem;margin-bottom:4px;display:flex;justify-content:space-between}
  .wm-g input[type=color]{width:100%;height:38px;padding:2px;border:1px solid var(--line);border-radius:8px;background:var(--surface2)}
  .wm-g .ck{display:flex;gap:8px;align-items:center;font-weight:600;font-size:.95rem}
  .wm-pos{display:grid;grid-template-columns:repeat(3,28px);gap:4px}.card .wm-pos button{padding:0;height:28px;border-radius:6px}
  .wm-vp{border:1px solid var(--line);border-radius:12px;background:var(--surface2);overflow:auto;max-height:78vh;padding:10px;margin-bottom:12px}
  .wm-vp canvas{display:block;margin:0 auto;box-shadow:0 2px 14px rgba(0,0,0,.35);background:#fff;touch-action:none;outline:none}
  .wm-th{display:flex;gap:8px;overflow-x:auto;padding:8px 2px;margin-bottom:12px}
  .wm-t{flex:none;width:76px;min-height:60px;cursor:pointer;border:2px solid var(--line);border-radius:6px;overflow:hidden;background:#fff;position:relative}.wm-t.on{border-color:var(--acc)}
  .wm-t canvas{display:block;width:100%;height:auto}.wm-t span{position:absolute;bottom:2px;left:2px;background:rgba(12,26,41,.8);color:#fff;font-size:.7rem;padding:0 6px;border-radius:999px}
  .card button.danger{background:transparent;color:#d64545;border:1px solid #d64545}.card button.danger:hover:not(:disabled){background:rgba(214,69,69,.12)}
  </style>
  <div class="card"><label for="f">1. Choose a PDF</label><input id="f" type="file" accept="application/pdf,.pdf"><p id="info" class="hint">No file chosen.</p></div>
  <div id="ed" hidden>
    <div class="card"><label>2. Add watermarks</label>
      <div class="row"><div><button id="addT" type="button">+ Text</button></div><div><button id="addL" type="button" class="alt">+ Logo or image</button><input id="lf" type="file" accept="image/*" hidden></div><div><button id="undo" type="button" class="alt">↶ Undo</button></div></div>
      <div id="chips" class="wm-chips"></div>
      <p id="none" class="hint">No watermark yet. Add some text or a logo. You can add as many as you like.</p>
      <div id="ctl" hidden>
        <div class="wm-g">
          <div class="t-only" style="grid-column:1/-1"><label for="tx">Text</label><input id="tx" type="text" maxlength="80"></div>
          <div class="t-only"><label for="qt">Quick text</label><select id="qt"><option value="">Choose...</option><option>CONFIDENTIAL</option><option>DRAFT</option><option>COPY</option><option>SAMPLE</option><option>DO NOT COPY</option><option>APPROVED</option><option>PAID</option><option value="__date">Today's date</option></select></div>
          <div class="t-only"><label for="fn">Font</label><select id="fn"><option value="sans">Sans</option><option value="serif">Serif</option><option value="mono">Monospace</option><option value="display">Bold display</option><option value="hand">Handwriting</option><option value="sinhala">Sinhala</option></select></div>
          <div class="t-only"><label>Style</label><div class="row" style="gap:14px"><span class="ck"><input id="bd" type="checkbox"> Bold</span><span class="ck"><input id="it" type="checkbox"> Italic</span></div></div>
          <div class="t-only"><label for="cl">Color</label><input id="cl" type="color"></div>
          <div class="t-only"><label>Outline</label><div class="row" style="gap:10px;align-items:center"><span class="ck"><input id="ol" type="checkbox"> On</span><input id="oc" type="color" style="max-width:80px"></div></div>
          <div class="i-only"><label>Logo background</label><span class="ck"><input id="wt" type="checkbox"> Make white transparent</span></div>
          <div><label for="sz"><span id="szl">Size</span><span id="szv"></span></label><input id="sz" type="range" min="8" max="300" step="1" style="width:100%;accent-color:var(--acc)"></div>
          <div><label for="op">Opacity <span id="opv"></span></label><input id="op" type="range" min="5" max="100" step="1" style="width:100%;accent-color:var(--acc)"></div>
          <div><label for="rt">Rotate <span id="rtv"></span></label><input id="rt" type="range" min="-180" max="180" step="1" style="width:100%;accent-color:var(--acc)"></div>
          <div><label>Position</label><div class="wm-pos" id="pos"></div></div>
          <div><label>Repeat (mosaic)</label><span class="ck"><input id="mo" type="checkbox"> Repeat across the page</span><label for="gp" style="margin-top:8px">Spacing <span id="gpv"></span></label><input id="gp" type="range" min="0" max="200" step="5" style="width:100%;accent-color:var(--acc)"></div>
          <div><label for="pg">Apply to pages</label><select id="pg"><option value="all">All pages</option><option value="odd">Odd pages</option><option value="even">Even pages</option><option value="first">First page only</option><option value="last">Last page only</option><option value="custom">Custom range</option></select><input id="pr" type="text" placeholder="e.g. 1-3, 5" style="margin-top:8px" hidden></div>
        </div>
        <div class="row" style="margin-top:16px"><div><button id="dup" type="button" class="alt">Duplicate</button></div><div><button id="del" type="button" class="danger">Delete this watermark</button></div></div>
      </div></div>
    <div class="card"><div class="row" style="align-items:center">
      <div><button id="pp" type="button" class="alt">← Prev</button></div><div style="text-align:center"><b id="pgl"></b></div><div><button id="pn" type="button" class="alt">Next →</button></div>
      <div style="text-align:right"><button id="zo" type="button" class="alt">−</button> <b id="zv">100%</b> <button id="zi" type="button" class="alt">+</button> <button id="zf" type="button" class="alt">Fit</button></div></div>
      <p class="hint" style="margin-top:8px">Drag a watermark to move it. Drag a corner to resize, and the round handle on top to rotate. Arrow keys nudge, Delete removes it.</p></div>
    <div id="vp" class="wm-vp"><canvas id="cv" tabindex="0" aria-label="Page preview"></canvas></div>
    <div id="th" class="wm-th"></div>
    <div class="card"><div class="row"><div><button id="go" type="button">Save watermarked PDF</button></div></div><progress id="bar" hidden></progress><div id="status" aria-live="polite"></div>
      <p class="hint">The saved PDF looks exactly like this preview. Watermarks are added as images, so any font on your device works, including Sinhala.</p></div>
  </div>${PL.resultCard}`;

  let bytes = null, doc = null, n = 0, name = "document", cur = 1, W = 600, H = 800, Wref = 600, sc = 1, base = null, zoom = 100, tok = 0;
  let layers = [], sel = null, uid = 0, hist = [], mode = null; const srcs = {}, bases = new Map(), stamps = {};
  const cv = $("cv"), g = cv.getContext("2d"), clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const say = (m, e) => { $("status").className = e ? "err" : ""; $("status").textContent = m; };
  const layer = () => layers.find(l => l.id === sel) || null;
  const rangeSet = l => { if(l.pages !== "custom") return null; const r = PL.ranges(l.range || "", n); return r.err ? new Set() : new Set(r.groups.flat()); };
  const applies = (l, i) => appliesTo(l, i, n, rangeSet(l));

  /* ---------- stamps (the watermark picture) ---------- */
  function imgSrc(l){ const s = srcs[l.id]; return s ? (l.white ? s.clear : s.orig) : null; }
  function stampOf(l, ppt){
    const key = [l.type, l.text, l.font, l.bold, l.italic, l.color, l.outline, l.oc, l.size, l.wf, l.white, ppt.toFixed(3)].join("|");
    if(stamps[l.id] && stamps[l.id].key === key) return stamps[l.id].st;
    let st;
    if(l.type === "text"){
      let p = l.size * ppt; const fnt = q => (l.italic ? "italic " : "") + (l.bold ? "bold " : "") + q + "px " + WM_FONTS[l.font];
      const m = document.createElement("canvas").getContext("2d"); m.font = fnt(p); let tw = m.measureText(l.text || " ").width;
      const cap = 7000; if(tw + p * 0.4 > cap){ const k = cap / (tw + p * 0.4); ppt *= k; p *= k; m.font = fnt(p); tw = m.measureText(l.text || " ").width; }
      const ow = l.outline ? Math.max(1, p * 0.05) : 0, pad = Math.ceil(p * 0.12 + ow), asc = p * 0.85, desc = p * 0.3, c = document.createElement("canvas");
      c.width = Math.max(2, Math.ceil(tw + 2 * pad)); c.height = Math.max(2, Math.ceil(asc + desc + 2 * pad));
      const x = c.getContext("2d"); x.font = fnt(p); x.textBaseline = "alphabetic"; x.lineJoin = "round";
      if(l.outline){ x.lineWidth = ow * 2; x.strokeStyle = l.oc; x.strokeText(l.text, pad, pad + asc); }
      x.fillStyle = l.color; x.fillText(l.text, pad, pad + asc); st = {canvas:c, wPt:c.width / ppt, hPt:c.height / ppt};
    }else{
      const s = imgSrc(l), wPt = l.wf * Wref, hPt = wPt * s.height / s.width, pw = Math.max(2, Math.min(s.width, Math.round(wPt * ppt))), ph = Math.max(2, Math.round(pw * s.height / s.width)), c = document.createElement("canvas");
      c.width = pw; c.height = ph; c.getContext("2d").drawImage(s, 0, 0, pw, ph); st = {canvas:c, wPt, hPt};
    }
    stamps[l.id] = {key, st}; return st;
  }

  /* ---------- drawing ---------- */
  function box(l){ const k = W / Wref, st = stampOf(l, sc * k); return {w:st.wPt * k, h:st.hPt * k, st}; }
  function drawLayer(l){
    if(l.type === "text" && !l.text.trim()) return; const {w, h, st} = box(l), c0 = {x:l.cx * W, y:(1 - l.cy) * H};
    const pts = l.mosaic ? mosaicPoints(W, H, c0.x, c0.y, w, h, l.gap, l.rot) : [c0];
    for(const p of pts){ g.save(); g.translate(p.x * sc, (H - p.y) * sc); g.rotate(-l.rot * RAD); g.globalAlpha = l.opacity / 100; g.drawImage(st.canvas, -w * sc / 2, -h * sc / 2, w * sc, h * sc); g.restore(); }
  }
  function drawSel(l){
    const {w, h} = box(l), acc = getComputedStyle(document.documentElement).getPropertyValue("--acc").trim() || "#0b8a93", hw = w * sc / 2, hh = h * sc / 2;
    g.save(); g.translate(l.cx * W * sc, l.cy * H * sc); g.rotate(-l.rot * RAD); g.strokeStyle = acc; g.lineWidth = 2; g.setLineDash([6, 4]); g.strokeRect(-hw, -hh, 2 * hw, 2 * hh); g.setLineDash([]);
    g.fillStyle = "#fff"; for(const [sx, sy] of [[-1,-1],[1,-1],[-1,1],[1,1]]){ g.fillRect(sx * hw - 6, sy * hh - 6, 12, 12); g.strokeRect(sx * hw - 6, sy * hh - 6, 12, 12); }
    g.beginPath(); g.moveTo(0, -hh); g.lineTo(0, -hh - 28); g.stroke(); g.beginPath(); g.arc(0, -hh - 28, 7, 0, 7); g.fill(); g.stroke(); g.restore();
  }
  function draw(){
    if(!base) return; cv.width = base.width; cv.height = base.height; g.drawImage(base, 0, 0);
    layers.forEach(l => { if(applies(l, cur - 1)) drawLayer(l); }); const s = layer(); if(s && applies(s, cur - 1)) drawSel(s);
    $("pgl").textContent = "Page " + cur + " of " + n; $("pp").disabled = cur <= 1; $("pn").disabled = cur >= n;
    document.querySelectorAll(".wm-t").forEach(t => t.classList.toggle("on", +t.dataset.i === cur));
  }
  async function loadBase(no){
    if(!bases.has(no)){
      const page = await doc.getPage(no), v1 = page.getViewport({scale:1}), s = 1000 / v1.width, vp = page.getViewport({scale:s}), c = document.createElement("canvas");
      c.width = vp.width; c.height = vp.height; await page.render({canvasContext:c.getContext("2d"), viewport:vp}).promise; if(bases.size > 4) bases.delete(bases.keys().next().value); bases.set(no, {c, W:v1.width, H:v1.height, s});
    }
    const b = bases.get(no); base = b.c; W = b.W; H = b.H; sc = b.s;
  }
  function fit(){ cv.style.width = Math.round(($("vp").clientWidth - 20) * zoom / 100) + "px"; $("zv").textContent = zoom + "%"; }
  async function show(p){ cur = clamp(p, 1, n); const my = ++tok; await loadBase(cur); if(my !== tok) return; fit(); draw(); }

  /* ---------- history ---------- */
  const snap = () => { hist.push(JSON.stringify(layers)); if(hist.length > 80) hist.shift(); };
  function undo(){ if(hist.length < 2) return; hist.pop(); layers = JSON.parse(hist[hist.length - 1]); if(!layer()) sel = null; chips(); sync(); draw(); }

  /* ---------- layers & controls ---------- */
  function chips(){
    const box = $("chips"); box.innerHTML = ""; $("none").hidden = layers.length > 0; $("ctl").hidden = !layer();
    layers.forEach(l => { const d = document.createElement("div"); d.className = "wm-chip" + (l.id === sel ? " on" : ""); d.tabIndex = 0; d.setAttribute("role", "button");
      d.textContent = l.type === "text" ? "T  " + (l.text || "(empty)") : "▣  Logo"; d.onclick = () => { sel = l.id; chips(); sync(); draw(); }; d.onkeydown = e => { if(e.key === "Enter") d.click(); }; box.appendChild(d); });
  }
  function sync(){
    const l = layer(); if(!l) return; const t = l.type === "text";
    document.querySelectorAll(".t-only").forEach(x => x.hidden = !t); document.querySelectorAll(".i-only").forEach(x => x.hidden = t);
    if(t){ $("tx").value = l.text; $("fn").value = l.font; $("bd").checked = l.bold; $("it").checked = l.italic; $("cl").value = l.color; $("ol").checked = l.outline; $("oc").value = l.oc; }
    else $("wt").checked = !!l.white;
    $("sz").min = t ? 8 : 5; $("sz").max = t ? 300 : 100; $("sz").value = t ? l.size : Math.round(l.wf * 100); $("szl").textContent = t ? "Size " : "Width "; $("szv").textContent = t ? Math.round(l.size) : Math.round(l.wf * 100) + "%";
    $("op").value = l.opacity; $("opv").textContent = l.opacity + "%"; $("rt").value = Math.round(l.rot); $("rtv").textContent = Math.round(l.rot) + "°";
    $("mo").checked = l.mosaic; $("gp").value = l.gap; $("gpv").textContent = l.gap + "%"; $("gp").disabled = !l.mosaic; $("pg").value = l.pages; $("pr").hidden = l.pages !== "custom"; $("pr").value = l.range || "";
  }
  const base0 = () => ({id:++uid, rot:0, cx:.5, cy:.5, opacity:50, mosaic:false, gap:60, pages:"all", range:""});
  function addText(){ layers.push({...base0(), type:"text", text:"CONFIDENTIAL", font:"sans", bold:true, italic:false, color:"#d93636", outline:false, oc:"#ffffff", size:60, rot:30, opacity:35}); sel = uid; snap(); chips(); sync(); draw(); }
  async function addLogo(file){
    try{
      const bmp = await createImageBitmap(file), s = Math.min(1, 1600 / bmp.width), o = document.createElement("canvas"); o.width = Math.round(bmp.width * s); o.height = Math.round(bmp.height * s); o.getContext("2d").drawImage(bmp, 0, 0, o.width, o.height); bmp.close();
      const cl = document.createElement("canvas"); cl.width = o.width; cl.height = o.height; const x = cl.getContext("2d", {willReadFrequently:true}); x.drawImage(o, 0, 0); const im = x.getImageData(0, 0, cl.width, cl.height), d = im.data;
      for(let i = 0; i < d.length; i += 4){ const lum = (d[i] + d[i + 1] + d[i + 2]) / 3; d[i + 3] = Math.min(255, Math.max(0, (255 - lum) * 3)) * (d[i + 3] / 255); } x.putImageData(im, 0, 0);
      const l = {...base0(), type:"image", wf:.3, white:false, opacity:70}; srcs[l.id] = {orig:o, clear:cl}; layers.push(l); sel = l.id; snap(); chips(); sync(); draw();
    }catch(e){ say("Could not read this image. Try PNG or JPG.", true); }
  }
  const live = (id, fn) => { $(id).oninput = () => { const l = layer(); if(!l) return; fn(l, $(id)); sync(); draw(); }; $(id).onchange = () => { snap(); chips(); }; };
  live("tx", (l, e) => { l.text = e.value; }); live("fn", (l, e) => { l.font = e.value; }); live("cl", (l, e) => { l.color = e.value; }); live("oc", (l, e) => { l.oc = e.value; });
  live("sz", (l, e) => { if(l.type === "text") l.size = +e.value; else l.wf = +e.value / 100; }); live("op", (l, e) => { l.opacity = +e.value; }); live("rt", (l, e) => { l.rot = +e.value; });
  live("gp", (l, e) => { l.gap = +e.value; }); live("pr", (l, e) => { l.range = e.value; });
  ["bd", "it", "ol", "mo", "wt"].forEach(id => $(id).onchange = () => { const l = layer(); if(!l) return; if(id === "bd") l.bold = $(id).checked; if(id === "it") l.italic = $(id).checked; if(id === "ol") l.outline = $(id).checked; if(id === "mo") l.mosaic = $(id).checked; if(id === "wt") l.white = $(id).checked; snap(); sync(); draw(); });
  $("pg").onchange = () => { const l = layer(); if(!l) return; l.pages = $("pg").value; snap(); sync(); draw(); };
  $("qt").onchange = () => { const l = layer(); if(!l || !$("qt").value) return; l.text = $("qt").value === "__date" ? new Date().toLocaleDateString(undefined, {year:"numeric", month:"long", day:"numeric"}) : $("qt").value; $("qt").value = ""; snap(); chips(); sync(); draw(); };
  const P = $("pos"); for(let r = 0; r < 3; r++) for(let c = 0; c < 3; c++){ const b = document.createElement("button"); b.type = "button"; b.setAttribute("aria-label", "Position " + (r * 3 + c + 1)); b.onclick = () => { const l = layer(); if(!l) return; l.cx = [.2, .5, .8][c]; l.cy = [.12, .5, .88][r]; snap(); draw(); }; P.appendChild(b); }
  $("addT").onclick = addText; $("addL").onclick = () => $("lf").click(); $("lf").onchange = e => { if(e.target.files[0]) addLogo(e.target.files[0]); e.target.value = ""; };
  $("undo").onclick = undo;
  $("dup").onclick = () => { const l = layer(); if(!l) return; const c = {...l, id:++uid, cx:clamp(l.cx + .04, 0, 1), cy:clamp(l.cy + .04, 0, 1)}; if(srcs[l.id]) srcs[c.id] = srcs[l.id]; layers.push(c); sel = c.id; snap(); chips(); sync(); draw(); };
  $("del").onclick = () => { layers = layers.filter(l => l.id !== sel); sel = null; snap(); chips(); draw(); };

  /* ---------- mouse and touch ---------- */
  const pt = e => { const r = cv.getBoundingClientRect(); return {x:(e.clientX - r.left) * cv.width / r.width, y:(e.clientY - r.top) * cv.height / r.height}; };
  const local = (l, p) => toLocal(p.x - l.cx * W * sc, p.y - l.cy * H * sc, l.rot);
  cv.onpointerdown = e => {
    cv.focus(); const p = pt(e); let l = layer(), m = null;
    if(l && applies(l, cur - 1)){
      const {w, h} = box(l), [lx, ly] = local(l, p), hw = w * sc / 2, hh = h * sc / 2;
      if(Math.abs(lx) < 14 && Math.abs(ly + hh + 28) < 14) m = {t:"rot"};
      else if([[-1,-1],[1,-1],[-1,1],[1,1]].some(([sx, sy]) => Math.abs(lx - sx * hw) < 14 && Math.abs(ly - sy * hh) < 14)) m = {t:"size", d0:Math.hypot(lx, ly) || 1, v0:l.type === "text" ? l.size : l.wf};
    }
    if(!m){
      for(let i = layers.length - 1; i >= 0; i--){ const q = layers[i]; if(!applies(q, cur - 1)) continue; const {w, h} = box(q), [lx, ly] = local(q, p); if(Math.abs(lx) <= w * sc / 2 && Math.abs(ly) <= h * sc / 2){ l = q; break; } l = null; }
      if(!l){ sel = null; chips(); draw(); return; } sel = l.id; chips(); sync(); m = {t:"move", p0:p, cx0:l.cx, cy0:l.cy};
    }
    mode = m; cv.setPointerCapture(e.pointerId); draw();
  };
  cv.onpointermove = e => {
    if(!mode) return; const l = layer(), p = pt(e); if(!l) return;
    if(mode.t === "move"){ l.cx = clamp(mode.cx0 + (p.x - mode.p0.x) / (W * sc), 0, 1); l.cy = clamp(mode.cy0 + (p.y - mode.p0.y) / (H * sc), 0, 1); }
    else if(mode.t === "size"){ const [lx, ly] = local(l, p), s = Math.hypot(lx, ly) / mode.d0; if(l.type === "text") l.size = clamp(Math.round(mode.v0 * s), 8, 300); else l.wf = clamp(mode.v0 * s, .05, 1); }
    else { let a = Math.atan2(-(p.y - l.cy * H * sc), p.x - l.cx * W * sc) / RAD - 90; if(a < -180) a += 360; if(e.shiftKey) a = Math.round(a / 15) * 15; if(Math.abs(a) < 3) a = 0; l.rot = Math.round(a); }
    sync(); draw();
  };
  cv.onpointerup = cv.onpointercancel = () => { if(mode){ mode = null; snap(); } };
  cv.onkeydown = e => {
    const l = layer(); if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z"){ e.preventDefault(); undo(); return; } if(!l) return;
    const st = e.shiftKey ? .01 : .002; if(e.key === "ArrowLeft") l.cx = clamp(l.cx - st, 0, 1); else if(e.key === "ArrowRight") l.cx = clamp(l.cx + st, 0, 1); else if(e.key === "ArrowUp") l.cy = clamp(l.cy - st, 0, 1); else if(e.key === "ArrowDown") l.cy = clamp(l.cy + st, 0, 1);
    else if(e.key === "Delete" || e.key === "Backspace"){ $("del").click(); e.preventDefault(); return; } else return; e.preventDefault(); draw();
  };

  /* ---------- pages, zoom, thumbnails ---------- */
  $("pp").onclick = () => show(cur - 1); $("pn").onclick = () => show(cur + 1);
  $("zi").onclick = () => { zoom = Math.min(300, zoom + 25); fit(); }; $("zo").onclick = () => { zoom = Math.max(50, zoom - 25); fit(); }; $("zf").onclick = () => { zoom = 100; fit(); };
  const onResize = () => fit(); window.addEventListener("resize", onResize);
  let thObs = null, thQ = [], thBusy = false;
  async function thPump(){ if(thBusy) return; thBusy = true; while(thQ.length){ const i = thQ.shift(); try{ await PL.render(doc, i, document.querySelector('.wm-t[data-i="' + i + '"] canvas'), 110); }catch(e){} } thBusy = false; }
  function buildThumbs(){
    const box = $("th"); box.innerHTML = ""; if(thObs) thObs.disconnect(); thQ = [];
    thObs = new IntersectionObserver(es => es.forEach(en => { if(en.isIntersecting){ const i = +en.target.dataset.i; if(!en.target.dataset.r){ en.target.dataset.r = 1; thQ.push(i); thPump(); } } }), {root:box, rootMargin:"300px"});
    for(let i = 1; i <= n; i++){ const d = document.createElement("div"); d.className = "wm-t"; d.dataset.i = i; d.innerHTML = '<canvas width="2" height="2"></canvas><span>' + i + "</span>"; d.onclick = () => show(i); box.appendChild(d); thObs.observe(d); }
  }

  /* ---------- open and save ---------- */
  $("f").onchange = async e => {
    const file = e.target.files[0]; $("ed").hidden = true; $("out").hidden = true; if(doc){ doc.destroy(); doc = null; } bytes = null; if(!file) return;
    name = file.name.replace(/\.pdf$/i, ""); $("info").className = "hint"; $("info").textContent = "Loading...";
    try{
      bytes = await file.arrayBuffer(); const d = await PDFLib.PDFDocument.load(bytes, {ignoreEncryption:true}); if(d.isEncrypted) throw new Error("enc");
      doc = await pdfjsLib.getDocument({data:new Uint8Array(bytes.slice(0))}).promise; n = doc.numPages; bases.clear(); layers = []; sel = null; hist = ["[]"]; cur = 1;
      const p1 = await doc.getPage(1); Wref = p1.getViewport({scale:1}).width; $("info").textContent = file.name + " (" + n + " pages)"; $("ed").hidden = false; zoom = 100; buildThumbs(); chips(); await show(1);
    }catch(err){ bytes = null; $("info").className = "hint err"; $("info").textContent = err.message === "enc" || (err && err.name === "PasswordException") ? "This PDF is password protected. Remove the password first." : "Could not read this PDF."; }
  };
  $("go").onclick = async () => {
    const use = layers.filter(l => l.type === "image" || l.text.trim()); if(!use.length) return say("Add a watermark first.", true);
    $("go").disabled = true; $("bar").hidden = false; say("Adding the watermarks..."); await new Promise(r => setTimeout(r, 30));
    try{
      const out = await PDFLib.PDFDocument.load(bytes, {ignoreEncryption:true}), emb = {};
      for(const l of use){ const st = stampOf(l, l.type === "text" ? 3.5 : 4), blob = await new Promise(r => st.canvas.toBlob(r, "image/png")); emb[l.id] = {img:await out.embedPng(new Uint8Array(await blob.arrayBuffer())), st}; }
      let pagesDone = 0;
      out.getPages().forEach((page, i) => {
        const d = PL.dims(page), k = d.Wd / Wref; let any = false;
        for(const l of use){
          if(!applies(l, i)) continue; any = true; const {img, st} = emb[l.id], w = st.wPt * k, h = st.hPt * k, c0 = {x:l.cx * d.Wd, y:(1 - l.cy) * d.Hd};
          for(const p of (l.mosaic ? mosaicPoints(d.Wd, d.Hd, c0.x, c0.y, w, h, l.gap, l.rot) : [c0])){
            const [x0, y0] = stampCorner(p.x, p.y, w, h, l.rot), [px, py] = PL.toPage(d, x0, y0);
            page.drawImage(img, {x:px, y:py, width:w, height:h, rotate:PDFLib.degrees(l.rot + d.r), opacity:l.opacity / 100});
          }
        }
        if(any) pagesDone++;
      });
      if(!pagesDone) throw new Error("none");
      await PL.finish(await out.save(), name + "_watermarked.pdf", "Watermark added to " + pagesDone + " page(s).", 1, true); say("");
    }catch(err){ say(err.message === "none" ? "None of your watermarks apply to any page. Check the Apply to pages setting." : "Could not add the watermarks. Try a smaller logo or fewer pages.", true); }
    $("bar").hidden = true; $("go").disabled = false;
  };
  return () => { window.removeEventListener("resize", onResize); if(thObs) thObs.disconnect(); if(doc) doc.destroy(); PL.cleanup(); };
}
mountWatermark(document.getElementById("tool"));
