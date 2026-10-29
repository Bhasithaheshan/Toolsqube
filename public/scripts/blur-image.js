/* ===================== TOOL: Blur or Pixelate Part of an Image ===================== */
/* draw one blurred, pixelated or covered area; r is in fractions of the picture, g draws on a canvas the size of img */
function applyRegion(g, img, r, canFilter){
  const W = img.width, H = img.height, x = r.x * W, y = r.y * H, w = r.w * W, h = r.h * H, s = r.strength / 100; if(w < 1 || h < 1) return;
  g.save(); g.beginPath(); if(r.shape === "ellipse") g.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, 7); else g.rect(x, y, w, h); g.clip();
  if(r.effect === "black"){ g.fillStyle = "#000"; g.fillRect(x, y, w, h); }
  else if(r.effect === "pixel"){
    const bs = Math.max(2, Math.round(Math.max(w, h) * (0.02 + s * 0.12))), t = document.createElement("canvas"); t.width = Math.max(1, Math.ceil(w / bs)); t.height = Math.max(1, Math.ceil(h / bs));
    const tg = t.getContext("2d"); tg.imageSmoothingEnabled = true; tg.drawImage(img, x, y, w, h, 0, 0, t.width, t.height); g.imageSmoothingEnabled = false; g.drawImage(t, 0, 0, t.width, t.height, x, y, t.width * bs, t.height * bs);
  }else{
    const rad = Math.max(2, Math.max(w, h) * (0.01 + s * 0.1));
    if(canFilter){ g.filter = "blur(" + rad + "px)"; g.drawImage(img, 0, 0); g.filter = "none"; }
    else{ const f = Math.max(2, rad * 1.6), t = document.createElement("canvas"); t.width = Math.max(1, Math.ceil(w / f)); t.height = Math.max(1, Math.ceil(h / f)); t.getContext("2d").drawImage(img, x, y, w, h, 0, 0, t.width, t.height); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high"; g.drawImage(t, 0, 0, t.width, t.height, x, y, w, h); }
  }
  g.restore();
}
/* END CORE */

