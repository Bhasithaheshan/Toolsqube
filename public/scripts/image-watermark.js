/* ===================== TOOL: Add Watermark to Image ===================== */
const IW_FONTS = {sans:'Helvetica, Arial, sans-serif', serif:'"Times New Roman", Times, serif', mono:'"Courier New", Courier, monospace', display:'Impact, "Arial Black", sans-serif', hand:'"Segoe Script","Brush Script MT","Bradley Hand",cursive', sinhala:'"Nirmala UI","Iskoola Pota","Noto Sans Sinhala",sans-serif'};
const IWR = Math.PI / 180;
/* centres of a repeating pattern around (cx, cy) that covers a W x H picture; y goes down */
function iwMosaic(W, H, cx, cy, w, h, gapPct, deg){
  const g = 1 + gapPct / 100, sx = Math.max(4, w * g), sy = Math.max(4, h * g), c = Math.cos(deg * IWR), s = Math.sin(deg * IWR), N = Math.min(40, Math.ceil(Math.hypot(W, H) / Math.min(sx, sy)) + 1), out = [];
  for(let j = -N; j <= N; j++) for(let i = -N; i <= N; i++){ const u = (i + (j % 2 ? 0.5 : 0)) * sx, v = j * sy, x = cx + u * c + v * s, y = cy - u * s + v * c, m = Math.max(w, h); if(x > -m && x < W + m && y > -m && y < H + m) out.push({x, y}); }
  return out;
}
function iwLocal(dx, dy, deg){ const a = deg * IWR, c = Math.cos(a), s = Math.sin(a); return [dx * c - dy * s, dx * s + dy * c]; }
/* split text into lines no wider than maxW (measure gives the width of a string) */
function iwWrap(text, maxW, measure){
  const out = [];
  for(const para of String(text).split("\n")){
    let line = ""; for(const word of para.split(/\s+/).filter(Boolean)){ const t = line ? line + " " + word : word; if(measure(t) <= maxW || !line) line = t; else{ out.push(line); line = word; } } out.push(line);
  }
  return out;
}
/* END CORE */
/* ---- original meme templates (drawn here, no outside pictures) ---- */
const IW_TXT = {type:"text", font:"sans", bold:true, italic:false, color:"#1d2733", outline:false, oc:"#ffffff", shadow:false, size:5.4, opacity:100, fit:false, wrap:40, rot:0, mosaic:false, gap:60};
const slot = (text, cx, cy, extra) => ({...IW_TXT, text, cx, cy, ...extra});
const tcv = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
function iconNo(g, x, y, r){ g.save(); g.strokeStyle = "#d64545"; g.lineWidth = r * .16; g.lineCap = "round"; g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke(); g.beginPath(); g.moveTo(x - r * .45, y - r * .45); g.lineTo(x + r * .45, y + r * .45); g.moveTo(x + r * .45, y - r * .45); g.lineTo(x - r * .45, y + r * .45); g.stroke(); g.restore(); }
function iconYes(g, x, y, r){ g.save(); g.strokeStyle = "#2a9d57"; g.lineWidth = r * .16; g.lineCap = "round"; g.lineJoin = "round"; g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke(); g.beginPath(); g.moveTo(x - r * .5, y + r * .02); g.lineTo(x - r * .12, y + r * .4); g.lineTo(x + r * .52, y - r * .38); g.stroke(); g.restore(); }
function iconLevel(g, x, y, i){ const cols = ["#9aa7b5", "#4f8ff7", "#8a63f2", "#f2a900"]; g.save(); if(i === 3){ g.strokeStyle = cols[3]; g.lineWidth = 8; g.lineCap = "round"; for(let a = 0; a < 12; a++){ const t = a * Math.PI / 6; g.beginPath(); g.moveTo(x + Math.cos(t) * 82, y + Math.sin(t) * 82); g.lineTo(x + Math.cos(t) * 112, y + Math.sin(t) * 112); g.stroke(); } }
  for(let j = 0; j <= i; j++){ g.beginPath(); g.fillStyle = j % 2 ? "#ffffff" : cols[i]; g.arc(x, y, 70 - j * 18 + (i === 0 ? -20 : 0), 0, 7); g.fill(); } g.restore(); }
