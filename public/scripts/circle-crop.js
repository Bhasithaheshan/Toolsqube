/* ===================== TOOL: Circle Crop ===================== */
function mountCircleCrop(root){
  root.innerHTML = `${PL.PVCSS}
  <div class="card"><label for="f">1. Choose a photo</label><input id="f" type="file" accept="image/*"><p id="info" class="hint">No image chosen.</p></div>
  <div id="set" class="pv-grid" hidden>
    <div class="card"><label>2. Shape and size</label>
      <div class="row"><div><label for="sh" style="font-weight:600">Shape</label><select id="sh"><option value="circle">Circle</option><option value="round">Rounded square</option><option value="rect">Square</option></select></div><div><label for="os" style="font-weight:600">Size</label><select id="os"><option value="256">256 px</option><option value="512" selected>512 px</option><option value="1024">1024 px</option><option value="original">Largest possible</option></select></div></div>
      <label for="zm" style="display:flex;justify-content:space-between;margin-top:12px">Zoom <span id="zv"></span></label><input id="zm" type="range" min="100" max="500" step="1" value="100" style="width:100%;accent-color:var(--acc)">
      <div class="row" style="margin-top:12px"><div><label for="rw" style="font-weight:600">Ring around it (px)</label><input id="rw" type="number" min="0" max="60" step="1" value="0"></div><div><label for="rc" style="font-weight:600">Ring color</label><input id="rc" type="color" value="#ffffff" style="width:100%;height:38px;padding:2px;border:1px solid var(--line);border-radius:8px;background:var(--surface2)"></div></div>
      <div class="row" style="margin-top:12px"><div><label for="of" style="font-weight:600">Save as</label><select id="of"><option value="png">PNG (see-through corners)</option><option value="webp">WebP (see-through, smaller)</option><option value="jpg">JPG (white corners)</option></select></div></div>
      <p class="hint">Drag the photo to move it, and use Zoom to make the face bigger or smaller.</p>
      <div class="row" style="margin-top:10px"><div><button id="go" type="button">Make it</button></div></div></div>
    <div class="card pv-card"><label>Preview</label><canvas id="vp" width="480" height="480" style="touch-action:none;cursor:grab"></canvas></div></div>${IL.resultCard}`;
  let src = null, pz = null, name = "photo";
  $("zm").oninput = () => { if(pz){ pz.setZoom($("zm").value / 100); $("zv").textContent = $("zm").value + "%"; } };
  $("sh").onchange = () => pz && pz.setShape($("sh").value);
  $("f").onchange = async e => {
    const file = e.target.files[0]; $("set").hidden = true; $("out").hidden = true; if(!file) return; name = IL.base(file.name); $("info").className = "hint"; $("info").textContent = "Loading...";
    try{ src = await IL.load(file); $("set").hidden = false; pz = IL.panZoom($("vp"), src, {aspect:1, shape:$("sh").value, onZoom:z => { $("zm").value = Math.round(z * 100); $("zv").textContent = Math.round(z * 100) + "%"; }}); $("zm").value = 100; $("zv").textContent = "100%"; $("info").textContent = file.name + " (" + src.width + " x " + src.height + " px)"; }
    catch(err){ $("info").className = "hint err"; $("info").textContent = "Could not read this image. Try JPG, PNG or WebP."; }
  };
  $("go").onclick = async () => {
    if(!pz) return; const shape = $("sh").value, fr = pz.frame(), natural = Math.min(src.width, src.height), n = $("os").value === "original" ? Math.round(natural / pz.getZoom()) : +$("os").value, ring = +$("rw").value || 0;
    const sq = pz.out(n, n), c = document.createElement("canvas"); c.width = c.height = n; const g = c.getContext("2d");
    const path = (i) => { const s = n - 2 * i; g.beginPath(); if(shape === "circle") g.ellipse(n / 2, n / 2, s / 2, s / 2, 0, 0, 7); else if(shape === "round"){ const r = s * .22; g.roundRect ? g.roundRect(i, i, s, s, r) : g.rect(i, i, s, s); } else g.rect(i, i, s, s); };
    g.save(); path(0); g.clip(); g.drawImage(sq, 0, 0); g.restore(); if(ring > 0){ g.lineWidth = ring * 2; g.strokeStyle = $("rc").value; g.save(); path(0); g.clip(); path(0); g.stroke(); g.restore(); }
    const fmt = $("of").value, t = IL.typeOf(fmt), blob = await IL.blob(fmt === "jpg" ? IL.flatten(c, "#ffffff") : c, t, .93); IL.show(blob, name + "_" + shape + "." + fmt, "Ready: " + n + " x " + n + " px (" + PL.sz(blob.size) + ")", "");
  };
  return IL.cleanup;
}
mountCircleCrop(document.getElementById("tool"));