function mountBlurImage(root){
  root.innerHTML = `
  <div class="card"><label for="f">1. Choose an image</label><input id="f" type="file" accept="image/*"><p id="info" class="hint">No image chosen.</p></div>
  <div id="ed" hidden>
    <div class="card"><label>2. Draw over the parts you want to hide</label>
      <div class="row"><div><label for="ef" style="font-weight:600">Effect</label><select id="ef"><option value="blur">Blur</option><option value="pixel">Pixelate</option><option value="black">Black box</option></select></div>
        <div><label for="shp" style="font-weight:600">Shape</label><select id="shp"><option value="rect">Rectangle</option><option value="ellipse">Oval (for faces)</option></select></div>
        <div><label for="st" style="display:flex;justify-content:space-between;font-weight:600">Strength <span id="stv"></span></label><input id="st" type="range" min="5" max="100" step="1" value="60" style="width:100%;accent-color:var(--acc)"></div></div>
      <p class="hint">These settings are used for new areas, and they change the selected area too. Drag on the picture to draw an area. Drag an area to move it, and drag its corner to resize.</p>
      <div class="row" style="margin-top:6px"><div><button id="all" type="button" class="alt">Whole picture</button></div><div><button id="del" type="button" class="alt">Delete selected</button></div><div><button id="undo" type="button" class="alt">↶ Undo</button></div></div>
      <div style="margin-top:12px;background:var(--surface2);border:1px solid var(--line);border-radius:12px;padding:10px;text-align:center"><canvas id="cv" tabindex="0" style="max-width:100%;height:auto;display:block;margin:0 auto;touch-action:none;cursor:crosshair;box-shadow:0 2px 14px rgba(0,0,0,.35);outline:none"></canvas></div></div>
    <div class="card"><div class="row"><div><label for="of" style="font-weight:600">Save as</label><select id="of"><option value="jpg">JPG</option><option value="png">PNG</option><option value="webp">WebP</option></select></div><div style="align-self:end"><button id="go" type="button">Save the image</button></div></div>
      <p class="hint">The hidden parts are changed in the saved picture, so they cannot be brought back.</p></div></div>${IL.resultCard}`;
  let src = null, small = null, name = "image", regs = [], sel = null, uid = 0, hist = ["[]"], mode = null;
  const cv = $("cv"), g = cv.getContext("2d"), clamp = (v, a, b) => Math.max(a, Math.min(b, v)), canFilter = "filter" in g, get = () => regs.find(r => r.id === sel) || null, snap = () => { hist.push(JSON.stringify(regs)); if(hist.length > 80) hist.shift(); };
  function draw(){
    g.clearRect(0, 0, cv.width, cv.height); g.drawImage(small, 0, 0); regs.forEach(r => applyRegion(g, small, r, canFilter)); const s = get();
    if(s){ g.save(); g.strokeStyle = "#ffb020"; g.lineWidth = 2; g.setLineDash([6, 4]); const x = s.x * cv.width, y = s.y * cv.height, w = s.w * cv.width, h = s.h * cv.height; g.strokeRect(x, y, w, h); g.setLineDash([]); g.fillStyle = "#fff"; g.fillRect(x + w - 6, y + h - 6, 12, 12); g.strokeRect(x + w - 6, y + h - 6, 12, 12); g.restore(); }
    $("stv").textContent = $("st").value + "%";
  }
  const pt = e => { const r = cv.getBoundingClientRect(); return {x:(e.clientX - r.left) / r.width, y:(e.clientY - r.top) / r.height}; };
  const hit = (r, p) => { if(r.shape === "ellipse"){ const cx = r.x + r.w / 2, cy = r.y + r.h / 2; return ((p.x - cx) / (r.w / 2)) ** 2 + ((p.y - cy) / (r.h / 2)) ** 2 <= 1; } return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h; };
  cv.onpointerdown = e => {
    cv.focus(); const p = pt(e), s = get(), px = 14 / cv.getBoundingClientRect().width, py = 14 / cv.getBoundingClientRect().height; cv.setPointerCapture(e.pointerId);
    if(s && Math.abs(p.x - (s.x + s.w)) < px && Math.abs(p.y - (s.y + s.h)) < py){ mode = {t:"size"}; return; }
    for(let i = regs.length - 1; i >= 0; i--) if(hit(regs[i], p)){ sel = regs[i].id; syncUI(); mode = {t:"move", p0:p, x0:regs[i].x, y0:regs[i].y}; draw(); return; }
    const r = {id:++uid, shape:$("shp").value, effect:$("ef").value, strength:+$("st").value, x:p.x, y:p.y, w:0, h:0}; regs.push(r); sel = r.id; mode = {t:"new", p0:p}; draw();
  };
  cv.onpointermove = e => {
    if(!mode) return; const p = pt(e), r = get(); if(!r) return;
    if(mode.t === "move"){ r.x = clamp(mode.x0 + p.x - mode.p0.x, 0, 1 - r.w); r.y = clamp(mode.y0 + p.y - mode.p0.y, 0, 1 - r.h); }
    else if(mode.t === "size"){ r.w = clamp(p.x - r.x, .01, 1 - r.x); r.h = clamp(p.y - r.y, .01, 1 - r.y); }
    else{ r.x = Math.min(mode.p0.x, p.x); r.y = Math.min(mode.p0.y, p.y); r.w = Math.abs(p.x - mode.p0.x); r.h = Math.abs(p.y - mode.p0.y); r.x = clamp(r.x, 0, 1); r.y = clamp(r.y, 0, 1); r.w = Math.min(r.w, 1 - r.x); r.h = Math.min(r.h, 1 - r.y); }
    draw();
  };
  cv.onpointerup = cv.onpointercancel = () => { if(!mode) return; const r = get(); if(mode.t === "new" && r && (r.w * cv.width < 6 || r.h * cv.height < 6)){ regs = regs.filter(x => x.id !== r.id); sel = null; } mode = null; snap(); draw(); };
  function syncUI(){ const r = get(); if(r){ $("ef").value = r.effect; $("shp").value = r.shape; $("st").value = r.strength; } }
  const edit = fn => { const r = get(); if(r){ fn(r); } draw(); }; $("ef").onchange = () => { edit(r => { r.effect = $("ef").value; }); snap(); }; $("shp").onchange = () => { edit(r => { r.shape = $("shp").value; }); snap(); }; $("st").oninput = () => edit(r => { r.strength = +$("st").value; }); $("st").onchange = snap;
  $("all").onclick = () => { regs.push({id:++uid, shape:"rect", effect:$("ef").value, strength:+$("st").value, x:0, y:0, w:1, h:1}); sel = uid; snap(); draw(); };
  $("del").onclick = () => { regs = regs.filter(r => r.id !== sel); sel = null; snap(); draw(); }; $("undo").onclick = () => { if(hist.length < 2) return; hist.pop(); regs = JSON.parse(hist[hist.length - 1]); if(!get()) sel = null; draw(); };
  cv.onkeydown = e => { if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z"){ e.preventDefault(); $("undo").click(); } else if(e.key === "Delete" || e.key === "Backspace"){ e.preventDefault(); $("del").click(); } };
  $("f").onchange = async e => {
    const file = e.target.files[0]; $("ed").hidden = true; $("out").hidden = true; if(!file) return; name = IL.base(file.name); $("info").className = "hint"; $("info").textContent = "Loading...";
    try{ src = await IL.load(file); const s = Math.min(1, 900 / src.width); small = s < 1 ? IL.resize(src, src.width * s, src.height * s) : src; cv.width = small.width; cv.height = small.height; regs = []; sel = null; hist = ["[]"]; $("info").textContent = file.name + " (" + src.width + " x " + src.height + " px)"; $("ed").hidden = false; draw(); }
    catch(err){ $("info").className = "hint err"; $("info").textContent = "Could not read this image. Try JPG, PNG or WebP."; }
  };
  $("go").onclick = async () => {
    if(!src) return; const fmt = $("of").value, out = document.createElement("canvas"); out.width = src.width; out.height = src.height; const o = out.getContext("2d"); o.drawImage(src, 0, 0); regs.forEach(r => applyRegion(o, src, r, "filter" in o));
    const blob = await IL.blob(out, IL.typeOf(fmt), .93); IL.show(blob, name + "_hidden." + fmt, "Saved: " + out.width + " x " + out.height + " px (" + PL.sz(blob.size) + ")", regs.length + " area(s) hidden.");
  };
  return IL.cleanup;
}
mountBlurImage(document.getElementById("tool"));
