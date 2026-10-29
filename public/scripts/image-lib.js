/* Shared helpers for the image tools (uses PL from pdf-common.js for zip, download and sizes). */
const IL = {
  url: null, urls: [],
  async load(file){
    let src;
    try{ src = await createImageBitmap(file); }
    catch(e){ src = await new Promise((ok, no) => { const u = URL.createObjectURL(file), im = new Image(); im.onload = () => { if(!im.naturalWidth){ im.width = 1024; im.height = 1024; } ok(im); }; im.onerror = no; im.src = u; }); }
    const w = src.width || src.naturalWidth, h = src.height || src.naturalHeight, s = Math.min(1, 6000 / Math.max(w, h)), c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(w * s)); c.height = Math.max(1, Math.round(h * s)); c.getContext("2d").drawImage(src, 0, 0, c.width, c.height); if(src.close) src.close(); return c;
  },
  blob: (c, type, q) => new Promise(r => c.toBlob(r, type, q)),
  extOf: t => t === "image/png" ? "png" : t === "image/webp" ? "webp" : "jpg",
  typeOf: v => v === "png" ? "image/png" : v === "webp" ? "image/webp" : "image/jpeg",
  base: n => n.replace(/\.[^.]+$/, ""),
  flatten(c, color){ const o = document.createElement("canvas"); o.width = c.width; o.height = c.height; const g = o.getContext("2d"); g.fillStyle = color || "#ffffff"; g.fillRect(0, 0, o.width, o.height); g.drawImage(c, 0, 0); return o; },
  /* high quality resize: shrinks in steps so the result stays sharp */
  resize(c, w, h){
    w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h)); let cur = c;
    while(cur.width / 2 >= w && cur.height / 2 >= h){ const t = document.createElement("canvas"); t.width = Math.round(cur.width / 2); t.height = Math.round(cur.height / 2); const g = t.getContext("2d"); g.imageSmoothingQuality = "high"; g.drawImage(cur, 0, 0, t.width, t.height); cur = t; }
    const o = document.createElement("canvas"); o.width = w; o.height = h; const g = o.getContext("2d"); g.imageSmoothingQuality = "high"; g.drawImage(cur, 0, 0, w, h); return o;
  },
  /* make the file smaller than target bytes: lower the quality first, then the size */
  async fitToSize(c, type, target){
    if(type === "image/png") type = "image/jpeg"; let scale = 1;
    for(let round = 0; round < 14; round++){
      const w = Math.max(1, Math.round(c.width * scale)), h = Math.max(1, Math.round(c.height * scale)), t = scale === 1 ? c : IL.resize(c, w, h), f = IL.flatten(t, "#ffffff");
      let b = await IL.blob(f, type, .95); if(b.size <= target) return {blob:b, w, h, q:.95, type};
      let lo = .4, lb = await IL.blob(f, type, lo); if(lb.size > target){ scale *= Math.max(.5, Math.min(.92, Math.sqrt(target / lb.size) * .97)); if(scale < .03) break; continue; }
      let hi = .95, best = lb; for(let i = 0; i < 7; i++){ const mid = (lo + hi) / 2, x = await IL.blob(f, type, mid); if(x.size <= target){ best = x; lo = mid; } else hi = mid; }
      return {blob:best, w, h, q:lo, type};
    }
    return null;
  },
  resultCard: `<div class="card" id="out" hidden><p id="res" style="font-size:1.1rem;font-weight:700;margin:0 0 4px"></p><p id="resd" class="hint" style="margin:0 0 12px"></p>
    <div style="background:repeating-conic-gradient(#ddd 0 25%,#fff 0 50%) 0 0/16px 16px;border:1px solid var(--line);border-radius:10px;display:inline-block;max-width:100%;margin-bottom:12px"><img id="ri" alt="Result preview" style="max-width:100%;max-height:420px;display:block"></div><br>
    <a id="dl" style="text-decoration:none;display:inline-block;padding:12px 20px;border-radius:12px;background:var(--acc);color:var(--accink);font-weight:700">Download</a></div>`,
  show(blob, fname, text, detail){
    if(IL.url) URL.revokeObjectURL(IL.url); IL.url = URL.createObjectURL(blob); $("ri").src = IL.url; $("dl").href = IL.url; $("dl").download = fname; $("dl").textContent = "Download " + fname;
    $("res").textContent = text; $("resd").textContent = detail || ""; $("out").hidden = false; $("out").scrollIntoView({behavior:"smooth"});
  },
  /* grid of results for batch tools */
  gridCard: `<div class="card" id="outs" hidden><p id="cnt" style="font-weight:700;margin:0 0 10px"></p><div class="row" style="margin-bottom:12px"><div><button id="zip" class="alt" type="button">Download all as ZIP</button></div></div><div id="grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px"></div></div>`,
  addResult(blob, fname, detail){
    const u = URL.createObjectURL(blob); IL.urls.push(u); const d = document.createElement("div");
    d.innerHTML = '<div style="background:repeating-conic-gradient(#ddd 0 25%,#fff 0 50%) 0 0/16px 16px;border:1px solid var(--line);border-radius:8px;overflow:hidden"><img alt="" style="width:100%;display:block"></div><a style="font-weight:700;color:var(--acc);font-size:.9rem" download>Download</a><br><small style="color:var(--mute)"></small>';
    d.querySelector("img").src = u; const a = d.querySelector("a"); a.href = u; a.download = fname; d.querySelector("small").textContent = detail; $("grid").appendChild(d);
  },
  clearResults(){ IL.urls.forEach(u => URL.revokeObjectURL(u)); IL.urls = []; if($("grid")) $("grid").innerHTML = ""; },
  /* a frame (rectangle, circle or rounded square) over a photo that can be dragged and zoomed */
  panZoom(cv, src, o){
    const g = cv.getContext("2d"), V = {w:cv.width, h:cv.height}; let aspect = o.aspect || 1, shape = o.shape || "rect", guide = !!o.guide, st = {z:1, ox:0, oy:0}, frame = {x:0, y:0, w:0, h:0}, base = 1, drag = null;
    const path = (x, y, w, h) => { if(shape === "circle") g.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, 7); else if(shape === "round"){ const r = Math.min(w, h) * .22; g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); } else g.rect(x, y, w, h); };
    function layout(){ const m = 24, w = Math.min(V.w - 2 * m, (V.h - 2 * m) * aspect), h = w / aspect; frame = {x:(V.w - w) / 2, y:(V.h - h) / 2, w, h}; base = Math.max(frame.w / src.width, frame.h / src.height); clamp(); }
    const scale = () => base * st.z;
    function clamp(){ const s = scale(), mx = Math.max(0, (src.width * s - frame.w) / 2), my = Math.max(0, (src.height * s - frame.h) / 2); st.ox = Math.max(-mx, Math.min(mx, st.ox)); st.oy = Math.max(-my, Math.min(my, st.oy)); }
    function draw(){
      g.clearRect(0, 0, V.w, V.h); g.fillStyle = "#cfd8e0"; g.fillRect(0, 0, V.w, V.h); const s = scale(), cx = frame.x + frame.w / 2 + st.ox, cy = frame.y + frame.h / 2 + st.oy; g.drawImage(src, cx - src.width * s / 2, cy - src.height * s / 2, src.width * s, src.height * s);
      g.save(); g.fillStyle = "rgba(8,18,27,.62)"; g.beginPath(); g.rect(0, 0, V.w, V.h); path(frame.x, frame.y, frame.w, frame.h); g.fill("evenodd"); g.restore();
      g.save(); g.strokeStyle = "#ffb020"; g.lineWidth = 2; g.beginPath(); path(frame.x, frame.y, frame.w, frame.h); g.stroke();
      if(guide){ g.setLineDash([6, 5]); g.strokeStyle = "rgba(255,255,255,.9)"; g.beginPath(); g.ellipse(frame.x + frame.w / 2, frame.y + frame.h * .44, frame.w * .3, frame.h * .36, 0, 0, 7); g.stroke(); g.beginPath(); g.moveTo(frame.x + frame.w * .1, frame.y + frame.h * .8); g.lineTo(frame.x + frame.w * .9, frame.y + frame.h * .8); g.stroke(); }
      g.restore();
    }
    const pt = e => { const r = cv.getBoundingClientRect(); return {x:(e.clientX - r.left) * V.w / r.width, y:(e.clientY - r.top) * V.h / r.height}; };
    if(cv.addEventListener){
      cv.addEventListener("pointerdown", e => { drag = {p:pt(e), ox:st.ox, oy:st.oy}; cv.setPointerCapture(e.pointerId); });
      cv.addEventListener("pointermove", e => { if(!drag) return; const p = pt(e); st.ox = drag.ox + p.x - drag.p.x; st.oy = drag.oy + p.y - drag.p.y; clamp(); draw(); });
      cv.addEventListener("pointerup", () => { drag = null; }); cv.addEventListener("pointercancel", () => { drag = null; });
      cv.addEventListener("wheel", e => { e.preventDefault(); api.setZoom(st.z * Math.exp(-e.deltaY * .0015)); }, {passive:false});
    }
    const api = {
      setZoom(z){ st.z = Math.max(1, Math.min(6, z)); clamp(); draw(); if(o.onZoom) o.onZoom(st.z); }, getZoom: () => st.z,
      setAspect(a){ aspect = a; st.ox = st.oy = 0; layout(); draw(); }, setShape(v){ shape = v; draw(); }, setGuide(b){ guide = b; draw(); }, draw, layout, frame: () => frame,
      out(ow, oh){ const s = scale(), sw = frame.w / s, sh = frame.h / s, sx = src.width / 2 - st.ox / s - sw / 2, sy = src.height / 2 - st.oy / s - sh / 2, t = document.createElement("canvas"); t.width = Math.max(1, Math.round(sw)); t.height = Math.max(1, Math.round(sh)); t.getContext("2d").drawImage(src, sx, sy, sw, sh, 0, 0, t.width, t.height); return IL.resize(t, ow, oh); },
    };
    layout(); draw(); return api;
  },
  cleanup(){ IL.clearResults(); if(IL.url) URL.revokeObjectURL(IL.url); IL.url = null; },
};
