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
/* END CORE */

function mountImageWatermark(root){
  root.innerHTML = `<style>
  .wm-chips{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px}.wm-chip{padding:6px 12px;border:1px solid var(--line);border-radius:999px;background:var(--surface2);cursor:pointer;font-weight:600;font-size:.9rem;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.wm-chip.on{background:var(--acc);color:var(--accink);border-color:var(--acc)}
  .wm-g{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-top:16px}.wm-g label{font-weight:600;font-size:.9rem;margin-bottom:4px;display:flex;justify-content:space-between}
  .wm-g input[type=color]{width:100%;height:38px;padding:2px;border:1px solid var(--line);border-radius:8px;background:var(--surface2)}.wm-g .ck{display:flex;gap:8px;align-items:center;font-weight:600;font-size:.95rem}
  .wm-pos{display:grid;grid-template-columns:repeat(3,28px);gap:4px}.card .wm-pos button{padding:0;height:28px;border-radius:6px}
  .wm-vp{border:1px solid var(--line);border-radius:12px;background:var(--surface2);padding:10px;margin-bottom:12px;text-align:center}.wm-vp canvas{display:block;margin:0 auto;max-width:100%;height:auto;box-shadow:0 2px 14px rgba(0,0,0,.35);touch-action:none;outline:none}
  .card button.danger{background:transparent;color:#d64545;border:1px solid #d64545}
  </style>
  <div class="card"><label for="f">1. Choose an image</label><input id="f" type="file" accept="image/*"><p id="info" class="hint">No image chosen.</p></div>
  <div id="ed" hidden>
    <div class="card"><label>2. Add watermarks</label>
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
  let src = null, small = null, name = "image", layers = [], sel = null, uid = 0, hist = ["[]"], mode = null, k = 1; const srcs = {}, stamps = {};
  const cv = $("cv"), g = cv.getContext("2d"), clamp = (v, a, b) => Math.max(a, Math.min(b, v)), layer = () => layers.find(l => l.id === sel) || null;
  const imgSrc = l => { const s = srcs[l.id]; return s ? (l.white ? s.clear : s.orig) : null; };
  function stampOf(l, kk, W){
    const key = [l.type, l.text, l.font, l.bold, l.italic, l.color, l.outline, l.oc, l.shadow, l.size, l.wf, l.white, kk.toFixed(4)].join("|"); if(stamps[l.id] && stamps[l.id].key === key) return stamps[l.id].st; let st;
    if(l.type === "text"){
      let p = l.size / 100 * W * kk, scl = 1; const fnt = q => (l.italic ? "italic " : "") + (l.bold ? "bold " : "") + q + "px " + IW_FONTS[l.font], m = document.createElement("canvas").getContext("2d"); m.font = fnt(p); let tw = m.measureText(l.text || " ").width;
      if(tw + p * .6 > 7000){ scl = 7000 / (tw + p * .6); p *= scl; m.font = fnt(p); tw = m.measureText(l.text || " ").width; }
      const ow = l.outline ? Math.max(1, p * .05) : 0, sh = l.shadow ? p * .08 : 0, pad = Math.ceil(p * .12 + ow + sh * 2), asc = p * .85, desc = p * .3, c = document.createElement("canvas"); c.width = Math.max(2, Math.ceil(tw + 2 * pad)); c.height = Math.max(2, Math.ceil(asc + desc + 2 * pad));
      const x = c.getContext("2d"); x.font = fnt(p); x.textBaseline = "alphabetic"; x.lineJoin = "round"; if(l.shadow){ x.shadowColor = "rgba(0,0,0,.55)"; x.shadowBlur = sh * 2; x.shadowOffsetX = sh * .6; x.shadowOffsetY = sh * .6; }
      if(l.outline){ x.lineWidth = ow * 2; x.strokeStyle = l.oc; x.strokeText(l.text, pad, pad + asc); } x.fillStyle = l.color; x.fillText(l.text, pad, pad + asc); st = {canvas:c, w:c.width / (kk * scl), h:c.height / (kk * scl)};
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
    if(t){ $("tx").value = l.text; $("fn").value = l.font; $("bd").checked = l.bold; $("it").checked = l.italic; $("cl").value = l.color; $("ol").checked = l.outline; $("oc").value = l.oc; $("sd").checked = !!l.shadow; } else $("wt").checked = !!l.white;
    $("sz").min = t ? 1 : 5; $("sz").max = t ? 60 : 100; $("sz").value = t ? l.size : Math.round(l.wf * 100); $("szl").textContent = t ? "Size " : "Width "; $("szv").textContent = (t ? l.size : Math.round(l.wf * 100)) + "%";
    $("op").value = l.opacity; $("opv").textContent = l.opacity + "%"; $("rt").value = Math.round(l.rot); $("rtv").textContent = Math.round(l.rot) + "°"; $("mo").checked = l.mosaic; $("gp").value = l.gap; $("gpv").textContent = l.gap + "%"; $("gp").disabled = !l.mosaic;
  }
  const base0 = () => ({id:++uid, rot:0, cx:.5, cy:.5, opacity:60, mosaic:false, gap:60});
  $("addT").onclick = () => { layers.push({...base0(), type:"text", text:"© My Name", font:"sans", bold:true, italic:false, color:"#ffffff", outline:false, oc:"#000000", shadow:true, size:8, opacity:70}); sel = uid; snap(); chips(); sync(); draw(); };
  $("addL").onclick = () => $("lf").click();
  $("lf").onchange = async e => { const f = e.target.files[0]; e.target.value = ""; if(!f) return; try{ const o = await IL.load(f), cl = document.createElement("canvas"); cl.width = o.width; cl.height = o.height; const x = cl.getContext("2d", {willReadFrequently:true}); x.drawImage(o, 0, 0); const im = x.getImageData(0, 0, cl.width, cl.height), d = im.data; for(let i = 0; i < d.length; i += 4){ const lum = (d[i] + d[i + 1] + d[i + 2]) / 3; d[i + 3] = Math.min(255, Math.max(0, (255 - lum) * 3)) * (d[i + 3] / 255); } x.putImageData(im, 0, 0); const l = {...base0(), type:"image", wf:.25, white:false, opacity:70}; srcs[l.id] = {orig:o, clear:cl}; layers.push(l); sel = l.id; snap(); chips(); sync(); draw(); }catch(err){} };
  const live = (id, fn) => { $(id).oninput = () => { const l = layer(); if(!l) return; fn(l, $(id)); sync(); draw(); }; $(id).onchange = () => { snap(); chips(); }; };
  live("tx", (l, e) => { l.text = e.value; }); live("fn", (l, e) => { l.font = e.value; }); live("cl", (l, e) => { l.color = e.value; }); live("oc", (l, e) => { l.oc = e.value; }); live("sz", (l, e) => { if(l.type === "text") l.size = +e.value; else l.wf = +e.value / 100; }); live("op", (l, e) => { l.opacity = +e.value; }); live("rt", (l, e) => { l.rot = +e.value; }); live("gp", (l, e) => { l.gap = +e.value; });
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
  $("f").onchange = async e => {
    const file = e.target.files[0]; $("ed").hidden = true; $("out").hidden = true; if(!file) return; name = IL.base(file.name); $("info").className = "hint"; $("info").textContent = "Loading...";
    try{ src = await IL.load(file); const s = Math.min(1, 900 / src.width); small = s < 1 ? IL.resize(src, src.width * s, src.height * s) : src; k = small.width / src.width; cv.width = small.width; cv.height = small.height; layers = []; sel = null; hist = ["[]"]; $("info").textContent = file.name + " (" + src.width + " x " + src.height + " px)"; $("ed").hidden = false; chips(); draw(); }
    catch(err){ $("info").className = "hint err"; $("info").textContent = "Could not read this image. Try JPG, PNG or WebP."; }
  };
  $("go").onclick = async () => {
    const use = layers.filter(l => l.type === "image" || l.text.trim()); if(!use.length) return; const fmt = $("of").value, out = document.createElement("canvas"); out.width = src.width; out.height = src.height; const o = out.getContext("2d");
    if(fmt === "jpg"){ o.fillStyle = "#fff"; o.fillRect(0, 0, out.width, out.height); } o.drawImage(src, 0, 0); const keep = sel; sel = null; paint(o, out, 1, false); sel = keep;
    const blob = await IL.blob(out, IL.typeOf(fmt), .93); IL.show(blob, name + "_watermarked." + fmt, "Saved: " + out.width + " x " + out.height + " px (" + PL.sz(blob.size) + ")", "");
  };
  return IL.cleanup;
}
mountImageWatermark(document.getElementById("tool"));
