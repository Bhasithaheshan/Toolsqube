/* ===================== TOOL: Make Background Transparent ===================== */
/* d = RGBA pixels (changed in place), key = [r,g,b] to remove, tol and soft in percent, flood = only the part touching the edges */
function removeColor(d, w, h, key, tol, soft, flood){
  const MAXD = 441.67, T = tol / 100 * MAXD, S = Math.max(.0001, soft / 100 * MAXD), dist = i => Math.hypot(d[i] - key[0], d[i + 1] - key[1], d[i + 2] - key[2]);
  if(!flood){ for(let i = 0; i < d.length; i += 4){ const dd = dist(i); if(dd <= T) d[i + 3] = 0; else if(dd < T + S) d[i + 3] = d[i + 3] * ((dd - T) / S); } return; }
  const n = w * h, rem = new Uint8Array(n), st = new Int32Array(n); let sp = 0;
  const tryPush = q => { if(!rem[q] && dist(q * 4) <= T){ rem[q] = 1; st[sp++] = q; } };
  for(let x = 0; x < w; x++){ tryPush(x); tryPush((h - 1) * w + x); } for(let y = 0; y < h; y++){ tryPush(y * w); tryPush(y * w + w - 1); }
  while(sp){ const p = st[--sp], x = p % w, y = (p / w) | 0; if(x > 0) tryPush(p - 1); if(x < w - 1) tryPush(p + 1); if(y > 0) tryPush(p - w); if(y < h - 1) tryPush(p + w); }
  for(let p = 0; p < n; p++){
    if(rem[p]){ d[p * 4 + 3] = 0; continue; } const x = p % w, y = (p / w) | 0;
    if((x > 0 && rem[p - 1]) || (x < w - 1 && rem[p + 1]) || (y > 0 && rem[p - w]) || (y < h - 1 && rem[p + w])){ const dd = dist(p * 4); if(dd < T + S) d[p * 4 + 3] = d[p * 4 + 3] * Math.max(0, (dd - T) / S); }
  }
}
/* END CORE */

