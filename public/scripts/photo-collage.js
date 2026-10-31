/* ===================== TOOL: Photo Collage Maker ===================== */
const T3 = 1 / 3;
const COLLAGES = {
  "2h":[[0,0,.5,1],[.5,0,.5,1]], "2v":[[0,0,1,.5],[0,.5,1,.5]], "3a":[[0,0,.6,1],[.6,0,.4,.5],[.6,.5,.4,.5]], "3b":[[0,0,1,.6],[0,.6,.5,.4],[.5,.6,.5,.4]], "3c":[[0,0,T3,1],[T3,0,T3,1],[2*T3,0,T3,1]], "3d":[[0,0,1,T3],[0,T3,1,T3],[0,2*T3,1,T3]],
  "4":[[0,0,.5,.5],[.5,0,.5,.5],[0,.5,.5,.5],[.5,.5,.5,.5]], "4a":[[0,0,.6,1],[.6,0,.4,T3],[.6,T3,.4,T3],[.6,2*T3,.4,T3]], "5":[[0,0,1,.5],[0,.5,.25,.5],[.25,.5,.25,.5],[.5,.5,.25,.5],[.75,.5,.25,.5]],
  "6":[[0,0,T3,.5],[T3,0,T3,.5],[2*T3,0,T3,.5],[0,.5,T3,.5],[T3,.5,T3,.5],[2*T3,.5,T3,.5]], "9":Array.from({length:9}, (_, i) => [(i % 3) * T3, Math.floor(i / 3) * T3, T3, T3]),
};
/* END CORE */

