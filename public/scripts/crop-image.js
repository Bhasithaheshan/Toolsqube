/* ===================== TOOL: Crop Image ===================== */
const CI_RATIOS = {free:null, "1:1":1, "4:3":4 / 3, "3:2":3 / 2, "16:9":16 / 9, "3:4":3 / 4, "2:3":2 / 3, "9:16":9 / 16, "5:4":5 / 4, "4:5":4 / 5};
function mountCropImage(root){
  root.innerHTML = `
  <div class="card"><label for="f">1. Choose an image</label><input id="f" type="file" accept="image/*"><p id="info" class="hint">No image chosen.</p></div>
  <div class="card" id="set" hidden><label>2. Drag the box to choose what to keep</label>
    <div class="row"><div><label for="rt" style="font-weight:600">Shape of the crop</label><select id="rt"><option value="free">Free (any shape)</option><option value="orig">Same as the image</option><option value="1:1">1:1 (square)</option><option value="4:3">4:3</option><option value="3:2">3:2</option><option value="16:9">16:9 (wide)</option><option value="5:4">5:4</option><option value="4:5">4:5 (Instagram portrait)</option><option value="3:4">3:4</option><option value="2:3">2:3</option><option value="9:16">9:16 (story)</option></select></div>
      <div><label for="of" style="font-weight:600">Save as</label><select id="of"><option value="png">PNG</option><option value="jpg">JPG</option><option value="webp">WebP</option></select></div></div>
    <div style="margin-top:12px;background:var(--surface2);border:1px solid var(--line);border-radius:12px;padding:10px;text-align:center"><canvas id="cv" style="max-width:100%;height:auto;display:block;margin:0 auto;touch-action:none;cursor:crosshair;box-shadow:0 2px 14px rgba(0,0,0,.35)"></canvas></div>
    <p id="dim" class="hint" style="font-weight:600"></p>
    <div class="row" style="margin-top:8px"><div><button id="go">Crop image</button></div></div><div id="status" aria-live="polite"></div></div>${IL.resultCard}`;
  let src = null, name = "image", box = {x:0, y:0, w:1, h:1}, ratio = null, mode = null, ds = 1;
  const cv = $("cv"), g = cv.getContext("2d"), clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function draw(){
    g.drawImage(src, 0, 0, cv.width, cv.height); const b = {x:box.x * ds, y:box.y * ds, w:box.w * ds, h:box.h * ds};
    g.fillStyle = "rgba(0,0,0,.55)"; g.fillRect(0, 0, cv.width, b.y); g.fillRect(0, b.y + b.h, cv.width, cv.height - b.y - b.h); g.fillRect(0, b.y, b.x, b.h); g.fillRect(b.x + b.w, b.y, cv.width - b.x - b.w, b.h);
    g.strokeStyle = "#ffb020"; g.lineWidth = 2; g.strokeRect(b.x, b.y, b.w, b.h); g.strokeStyle = "rgba(255,255,255,.4)"; g.lineWidth = 1; for(let i = 1; i < 3; i++){ g.beginPath(); g.moveTo(b.x + b.w * i / 3, b.y); g.lineTo(b.x + b.w * i / 3, b.y + b.h); g.moveTo(b.x, b.y + b.h * i / 3); g.lineTo(b.x + b.w, b.y + b.h * i / 3); g.stroke(); }
    g.fillStyle = "#fff"; g.strokeStyle = "#ffb020"; const pts = [[b.x, b.y], [b.x + b.w, b.y], [b.x, b.y + b.h], [b.x + b.w, b.y + b.h]]; if(!ratio) pts.push([b.x + b.w / 2, b.y], [b.x + b.w / 2, b.y + b.h], [b.x, b.y + b.h / 2], [b.x + b.w, b.y + b.h / 2]); for(const [x, y] of pts){ g.fillRect(x - 6, y - 6, 12, 12); g.strokeRect(x - 6, y - 6, 12, 12); }
    $("dim").textContent = "Crop size: " + Math.round(box.w) + " x " + Math.round(box.h) + " px";
  }
  function setRatio(v){
    ratio = v === "orig" ? src.width / src.height : CI_RATIOS[v]; if(!ratio){ box = {x:src.width * .1, y:src.height * .1, w:src.width * .8, h:src.height * .8}; }
    else{ let w = Math.min(src.width, src.height * ratio) * .85, h = w / ratio; box = {x:(src.width - w) / 2, y:(src.height - h) / 2, w, h}; } draw();
  }
  $("rt").onchange = () => src && setRatio($("rt").value);
  const pt = e => { const r = cv.getBoundingClientRect(); return {x:(e.clientX - r.left) * cv.width / r.width / ds, y:(e.clientY - r.top) * cv.height / r.height / ds}; };
  cv.onpointerdown = e => {
    const p = pt(e), t = 14 / ds * (cv.width / cv.getBoundingClientRect().width), L = box.x, R = box.x + box.w, T = box.y, B = box.y + box.h, nl = Math.abs(p.x - L) < t, nr = Math.abs(p.x - R) < t, nt = Math.abs(p.y - T) < t, nb = Math.abs(p.y - B) < t, inX = p.x > L - t && p.x < R + t, inY = p.y > T - t && p.y < B + t;
    if(inX && inY && (nl || nr) && (nt || nb)) mode = {t:"corner", ax:nl ? R : L, ay:nt ? B : T};
    else if(!ratio && inX && inY && (nl || nr || nt || nb)) mode = {t:"edge", l:nl, r:nr, tp:nt, b:nb};
    else if(p.x > L && p.x < R && p.y > T && p.y < B) mode = {t:"move", p0:p, b0:{...box}};
    else{ mode = {t:"corner", ax:p.x, ay:p.y}; box = {x:clamp(p.x, 0, src.width), y:clamp(p.y, 0, src.height), w:1, h:1}; }
    cv.setPointerCapture(e.pointerId);
  };
  cv.onpointermove = e => {
    if(!mode) return; const p = pt(e), W = src.width, H = src.height;
    if(mode.t === "move"){ box.x = clamp(mode.b0.x + p.x - mode.p0.x, 0, W - box.w); box.y = clamp(mode.b0.y + p.y - mode.p0.y, 0, H - box.h); }
    else if(mode.t === "edge"){ if(mode.l){ const r = box.x + box.w; box.x = clamp(p.x, 0, r - 8); box.w = r - box.x; } if(mode.r) box.w = clamp(p.x - box.x, 8, W - box.x); if(mode.tp){ const b = box.y + box.h; box.y = clamp(p.y, 0, b - 8); box.h = b - box.y; } if(mode.b) box.h = clamp(p.y - box.y, 8, H - box.y); }
    else{
      const dx = p.x - mode.ax, dy = p.y - mode.ay, sx = dx >= 0 ? 1 : -1, sy = dy >= 0 ? 1 : -1; let w = Math.abs(dx), h = Math.abs(dy);
      const maxW = sx > 0 ? W - mode.ax : mode.ax, maxH = sy > 0 ? H - mode.ay : mode.ay;
      if(ratio){ w = Math.max(w, h * ratio); w = Math.min(w, maxW, maxH * ratio); h = w / ratio; } else { w = Math.min(w, maxW); h = Math.min(h, maxH); }
      box = {x:sx > 0 ? mode.ax : mode.ax - w, y:sy > 0 ? mode.ay : mode.ay - h, w:Math.max(1, w), h:Math.max(1, h)};
    }
    draw();
  };
  cv.onpointerup = cv.onpointercancel = () => { mode = null; };
  $("f").onchange = async e => {
    const file = e.target.files[0]; $("set").hidden = true; $("out").hidden = true; if(!file) return; name = IL.base(file.name); $("info").className = "hint"; $("info").textContent = "Loading...";
    try{ src = await IL.load(file); const w = Math.min(src.width, 900); cv.width = w; cv.height = Math.round(src.height * w / src.width); ds = cv.width / src.width; $("info").textContent = file.name + " (" + src.width + " x " + src.height + " px)"; $("set").hidden = false; $("rt").value = "free"; setRatio("free"); }
    catch(err){ $("info").className = "hint err"; $("info").textContent = "Could not read this image. Try JPG, PNG or WebP."; }
  };
  $("go").onclick = async () => {
    if(!src) return; const w = Math.round(box.w), h = Math.round(box.h), c = document.createElement("canvas"); c.width = w; c.height = h; c.getContext("2d").drawImage(src, box.x, box.y, box.w, box.h, 0, 0, w, h);
    const fmt = $("of").value, t = IL.typeOf(fmt), blob = await IL.blob(fmt === "jpg" ? IL.flatten(c, "#ffffff") : c, t, .93); IL.show(blob, name + "_cropped." + fmt, "Cropped to " + w + " x " + h + " px (" + PL.sz(blob.size) + ")", "");
  };
  return IL.cleanup;
}
mountCropImage(document.getElementById("tool"));