const MEME_TPL = {
  two:{name:"Two choices", build(){ const c = tcv(1000, 1000), g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, 1000, 1000); g.fillStyle = "#f9d6d5"; g.fillRect(0, 0, 500, 500); g.fillStyle = "#d3f0dc"; g.fillRect(0, 500, 500, 500); iconNo(g, 250, 250, 120); iconYes(g, 250, 750, 120); g.strokeStyle = "#c9d3dc"; g.lineWidth = 6; g.strokeRect(3, 3, 994, 994); g.beginPath(); g.moveTo(0, 500); g.lineTo(1000, 500); g.moveTo(500, 0); g.lineTo(500, 1000); g.stroke(); return c; }, layers:() => [slot("Something you do not like", .75, .25, {wrap:42}), slot("Something you do like", .75, .75, {wrap:42})]},
  ba:{name:"Before and after", build(){ const c = tcv(1200, 800), g = c.getContext("2d"); g.fillStyle = "#e3e7ec"; g.fillRect(0, 0, 600, 800); g.fillStyle = "#d6f1e0"; g.fillRect(600, 0, 600, 800); g.fillStyle = "#fff"; g.fillRect(596, 0, 8, 800); g.beginPath(); g.moveTo(560, 650); g.lineTo(640, 650); g.lineTo(640, 620); g.lineTo(700, 680); g.lineTo(640, 740); g.lineTo(640, 710); g.lineTo(560, 710); g.closePath(); g.fillStyle = "#ffffff"; g.fill(); return c; }, layers:() => [slot("BEFORE", .25, .1, {wrap:0, size:6, color:"#5b6b7b"}), slot("AFTER", .75, .1, {wrap:0, size:6, color:"#2a7d4f"}), slot("How it used to be", .25, .5, {wrap:38}), slot("How it is now", .75, .5, {wrap:38})]},
  four:{name:"Four panels", build(){ const c = tcv(1000, 1000), g = c.getContext("2d"); ["#fde2e4", "#e2ecf9", "#e6f4d7", "#fff1c9"].forEach((col, i) => { g.fillStyle = col; g.fillRect((i % 2) * 500, Math.floor(i / 2) * 500, 500, 500); }); g.fillStyle = "#fff"; g.fillRect(494, 0, 12, 1000); g.fillRect(0, 494, 1000, 12); g.fillStyle = "rgba(0,0,0,.12)"; g.font = "bold 90px sans-serif"; ["1", "2", "3", "4"].forEach((t, i) => g.fillText(t, (i % 2) * 500 + 24, Math.floor(i / 2) * 500 + 100)); return c; }, layers:() => [slot("First", .25, .25, {wrap:38}), slot("Then", .75, .25, {wrap:38}), slot("Next", .25, .75, {wrap:38}), slot("Finally", .75, .75, {wrap:38})]},
  levels:{name:"Four levels", build(){ const c = tcv(1000, 1200), g = c.getContext("2d"); ["#e8ebef", "#d3e6ff", "#e3dbff", "#ffeab0"].forEach((col, i) => { g.fillStyle = col; g.fillRect(0, i * 300, 1000, 300); iconLevel(g, 170, i * 300 + 150, i); g.fillStyle = "#fff"; g.fillRect(0, i * 300 - 3, 1000, 6); }); return c; }, layers:() => [0, 1, 2, 3].map(i => slot(["Basic idea", "Better idea", "Smart idea", "Genius idea"][i], .65, (i * 300 + 150) / 1200, {wrap:55, size:5.2}))},
  vs:{name:"Versus", build(){ const c = tcv(1200, 800), g = c.getContext("2d"); g.fillStyle = "#cfe3ff"; g.fillRect(0, 0, 600, 800); g.fillStyle = "#ffd9d9"; g.fillRect(600, 0, 600, 800); g.fillStyle = "#fff"; g.beginPath(); g.arc(600, 400, 72, 0, 7); g.fill(); g.fillStyle = "#1d2733"; g.font = "bold 64px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("VS", 600, 404); return c; }, layers:() => [slot("Option A", .25, .27, {wrap:38, size:6.5}), slot("Option B", .75, .27, {wrap:38, size:6.5}), slot("Why A is good", .25, .7, {wrap:38, size:4.6, bold:false}), slot("Why B is good", .75, .7, {wrap:38, size:4.6, bold:false})]},
};
/* END TEMPLATES */


function mountImageWatermark(root){
  root.innerHTML = `<style>
  .wm-chips{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px}.wm-chip{padding:6px 12px;border:1px solid var(--line);border-radius:999px;background:var(--surface2);cursor:pointer;font-weight:600;font-size:.9rem;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.wm-chip.on{background:var(--acc);color:var(--accink);border-color:var(--acc)}
  .wm-g{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-top:16px}.wm-g label{font-weight:600;font-size:.9rem;margin-bottom:4px;display:flex;justify-content:space-between}
  .wm-g input[type=color]{width:100%;height:38px;padding:2px;border:1px solid var(--line);border-radius:8px;background:var(--surface2)}.wm-g .ck{display:flex;gap:8px;align-items:center;font-weight:600;font-size:.95rem}
  .wm-pos{display:grid;grid-template-columns:repeat(3,28px);gap:4px}.card .wm-pos button{padding:0;height:28px;border-radius:6px}
  .wm-vp{border:1px solid var(--line);border-radius:12px;background:var(--surface2);padding:10px;margin-bottom:12px;text-align:center}.wm-vp canvas{display:block;margin:0 auto;max-width:100%;height:auto;box-shadow:0 2px 14px rgba(0,0,0,.35);touch-action:none;outline:none}
  .card button.danger{background:transparent;color:#d64545;border:1px solid #d64545}
  .mt-grid{display:flex;flex-wrap:wrap;gap:10px}.mt-i{width:112px;cursor:pointer;border:2px solid var(--line);border-radius:10px;overflow:hidden;background:var(--surface2);position:relative;text-align:center}.mt-i:hover{border-color:var(--acc)}
  .mt-i canvas,.mt-i img{display:block;width:100%;height:96px;object-fit:cover;background:#fff}.mt-i span{display:block;font-size:.78rem;font-weight:700;padding:4px 4px 5px;line-height:1.2}
  .mt-x{position:absolute;right:3px;top:3px;width:22px;height:22px;border-radius:50%;background:rgba(12,26,41,.85);color:#fff;font-size:.8rem;line-height:22px;text-align:center}
  </style>
  <div class="card"><label for="f">1. Choose an image</label><input id="f" type="file" accept="image/*"><p id="info" class="hint">No image chosen.</p></div>
  <div id="ed" hidden>
    <div class="card"><label>2. Add and style your text</label>
      <div class="row"><div><button id="addT" type="button">+ Text</button></div><div><button id="addL" type="button" class="alt">+ Logo or image</button><input id="lf" type="file" accept="image/*" hidden></div><div><button id="undo" type="button" class="alt">↶ Undo</button></div></div>
      <div id="chips" class="wm-chips"></div><p id="none" class="hint">No watermark yet. Add some text or a logo. You can add as many as you like.</p>
      <div id="ctl" hidden><div class="wm-g">
        <div class="t-only" style="grid-column:1/-1"><label for="tx">Text</label><input id="tx" type="text" maxlength="80"></div>
        <div class="t-only"><label for="qt">Quick text</label><select id="qt"><option value="">Choose...</option><option>© My Name</option><option>SAMPLE</option><option>DRAFT</option><option>DO NOT COPY</option><option>PROOF</option><option value="__date">Today's date</option></select></div>
        <div class="t-only"><label for="fn">Font</label><select id="fn"><option value="sans">Sans</option><option value="serif">Serif</option><option value="mono">Monospace</option><option value="display">Bold display</option><option value="hand">Handwriting</option><option value="sinhala">Sinhala</option></select></div>
        <div class="t-only"><label>Style</label><div class="row" style="gap:14px"><span class="ck"><input id="bd" type="checkbox"> Bold</span><span class="ck"><input id="it" type="checkbox"> Italic</span></div></div>
        <div class="t-only"><label for="cl">Color</label><input id="cl" type="color"></div>
        <div class="t-only"><label>Outline</label><div class="row" style="gap:10px;align-items:center"><span class="ck"><input id="ol" type="checkbox"> On</span><input id="oc" type="color" style="max-width:80px"></div></div>
        <div class="t-only"><label>Shadow</label><span class="ck"><input id="sd" type="checkbox"> Soft shadow</span></div>
        <div class="t-only"><label for="wr">Wrap long text in a box <span id="wrv"></span></label><input id="wr" type="range" min="0" max="100" step="5" style="width:100%;accent-color:var(--acc)"></div>
        <div class="i-only"><label>Logo background</label><span class="ck"><input id="wt" type="checkbox"> Make white transparent</span></div>
        <div><label for="sz"><span id="szl">Size</span><span id="szv"></span></label><input id="sz" type="range" min="1" max="60" step="0.5" style="width:100%;accent-color:var(--acc)"></div>
        <div><label for="op">Opacity <span id="opv"></span></label><input id="op" type="range" min="5" max="100" step="1" style="width:100%;accent-color:var(--acc)"></div>
        <div><label for="rt">Rotate <span id="rtv"></span></label><input id="rt" type="range" min="-180" max="180" step="1" style="width:100%;accent-color:var(--acc)"></div>
        <div><label>Position</label><div class="wm-pos" id="pos"></div></div>
        <div><label>Repeat (mosaic)</label><span class="ck"><input id="mo" type="checkbox"> Repeat across the picture</span><label for="gp" style="margin-top:8px">Spacing <span id="gpv"></span></label><input id="gp" type="range" min="0" max="200" step="5" style="width:100%;accent-color:var(--acc)"></div></div>
        <div class="row" style="margin-top:16px"><div><button id="dup" type="button" class="alt">Duplicate</button></div><div><button id="del" type="button" class="danger">Delete this watermark</button></div></div></div></div>
    <div class="wm-vp"><canvas id="cv" tabindex="0" aria-label="Image preview"></canvas></div>
    <p class="hint" style="margin:0 0 10px">Drag a watermark to move it. Drag a corner to resize, and the round handle on top to rotate. Arrow keys nudge, Delete removes it.</p>
    <div class="card"><div class="row"><div><label for="of" style="font-weight:600">Save as</label><select id="of"><option value="png">PNG</option><option value="jpg">JPG</option><option value="webp">WebP</option></select></div><div style="align-self:end"><button id="go" type="button">Save the image</button></div></div></div></div>${IL.resultCard}`;
  let pmode = ""; try{ pmode = (JSON.parse(root.dataset.preset || "null") || {}).mode || ""; }catch(e){}
  let src = null, small = null, name = "image", layers = [], sel = null, uid = 0, hist = ["[]"], mode = null, k = 1; const srcs = {}, stamps = {};
  const cv = $("cv"), g = cv.getContext("2d"), clamp = (v, a, b) => Math.max(a, Math.min(b, v)), layer = () => layers.find(l => l.id === sel) || null;
  const imgSrc = l => { const s = srcs[l.id]; return s ? (l.white ? s.clear : s.orig) : null; };
  function stampOf(l, kk, W){
    const key = [l.type, l.text, l.font, l.bold, l.italic, l.color, l.outline, l.oc, l.shadow, l.size, l.wf, l.white, l.fit, l.wrap, kk.toFixed(4)].join("|"); if(stamps[l.id] && stamps[l.id].key === key) return stamps[l.id].st; let st;
    if(l.type === "text"){
      let p = l.size / 100 * W * kk, scl = 1; const fnt = q => (l.italic ? "italic " : "") + (l.bold ? "bold " : "") + q + "px " + IW_FONTS[l.font], m = document.createElement("canvas").getContext("2d"); m.font = fnt(p);
      const boxW = l.wrap > 0 ? l.wrap / 100 * W * kk : 0; let lines = [l.text || " "], tw = m.measureText(l.text || " ").width;
      if(boxW){ lines = iwWrap(l.text || " ", boxW, t => m.measureText(t).width); tw = Math.max(...lines.map(t => m.measureText(t || " ").width)); }
      else{
        if(l.fit && tw > .94 * W * kk){ p *= .94 * W * kk / tw; m.font = fnt(p); tw = m.measureText(l.text || " ").width; }
        if(tw + p * .6 > 7000){ scl = 7000 / (tw + p * .6); p *= scl; m.font = fnt(p); tw = m.measureText(l.text || " ").width; }
      }
      const lh = p * 1.18, ow = l.outline ? Math.max(1, p * .05) : 0, sh = l.shadow ? p * .08 : 0, pad = Math.ceil(p * .12 + ow + sh * 2), asc = p * .85, desc = p * .3, c = document.createElement("canvas"); c.width = Math.max(2, Math.ceil(tw + 2 * pad)); c.height = Math.max(2, Math.ceil(asc + desc + (lines.length - 1) * lh + 2 * pad));
      const x = c.getContext("2d"); x.font = fnt(p); x.textBaseline = "alphabetic"; x.lineJoin = "round"; if(l.shadow){ x.shadowColor = "rgba(0,0,0,.55)"; x.shadowBlur = sh * 2; x.shadowOffsetX = sh * .6; x.shadowOffsetY = sh * .6; }
      lines.forEach((t, i) => { const lx = boxW ? pad + (tw - x.measureText(t).width) / 2 : pad, ly = pad + asc + i * lh; if(l.outline){ x.lineWidth = ow * 2; x.strokeStyle = l.oc; x.strokeText(t, lx, ly); } x.fillStyle = l.color; x.fillText(t, lx, ly); });
      st = {canvas:c, w:c.width / (kk * scl), h:c.height / (kk * scl)};
    }else{ const s = imgSrc(l), w = l.wf * W, h = w * s.height / s.width, pw = Math.max(2, Math.min(s.width, Math.round(w * kk))), ph = Math.max(2, Math.round(pw * s.height / s.width)), c = document.createElement("canvas"); c.width = pw; c.height = ph; c.getContext("2d").drawImage(s, 0, 0, pw, ph); st = {canvas:c, w, h}; }
    stamps[l.id] = {key, st}; return st;
  }
  /* paint every watermark on top of img; kk = output pixels per image pixel */
  function paint(gx, img, kk, withSel){
    const W = img.width / kk, H = img.height / kk;
    for(const l of layers){
      if(l.type === "text" && !l.text.trim()) continue; const st = stampOf(l, kk, W), pts = l.mosaic ? iwMosaic(W, H, l.cx * W, l.cy * H, st.w, st.h, l.gap, l.rot) : [{x:l.cx * W, y:l.cy * H}];
      for(const p of pts){ gx.save(); gx.translate(p.x * kk, p.y * kk); gx.rotate(-l.rot * IWR); gx.globalAlpha = l.opacity / 100; gx.drawImage(st.canvas, -st.w * kk / 2, -st.h * kk / 2, st.w * kk, st.h * kk); gx.restore(); }
    }
    const s = layer(); if(withSel && s){ const st = stampOf(s, kk, W), hw = st.w * kk / 2, hh = st.h * kk / 2; gx.save(); gx.translate(s.cx * img.width, s.cy * img.height); gx.rotate(-s.rot * IWR); gx.strokeStyle = "#ffb020"; gx.lineWidth = 2; gx.setLineDash([6, 4]); gx.strokeRect(-hw, -hh, 2 * hw, 2 * hh); gx.setLineDash([]); gx.fillStyle = "#fff"; for(const [sx, sy] of [[-1,-1],[1,-1],[-1,1],[1,1]]){ gx.fillRect(sx * hw - 6, sy * hh - 6, 12, 12); gx.strokeRect(sx * hw - 6, sy * hh - 6, 12, 12); } gx.beginPath(); gx.moveTo(0, -hh); gx.lineTo(0, -hh - 28); gx.stroke(); gx.beginPath(); gx.arc(0, -hh - 28, 7, 0, 7); gx.fill(); gx.stroke(); gx.restore(); }
  }
  function draw(){ g.drawImage(small, 0, 0); paint(g, small, k, true); }
  const snap = () => { hist.push(JSON.stringify(layers)); if(hist.length > 80) hist.shift(); };
  function chips(){ const box = $("chips"); box.innerHTML = ""; $("none").hidden = layers.length > 0; $("ctl").hidden = !layer(); layers.forEach(l => { const d = document.createElement("div"); d.className = "wm-chip" + (l.id === sel ? " on" : ""); d.tabIndex = 0; d.setAttribute("role", "button"); d.textContent = l.type === "text" ? "T  " + (l.text || "(empty)") : "▣  Logo"; d.onclick = () => { sel = l.id; chips(); sync(); draw(); }; d.onkeydown = e => { if(e.key === "Enter") d.click(); }; box.appendChild(d); }); }
  function sync(){
    const l = layer(); if(!l) return; const t = l.type === "text"; document.querySelectorAll(".t-only").forEach(x => x.hidden = !t); document.querySelectorAll(".i-only").forEach(x => x.hidden = t);
    if(t){ $("tx").value = l.text; $("fn").value = l.font; $("bd").checked = l.bold; $("it").checked = l.italic; $("cl").value = l.color; $("ol").checked = l.outline; $("oc").value = l.oc; $("sd").checked = !!l.shadow; $("wr").value = l.wrap || 0; $("wrv").textContent = l.wrap ? l.wrap + "% wide" : "off"; } else $("wt").checked = !!l.white;
    $("sz").min = t ? 1 : 5; $("sz").max = t ? 60 : 100; $("sz").value = t ? l.size : Math.round(l.wf * 100); $("szl").textContent = t ? "Size " : "Width "; $("szv").textContent = (t ? l.size : Math.round(l.wf * 100)) + "%";
    $("op").value = l.opacity; $("opv").textContent = l.opacity + "%"; $("rt").value = Math.round(l.rot); $("rtv").textContent = Math.round(l.rot) + "°"; $("mo").checked = l.mosaic; $("gp").value = l.gap; $("gpv").textContent = l.gap + "%"; $("gp").disabled = !l.mosaic;
  }
  const base0 = () => ({id:++uid, rot:0, cx:.5, cy:.5, opacity:60, mosaic:false, gap:60});
  $("addT").onclick = () => { layers.push({...base0(), type:"text", text:"© My Name", font:"sans", bold:true, italic:false, color:"#ffffff", outline:false, oc:"#000000", shadow:true, size:8, opacity:70}); sel = uid; snap(); chips(); sync(); draw(); };
  $("addL").onclick = () => $("lf").click();
  $("lf").onchange = async e => { const f = e.target.files[0]; e.target.value = ""; if(!f) return; try{ const o = await IL.load(f), cl = document.createElement("canvas"); cl.width = o.width; cl.height = o.height; const x = cl.getContext("2d", {willReadFrequently:true}); x.drawImage(o, 0, 0); const im = x.getImageData(0, 0, cl.width, cl.height), d = im.data; for(let i = 0; i < d.length; i += 4){ const lum = (d[i] + d[i + 1] + d[i + 2]) / 3; d[i + 3] = Math.min(255, Math.max(0, (255 - lum) * 3)) * (d[i + 3] / 255); } x.putImageData(im, 0, 0); const l = {...base0(), type:"image", wf:.25, white:false, opacity:70}; srcs[l.id] = {orig:o, clear:cl}; layers.push(l); sel = l.id; snap(); chips(); sync(); draw(); }catch(err){} };
  const live = (id, fn) => { $(id).oninput = () => { const l = layer(); if(!l) return; fn(l, $(id)); sync(); draw(); }; $(id).onchange = () => { snap(); chips(); }; };
  live("tx", (l, e) => { l.text = e.value; }); live("fn", (l, e) => { l.font = e.value; }); live("cl", (l, e) => { l.color = e.value; }); live("oc", (l, e) => { l.oc = e.value; }); live("sz", (l, e) => { if(l.type === "text") l.size = +e.value; else l.wf = +e.value / 100; }); live("wr", (l, e) => { l.wrap = +e.value; }); live("op", (l, e) => { l.opacity = +e.value; }); live("rt", (l, e) => { l.rot = +e.value; }); live("gp", (l, e) => { l.gap = +e.value; });
  [["bd", "bold"], ["it", "italic"], ["ol", "outline"], ["sd", "shadow"], ["mo", "mosaic"], ["wt", "white"]].forEach(([id, key]) => $(id).onchange = () => { const l = layer(); if(!l) return; l[key] = $(id).checked; snap(); sync(); draw(); });
  $("qt").onchange = () => { const l = layer(); if(!l || !$("qt").value) return; l.text = $("qt").value === "__date" ? new Date().toLocaleDateString(undefined, {year:"numeric", month:"long", day:"numeric"}) : $("qt").value; $("qt").value = ""; snap(); chips(); sync(); draw(); };
  for(let r = 0; r < 3; r++) for(let c = 0; c < 3; c++){ const b = document.createElement("button"); b.type = "button"; b.setAttribute("aria-label", "Position " + (r * 3 + c + 1)); b.onclick = () => { const l = layer(); if(!l) return; l.cx = [.14, .5, .86][c]; l.cy = [.08, .5, .92][r]; snap(); draw(); }; $("pos").appendChild(b); }
  $("dup").onclick = () => { const l = layer(); if(!l) return; const c = {...l, id:++uid, cx:clamp(l.cx + .04, 0, 1), cy:clamp(l.cy + .04, 0, 1)}; if(srcs[l.id]) srcs[c.id] = srcs[l.id]; layers.push(c); sel = c.id; snap(); chips(); sync(); draw(); };
  $("del").onclick = () => { layers = layers.filter(l => l.id !== sel); sel = null; snap(); chips(); draw(); };
  $("undo").onclick = () => { if(hist.length < 2) return; hist.pop(); layers = JSON.parse(hist[hist.length - 1]); if(!layer()) sel = null; chips(); sync(); draw(); };
  const pt = e => { const r = cv.getBoundingClientRect(); return {x:(e.clientX - r.left) * cv.width / r.width, y:(e.clientY - r.top) * cv.height / r.height}; };
  const box = l => { const st = stampOf(l, k, small.width / k); return {w:st.w * k, h:st.h * k}; };
  const local = (l, p) => iwLocal(p.x - l.cx * cv.width, p.y - l.cy * cv.height, l.rot);
  cv.onpointerdown = e => {
    cv.focus(); const p = pt(e); let l = layer(), m = null;
    if(l){ const b = box(l), [lx, ly] = local(l, p), hw = b.w / 2, hh = b.h / 2; if(Math.abs(lx) < 14 && Math.abs(ly + hh + 28) < 14) m = {t:"rot"}; else if([[-1,-1],[1,-1],[-1,1],[1,1]].some(([sx, sy]) => Math.abs(lx - sx * hw) < 14 && Math.abs(ly - sy * hh) < 14)) m = {t:"size", d0:Math.hypot(lx, ly) || 1, v0:l.type === "text" ? l.size : l.wf}; }
    if(!m){ l = null; for(let i = layers.length - 1; i >= 0; i--){ const q = layers[i], b = box(q), [lx, ly] = local(q, p); if(Math.abs(lx) <= b.w / 2 && Math.abs(ly) <= b.h / 2){ l = q; break; } } if(!l){ sel = null; chips(); draw(); return; } sel = l.id; chips(); sync(); m = {t:"move", p0:p, cx0:l.cx, cy0:l.cy}; }
    mode = m; cv.setPointerCapture(e.pointerId); draw();
  };
  cv.onpointermove = e => {
    if(!mode) return; const l = layer(), p = pt(e); if(!l) return;
    if(mode.t === "move"){ l.cx = clamp(mode.cx0 + (p.x - mode.p0.x) / cv.width, 0, 1); l.cy = clamp(mode.cy0 + (p.y - mode.p0.y) / cv.height, 0, 1); }
    else if(mode.t === "size"){ const [lx, ly] = local(l, p), s = Math.hypot(lx, ly) / mode.d0; if(l.type === "text") l.size = clamp(Math.round(mode.v0 * s * 2) / 2, 1, 60); else l.wf = clamp(mode.v0 * s, .05, 1); }
    else{ let a = Math.atan2(-(p.y - l.cy * cv.height), p.x - l.cx * cv.width) / IWR - 90; if(a < -180) a += 360; if(e.shiftKey) a = Math.round(a / 15) * 15; if(Math.abs(a) < 3) a = 0; l.rot = Math.round(a); }
    sync(); draw();
  };
  cv.onpointerup = cv.onpointercancel = () => { if(mode){ mode = null; snap(); } };
  cv.onkeydown = e => { const l = layer(); if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z"){ e.preventDefault(); $("undo").click(); return; } if(!l) return; const st = e.shiftKey ? .01 : .002;
    if(e.key === "ArrowLeft") l.cx = clamp(l.cx - st, 0, 1); else if(e.key === "ArrowRight") l.cx = clamp(l.cx + st, 0, 1); else if(e.key === "ArrowUp") l.cy = clamp(l.cy - st, 0, 1); else if(e.key === "ArrowDown") l.cy = clamp(l.cy + st, 0, 1); else if(e.key === "Delete" || e.key === "Backspace"){ $("del").click(); e.preventDefault(); return; } else return; e.preventDefault(); draw(); };
  /* ---- open a picture or a template ---- */
  let pendingCaption = false;
  const defaultLayers = () => {
    const mk = (text, cy, extra) => ({type:"text", text, cy, font:"display", bold:false, italic:false, color:"#ffffff", outline:true, oc:"#000000", shadow:false, size:11, opacity:100, fit:true, ...extra});
    return pmode === "meme" ? [mk("TOP TEXT", .1), mk("BOTTOM TEXT", .9)] : pmode === "text" ? [mk("Your text", .5, {font:"sans", bold:true, outline:false, shadow:true, size:9, fit:false})] : [];
  };
  function openImage(c, label, makeLayers){
    src = c; const sc0 = Math.min(1, 900 / src.width); small = sc0 < 1 ? IL.resize(src, src.width * sc0, src.height * sc0) : src; k = small.width / src.width; cv.width = small.width; cv.height = small.height; layers = []; sel = null; hist = ["[]"];
    $("info").className = "hint"; $("info").textContent = label; $("ed").hidden = false; $("out").hidden = true;
    (makeLayers ? makeLayers() : defaultLayers()).forEach(l => layers.push({...base0(), ...l})); if(layers.length) sel = layers[0].id; snap(); chips(); sync(); draw();
  }
  const withCaptionBar = c => { const band = Math.round(c.width * .26), o = document.createElement("canvas"); o.width = c.width; o.height = c.height + band; const g = o.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, o.width, o.height); g.drawImage(c, 0, band); return {c:o, cy:band / 2 / o.height}; };
  $("f").onchange = async e => {
    const file = e.target.files[0]; $("ed").hidden = true; $("out").hidden = true; if(!file){ pendingCaption = false; return; } name = IL.base(file.name); $("info").className = "hint"; $("info").textContent = "Loading...";
    try{
      const c = await IL.load(file), label = file.name + " (" + c.width + " x " + c.height + " px)";
      if(pendingCaption){ pendingCaption = false; const w = withCaptionBar(c); openImage(w.c, label, () => [slot("Type your caption here", .5, w.cy, {wrap:92, size:5.2, color:"#111111"})]); }
      else{ openImage(c, label); if($("sv") && $("sv").checked) mineAdd(c, name); }
    }catch(err){ $("info").className = "hint err"; $("info").textContent = "Could not read this image. Try JPG, PNG or WebP."; }
  };
  /* ---- template gallery (Meme Maker only) ---- */
  const MKEY = "tq_meme_templates_v1";
  const mineLoad = () => { try{ return JSON.parse(localStorage.getItem(MKEY) || "[]"); }catch(e){ return []; } };
  const mineStore = list => { while(true){ try{ localStorage.setItem(MKEY, JSON.stringify(list)); return true; }catch(e){ if(!list.length) return false; list.pop(); } } };
  function mineAdd(c, nm){ const sc0 = Math.min(1, 800 / Math.max(c.width, c.height)), t = sc0 < 1 ? IL.resize(c, c.width * sc0, c.height * sc0) : c, list = mineLoad(); list.unshift({id:Date.now() + "" + Math.floor(Math.random() * 1e6), name:nm.slice(0, 30), url:IL.flatten(t, "#ffffff").toDataURL("image/jpeg", .82)}); const ok = mineStore(list.slice(0, 20)); mineRender(); return ok; }
  function tile(inner, label){ const d = document.createElement("div"); d.className = "mt-i"; d.tabIndex = 0; d.setAttribute("role", "button"); d.appendChild(inner); const sp = document.createElement("span"); sp.textContent = label; d.appendChild(sp); d.onkeydown = e => { if(e.key === "Enter") d.click(); }; return d; }
  function mineRender(){
    const box = $("mine"); if(!box) return; const list = mineLoad(); box.innerHTML = ""; $("mnote").textContent = list.length ? list.length + " saved in this browser. Click one to use it." : "Nothing saved yet. Import your own template pictures, or tick the save box when you choose a picture.";
    list.forEach(it => { const im = new Image(); im.alt = ""; im.src = it.url; const d = tile(im, it.name), x = document.createElement("div"); x.className = "mt-x"; x.textContent = "✕"; x.title = "Remove"; x.onclick = ev => { ev.stopPropagation(); mineStore(mineLoad().filter(q => q.id !== it.id)); mineRender(); }; d.appendChild(x);
      d.onclick = () => { const i2 = new Image(); i2.onload = () => { const c = document.createElement("canvas"); c.width = i2.naturalWidth; c.height = i2.naturalHeight; c.getContext("2d").drawImage(i2, 0, 0); name = "meme"; openImage(c, "My template: " + it.name); $("ed").scrollIntoView({behavior:"smooth"}); }; i2.src = it.url; }; box.appendChild(d); });
  }
  if(pmode === "meme"){
    root.insertAdjacentHTML("afterbegin", '<div class="card"><label>Start with a template</label><p class="hint" style="margin:0 0 8px">Pick a ready layout and type your own words. Add pictures to the panels with + Logo or image.</p><div id="tg" class="mt-grid"></div>' +
      '<label style="margin-top:16px">My templates</label><p id="mnote" class="hint" style="margin:0 0 8px"></p><div id="mine" class="mt-grid"></div><div class="row" style="margin-top:10px"><div><button id="imp" type="button" class="alt">Import my own template pictures</button><input id="mf" type="file" accept="image/*" multiple hidden></div></div>' +
      '<p class="hint">Your templates are saved only in this browser, on your own device. Nothing is uploaded.</p></div>');
    $("f").insertAdjacentHTML("afterend", '<label style="display:flex;gap:8px;align-items:center;font-weight:600;margin:10px 0 0"><input id="sv" type="checkbox"> Also save this picture in My templates</label>');
    const tg = $("tg"), th = c => { const t = document.createElement("canvas"); t.width = 160; t.height = 96; const g = t.getContext("2d"), r = Math.min(160 / c.width, 96 / c.height); g.fillStyle = "#fff"; g.fillRect(0, 0, 160, 96); g.drawImage(c, (160 - c.width * r) / 2, (96 - c.height * r) / 2, c.width * r, c.height * r); return t; };
    const own = document.createElement("canvas"); own.width = 160; own.height = 96; { const g = own.getContext("2d"); g.fillStyle = "#e8eef3"; g.fillRect(0, 0, 160, 96); g.fillStyle = "#9db3c6"; g.fillRect(36, 14, 88, 68); g.fillStyle = "#fff"; g.font = "bold 13px sans-serif"; g.textAlign = "center"; g.fillText("TOP TEXT", 80, 32); g.fillText("BOTTOM TEXT", 80, 76); }
    const cap = document.createElement("canvas"); cap.width = 160; cap.height = 96; { const g = cap.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, 160, 96); g.fillStyle = "#58697d"; g.fillRect(8, 8, 144, 7); g.fillRect(8, 20, 100, 7); g.fillStyle = "#9db3c6"; g.fillRect(8, 36, 144, 52); }
    const t0 = tile(own, "Your own picture"); t0.onclick = () => { pendingCaption = false; $("f").click(); }; tg.appendChild(t0);
    const t1 = tile(cap, "Caption on top"); t1.onclick = () => { pendingCaption = true; $("f").click(); }; tg.appendChild(t1);
    for(const key of Object.keys(MEME_TPL)){ const T = MEME_TPL[key], t = tile(th(T.build()), T.name); t.onclick = () => { name = "meme"; openImage(T.build(), "Template: " + T.name + ". Type your own words, and add pictures with + Logo or image.", T.layers); $("ed").scrollIntoView({behavior:"smooth"}); }; tg.appendChild(t); }
    $("imp").onclick = () => $("mf").click();
    $("mf").onchange = async e => { let n = 0; for(const f of e.target.files){ try{ if(mineAdd(await IL.load(f), IL.base(f.name))) n++; }catch(err){} } e.target.value = ""; $("mnote").textContent = n ? n + " template(s) saved. Click one to use it." : "Could not save them. Your browser storage may be full or turned off."; };
    mineRender();
  }
  $("go").onclick = async () => {
    const use = layers.filter(l => l.type === "image" || l.text.trim()); if(!use.length) return; const fmt = $("of").value, out = document.createElement("canvas"); out.width = src.width; out.height = src.height; const o = out.getContext("2d");
    if(fmt === "jpg"){ o.fillStyle = "#fff"; o.fillRect(0, 0, out.width, out.height); } o.drawImage(src, 0, 0); const keep = sel; sel = null; paint(o, out, 1, false); sel = keep;
    const blob = await IL.blob(out, IL.typeOf(fmt), .93); IL.show(blob, name + (pmode === "meme" ? "_meme." : pmode === "text" ? "_text." : "_watermarked.") + fmt, "Saved: " + out.width + " x " + out.height + " px (" + PL.sz(blob.size) + ")", "");
  };
  return IL.cleanup;
}
mountImageWatermark(document.getElementById("tool"));