function mountRemoveBgColor(root){
  root.innerHTML = `
  <div class="card"><label for="f">1. Choose an image</label><input id="f" type="file" accept="image/*"><p id="info" class="hint">Works best with a plain background, like a white page or a flat color.</p></div>
  <div id="ed" hidden><div class="card"><label>2. Pick the color to remove</label>
    <div class="row" style="align-items:center"><div><span id="sw" style="display:inline-block;width:44px;height:44px;border-radius:10px;border:2px solid var(--line);vertical-align:middle"></span> <b id="hx" style="margin-left:8px;font-family:ui-monospace,Consolas,monospace"></b></div><div><button id="corner" type="button" class="alt">Use the top-left corner</button></div><div><button id="white" type="button" class="alt">Use white</button></div></div>
    <p class="hint">Or click on the picture to pick the color you want to remove.</p>
    <div class="row" style="margin-top:6px"><div><label for="md" style="font-weight:600">What to remove</label><select id="md"><option value="flood">Only the background around the picture</option><option value="all">This color everywhere</option></select></div></div>
    <label for="tl" style="display:flex;justify-content:space-between;margin-top:12px">How close the color must be <span id="tlv"></span></label><input id="tl" type="range" min="1" max="60" step="1" value="12" style="width:100%;accent-color:var(--acc)">
    <label for="sf" style="display:flex;justify-content:space-between;margin-top:12px">Soft edges <span id="sfv"></span></label><input id="sf" type="range" min="0" max="40" step="1" value="8" style="width:100%;accent-color:var(--acc)">
    <label style="display:flex;gap:8px;align-items:center;font-weight:600;margin:12px 0 0"><input id="tr" type="checkbox"> Trim the empty space around the picture</label>
    <div style="margin-top:12px;background:var(--surface2);border:1px solid var(--line);border-radius:12px;padding:10px;text-align:center"><canvas id="pv" style="max-width:100%;max-height:60vh;display:block;margin:0 auto;cursor:crosshair;background:repeating-conic-gradient(#ccc 0 25%,#fff 0 50%) 0 0/16px 16px"></canvas></div>
    <div class="row" style="margin-top:12px"><div><label for="of" style="font-weight:600">Save as</label><select id="of"><option value="png">PNG</option><option value="webp">WebP (smaller)</option></select></div><div style="align-self:end"><button id="go" type="button">Save the image</button></div></div></div></div>${IL.resultCard}`;
  let src = null, small = null, base = null, name = "image", key = [255, 255, 255], raf = 0;
  const hex = k => "#" + k.map(v => Math.round(v).toString(16).padStart(2, "0")).join("");
  const px = (c, x, y) => Array.from(c.getContext("2d").getImageData(Math.max(0, Math.min(c.width - 1, Math.floor(x))), Math.max(0, Math.min(c.height - 1, Math.floor(y))), 1, 1).data).slice(0, 3);
  function render(){
    $("tlv").textContent = $("tl").value + "%"; $("sfv").textContent = $("sf").value + "%"; $("sw").style.background = hex(key); $("hx").textContent = hex(key);
    const p = $("pv"), im = new ImageData(new Uint8ClampedArray(base.data), base.width, base.height); removeColor(im.data, im.width, im.height, key, +$("tl").value, +$("sf").value, $("md").value === "flood"); p.width = im.width; p.height = im.height; p.getContext("2d").putImageData(im, 0, 0);
  }
  const sched = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(render); }; ["tl", "sf", "md"].forEach(k => { $(k).oninput = sched; $(k).onchange = sched; });
  $("pv").onclick = e => { const r = $("pv").getBoundingClientRect(); key = px(small, (e.clientX - r.left) * small.width / r.width, (e.clientY - r.top) * small.height / r.height); render(); };
  $("corner").onclick = () => { key = px(small, 1, 1); render(); }; $("white").onclick = () => { key = [255, 255, 255]; render(); };
  $("f").onchange = async e => {
    const file = e.target.files[0]; $("ed").hidden = true; $("out").hidden = true; if(!file) return; name = IL.base(file.name); $("info").className = "hint"; $("info").textContent = "Loading...";
    try{ src = await IL.load(file); const s = Math.min(1, 900 / Math.max(src.width, src.height)); small = s < 1 ? IL.resize(src, src.width * s, src.height * s) : src; base = small.getContext("2d").getImageData(0, 0, small.width, small.height); key = px(small, 1, 1); $("info").textContent = file.name + " (" + src.width + " x " + src.height + " px)"; $("ed").hidden = false; render(); }
    catch(err){ $("info").className = "hint err"; $("info").textContent = "Could not read this image. Try JPG, PNG or WebP."; }
  };
  $("go").onclick = async () => {
    if(!src) return; $("go").disabled = true; await new Promise(r => setTimeout(r, 20));
    try{
      let c = src; const big = Math.max(src.width, src.height); if(big > 4000) c = IL.resize(src, src.width * 4000 / big, src.height * 4000 / big);
      const g = c.getContext("2d", {willReadFrequently:true}), im = g.getImageData(0, 0, c.width, c.height); removeColor(im.data, im.width, im.height, key, +$("tl").value, +$("sf").value, $("md").value === "flood");
      const o = document.createElement("canvas"); o.width = c.width; o.height = c.height; o.getContext("2d").putImageData(im, 0, 0); let out = o;
      if($("tr").checked){ const d = im.data; let x0 = o.width, x1 = -1, y0 = o.height, y1 = -1; for(let y = 0; y < o.height; y++) for(let x = 0; x < o.width; x++) if(d[(y * o.width + x) * 4 + 3] > 12){ if(x < x0) x0 = x; if(x > x1) x1 = x; if(y < y0) y0 = y; if(y > y1) y1 = y; }
        if(x1 >= 0){ out = document.createElement("canvas"); out.width = x1 - x0 + 1; out.height = y1 - y0 + 1; out.getContext("2d").drawImage(o, x0, y0, out.width, out.height, 0, 0, out.width, out.height); } }
      const fmt = $("of").value, blob = await IL.blob(out, IL.typeOf(fmt), .95); IL.show(blob, name + "_transparent." + fmt, "Done: " + out.width + " x " + out.height + " px (" + PL.sz(blob.size) + ")", "The checkered pattern shows the see-through parts.");
    }catch(err){ $("info").className = "hint err"; $("info").textContent = "Could not process this image."; }
    $("go").disabled = false;
  };
  return IL.cleanup;
}
mountRemoveBgColor(document.getElementById("tool"));