function mountPhotoCollage(root){
  root.innerHTML = `<style>
  .pc-t{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}.pc-t button{padding:4px;border-radius:8px;background:var(--surface2);border:2px solid var(--line)}.card .pc-t button{background:var(--surface2)}.card .pc-t button:hover:not(:disabled){background:var(--surface2);border-color:var(--acc)}.card .pc-t button.on{border-color:var(--acc);background:color-mix(in srgb,var(--acc) 18%,var(--surface2))}.pc-t canvas{display:block;border-radius:4px}
  .pc-vp{background:var(--surface2);border:1px solid var(--line);border-radius:12px;padding:10px;text-align:center}.pc-vp canvas{max-width:100%;max-height:70vh;height:auto;display:block;margin:0 auto;box-shadow:0 2px 14px rgba(0,0,0,.35);touch-action:none;cursor:grab}
  .card button.danger{background:transparent;color:#d64545;border:1px solid #d64545}
  </style>
  <div class="card"><label>1. Pick a layout</label><div id="tp" class="pc-t"></div>
    <div class="row" style="margin-top:14px"><div><label for="ar" style="font-weight:600">Shape of the collage</label><select id="ar"><option value="1">Square (1:1)</option><option value="0.8">Portrait (4:5)</option><option value="0.5625">Story (9:16)</option><option value="1.7778">Wide (16:9)</option><option value="1.5">Photo (3:2)</option><option value="0.7071">A4 portrait</option></select></div>
      <div><label for="gp" style="font-weight:600">Gap (px)</label><input id="gp" type="number" min="0" max="80" step="1" value="12"></div><div><label for="rd" style="font-weight:600">Round corners (px)</label><input id="rd" type="number" min="0" max="120" step="1" value="0"></div>
      <div><label for="bg" style="font-weight:600">Background</label><input id="bg" type="color" value="#ffffff" style="width:100%;height:38px;padding:2px;border:1px solid var(--line);border-radius:8px;background:var(--surface2)"></div></div></div>
  <div class="card"><label>2. Add your photos</label><div class="row"><div><button id="add" type="button">Add photos</button><input id="f" type="file" accept="image/*" multiple hidden><input id="one" type="file" accept="image/*" hidden></div><div><button id="clr" type="button" class="danger">Remove all photos</button></div></div>
    <p class="hint">Photos fill the boxes in order. Click a box to select it. Drag the photo inside the box to move it.</p>
    <div id="sl" hidden class="row" style="margin-top:6px;align-items:end"><div><label for="zm" style="display:flex;justify-content:space-between;font-weight:600">Zoom of the selected photo <span id="zv"></span></label><input id="zm" type="range" min="100" max="400" step="1" value="100" style="width:100%;accent-color:var(--acc)"></div>
      <div><label for="sw" style="font-weight:600">Swap with box</label><select id="sw"></select></div><div><button id="rep" type="button" class="alt">Replace photo</button></div><div><button id="rm" type="button" class="danger">Remove photo</button></div></div></div>
  <div class="pc-vp"><canvas id="cv" width="900" height="900"></canvas></div>
  <div class="card" style="margin-top:12px"><div class="row"><div><label for="os" style="font-weight:600">Size</label><select id="os"><option value="1080">1080 px</option><option value="1600">1600 px</option><option value="2400">2400 px</option></select></div><div><label for="of" style="font-weight:600">Save as</label><select id="of"><option value="jpg">JPG</option><option value="png">PNG</option></select></div><div style="align-self:end"><button id="go" type="button">Save the collage</button></div></div></div>${IL.resultCard}`;
  let tpl = "4", slots = [], sel = -1, drag = null;
  const cv = $("cv"), g = cv.getContext("2d"), clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  /* the boxes of the collage in pixels for a canvas of size W x H */
  const boxes = (W, H) => { const gap = +$("gp").value || 0; return COLLAGES[tpl].map(([x, y, w, h]) => ({x:x * W + gap * (x > 0 ? .5 : 1), y:y * H + gap * (y > 0 ? .5 : 1), w:w * W - gap * ((x > 0 ? .5 : 1) + (x + w < .999 ? .5 : 1)), h:h * H - gap * ((y > 0 ? .5 : 1) + (y + h < .999 ? .5 : 1))})); };
  function paint(c, W, H, f, withSel){
    const gx = c.getContext("2d"); gx.fillStyle = $("bg").value; gx.fillRect(0, 0, W, H); const rd = (+$("rd").value || 0) * f;
    COLLAGES[tpl].forEach((_, i) => { const b = boxes(W / f, H / f)[i], x = b.x * f, y = b.y * f, w = b.w * f, h = b.h * f, s = slots[i]; gx.save(); gx.beginPath(); if(gx.roundRect && rd) gx.roundRect(x, y, w, h, rd); else gx.rect(x, y, w, h); gx.clip();
      if(s && s.c){ const k = Math.max(w / s.c.width, h / s.c.height) * s.z, iw = s.c.width * k, ih = s.c.height * k, mx = Math.max(0, (iw - w) / 2), my = Math.max(0, (ih - h) / 2), ox = clamp(s.ox * w, -mx, mx), oy = clamp(s.oy * h, -my, my); gx.drawImage(s.c, x + w / 2 - iw / 2 + ox, y + h / 2 - ih / 2 + oy, iw, ih); }
      else{ gx.fillStyle = "#dfe6ec"; gx.fillRect(x, y, w, h); if(withSel){ gx.fillStyle = "#7a8a99"; gx.font = "bold " + Math.round(Math.min(w, h) / 5) + "px sans-serif"; gx.textAlign = "center"; gx.textBaseline = "middle"; gx.fillText("+", x + w / 2, y + h / 2); } } gx.restore();
      if(withSel && i === sel){ gx.strokeStyle = "#ffb020"; gx.lineWidth = 3; gx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3); } });
  }
  function draw(){ const ar = +$("ar").value, W = 900, H = Math.round(W / ar); cv.width = W; cv.height = H; paint(cv, W, H, 1, true); }
  function icons(){
    const tp = $("tp"); tp.innerHTML = ""; for(const k of Object.keys(COLLAGES)){ const b = document.createElement("button"); b.type = "button"; b.className = k === tpl ? "on" : ""; b.setAttribute("aria-label", "Layout " + k); const c = document.createElement("canvas"); c.width = c.height = 44; const x = c.getContext("2d"); x.fillStyle = "#9db3c6"; COLLAGES[k].forEach(([a, b2, w, h]) => x.fillRect(a * 44 + 1.5, b2 * 44 + 1.5, w * 44 - 3, h * 44 - 3)); b.appendChild(c); b.onclick = () => { tpl = k; while(slots.length < COLLAGES[k].length) slots.push(null); sel = -1; swapList(); icons(); draw(); ui(); }; tp.appendChild(b); }
  }
  function swapList(){ $("sw").innerHTML = '<option value="">Choose...</option>' + COLLAGES[tpl].map((_, i) => i === sel ? "" : '<option value="' + i + '">Box ' + (i + 1) + "</option>").join(""); }
  function ui(){ $("sl").hidden = sel < 0 || !slots[sel]; if(sel >= 0 && slots[sel]){ $("zm").value = Math.round(slots[sel].z * 100); $("zv").textContent = Math.round(slots[sel].z * 100) + "%"; } swapList(); }
  const mk = c => ({c, z:1, ox:0, oy:0});
  async function addFiles(files){ for(const f of files){ if(!f.type.startsWith("image/")) continue; try{ const c = await IL.load(f), n = COLLAGES[tpl].length; let i = 0; while(i < n && slots[i] && slots[i].c) i++; if(i >= n) break; slots[i] = mk(c); }catch(e){} } draw(); ui(); }
  $("add").onclick = () => $("f").click(); $("f").onchange = e => { addFiles([...e.target.files]); e.target.value = ""; };
  $("rep").onclick = () => $("one").click(); $("one").onchange = async e => { const f = e.target.files[0]; e.target.value = ""; if(f && sel >= 0){ try{ slots[sel] = mk(await IL.load(f)); draw(); ui(); }catch(err){} } };
  $("rm").onclick = () => { if(sel >= 0){ slots[sel] = null; draw(); ui(); } }; $("clr").onclick = () => { slots = []; sel = -1; while(slots.length < COLLAGES[tpl].length) slots.push(null); draw(); ui(); };
  $("zm").oninput = () => { if(sel >= 0 && slots[sel]){ slots[sel].z = $("zm").value / 100; $("zv").textContent = $("zm").value + "%"; draw(); } };
  $("sw").onchange = () => { const j = $("sw").value; if(j === "" || sel < 0) return; const t = slots[+j]; slots[+j] = slots[sel]; slots[sel] = t; sel = +j; draw(); ui(); };
  ["ar", "gp", "rd", "bg"].forEach(k => { $(k).oninput = draw; $(k).onchange = draw; });
  const pt = e => { const r = cv.getBoundingClientRect(); return {x:(e.clientX - r.left) * cv.width / r.width, y:(e.clientY - r.top) * cv.height / r.height}; };
  cv.onpointerdown = e => { const p = pt(e), bs = boxes(cv.width, cv.height); const i = bs.findIndex(b => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h); if(i < 0){ sel = -1; draw(); ui(); return; } sel = i; if(!slots[i]){ $("rep").click(); draw(); ui(); return; } drag = {p0:p, ox:slots[i].ox, oy:slots[i].oy, b:bs[i]}; cv.setPointerCapture(e.pointerId); draw(); ui(); };
  cv.onpointermove = e => { if(!drag || sel < 0 || !slots[sel]) return; const p = pt(e); slots[sel].ox = drag.ox + (p.x - drag.p0.x) / drag.b.w; slots[sel].oy = drag.oy + (p.y - drag.p0.y) / drag.b.h; draw(); };
  cv.onpointerup = cv.onpointercancel = () => { drag = null; };
  $("go").onclick = async () => { const ar = +$("ar").value, L = +$("os").value, W = ar >= 1 ? L : Math.round(L * ar), H = ar >= 1 ? Math.round(L / ar) : L, f = W / 900, c = document.createElement("canvas"); c.width = W; c.height = H; paint(c, W, H, f, false); const fmt = $("of").value, blob = await IL.blob(c, IL.typeOf(fmt), .93); IL.show(blob, "collage." + fmt, "Your collage is ready: " + W + " x " + H + " px (" + PL.sz(blob.size) + ")", ""); };
  for(let i = 0; i < 4; i++) slots.push(null); icons(); draw(); ui();
  return IL.cleanup;
}
mountPhotoCollage(document.getElementById("tool"));
