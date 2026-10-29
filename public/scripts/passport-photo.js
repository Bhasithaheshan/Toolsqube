/* ===================== TOOL: Passport / ID Photo Maker ===================== */
const PP_SIZES = {"35x45":"35 x 45 mm (passport in Sri Lanka, UK, EU, Australia)", "51x51":"51 x 51 mm / 2 x 2 inch (USA, India passport)", "40x50":"40 x 50 mm", "30x40":"30 x 40 mm", "25x30":"25 x 30 mm (small ID or form photo)", "20x25":"20 x 25 mm", "custom":"Custom size..."};
function mountPassportPhoto(root){
  root.innerHTML = `${PL.PVCSS.replace(/\.pv-card\{[^}]*\}/, "")}
  <div class="card"><label for="f">1. Choose a photo of the face</label><input id="f" type="file" accept="image/*"><p id="info" class="hint">Use a clear, front-facing photo in good light with a plain background.</p></div>
  <div id="set" hidden>
    <div class="pv-grid"><div class="card"><label>2. Size of the photo</label>
        <select id="sz" aria-label="Size">${Object.entries(PP_SIZES).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select>
        <div class="row" id="cu" hidden style="margin-top:10px"><div><label for="cw" style="font-weight:600">Width (mm)</label><input id="cw" type="number" min="10" max="100" step="1" value="35"></div><div><label for="ch" style="font-weight:600">Height (mm)</label><input id="ch" type="number" min="10" max="100" step="1" value="45"></div></div>
        <div class="row" style="margin-top:12px"><div><label for="dp" style="font-weight:600">Sharpness</label><select id="dp"><option value="300" selected>300 dpi (print)</option><option value="200">200 dpi</option><option value="150">150 dpi (small file)</option><option value="600">600 dpi</option></select></div>
          <div><label for="mx" style="font-weight:600">File smaller than (KB, optional)</label><input id="mx" type="number" min="5" step="1" placeholder="e.g. 50"></div></div>
        <label style="display:flex;gap:8px;align-items:center;font-weight:600;margin:12px 0 0"><input id="gd" type="checkbox" checked> Show the face guide</label>
        <label for="zm" style="display:flex;justify-content:space-between;margin-top:12px">Zoom <span id="zv"></span></label><input id="zm" type="range" min="100" max="500" step="1" value="100" style="width:100%;accent-color:var(--acc)">
        <p class="hint">Drag the photo to move it. Put the face inside the oval, with the chin near the lower line. Use the zoom slider to make the face bigger or smaller.</p>
        <div class="row" style="margin-top:10px"><div><button id="go" type="button">Make the photo</button></div></div><div id="status" aria-live="polite"></div></div>
      <div class="card"><label>Preview</label><canvas id="vp" width="480" height="520" style="width:100%;height:auto;display:block;border-radius:10px;touch-action:none;cursor:grab"></canvas></div></div>
    <div class="card" id="sh" hidden><label>3. Print sheet (many copies on one page)</label>
      <div class="row"><div><label for="pa" style="font-weight:600">Paper</label><select id="pa"><option value="4x6">4 x 6 inch</option><option value="5x7">5 x 7 inch</option><option value="a4">A4</option></select></div><div><label for="nc" style="font-weight:600">Copies (empty = fill the page)</label><input id="nc" type="number" min="1" max="60" step="1"></div></div>
      <label style="display:flex;gap:8px;align-items:center;font-weight:600;margin:10px 0 0"><input id="cl" type="checkbox" checked> Thin cut lines</label>
      <div class="row" style="margin-top:12px"><div><button id="gs" type="button">Make the print sheet</button></div></div></div></div>${IL.resultCard}<div id="outs" hidden></div>`;
  let src = null, pz = null, name = "photo", photo = null;
  const MM = 25.4, fail = m => { $("status").className = "err"; $("status").textContent = m; };
  const dims = () => { const k = $("sz").value; $("cu").hidden = k !== "custom"; const [w, h] = k === "custom" ? [+$("cw").value || 35, +$("ch").value || 45] : k.split("x").map(Number); return {w, h}; };
  function reframe(){ if(!pz) return; const d = dims(); pz.setAspect(d.w / d.h); $("zm").value = 100; $("zv").textContent = "100%"; }
  ["sz", "cw", "ch"].forEach(k => { $(k).oninput = reframe; $(k).onchange = reframe; }); $("gd").onchange = () => pz && pz.setGuide($("gd").checked);
  $("zm").oninput = () => { if(pz){ pz.setZoom($("zm").value / 100); $("zv").textContent = $("zm").value + "%"; } };
  $("f").onchange = async e => {
    const file = e.target.files[0]; $("set").hidden = true; $("out").hidden = true; $("sh").hidden = true; if(!file) return; name = IL.base(file.name); $("info").className = "hint"; $("info").textContent = "Loading...";
    try{ src = await IL.load(file); $("set").hidden = false; const d = dims(); pz = IL.panZoom($("vp"), src, {aspect:d.w / d.h, guide:true, onZoom:z => { $("zm").value = Math.round(z * 100); $("zv").textContent = Math.round(z * 100) + "%"; }}); $("zv").textContent = "100%"; $("info").textContent = file.name + " (" + src.width + " x " + src.height + " px)"; }
    catch(err){ $("info").className = "hint err"; $("info").textContent = "Could not read this image. Try JPG or PNG."; }
  };
  $("go").onclick = async () => {
    if(!pz) return; $("status").className = ""; const d = dims(), dpi = +$("dp").value, ow = Math.round(d.w / MM * dpi), oh = Math.round(d.h / MM * dpi), mx = (+$("mx").value || 0) * 1024;
    try{
      const c = IL.flatten(pz.out(ow, oh), "#ffffff"); let blob = await IL.blob(c, "image/jpeg", .95), note = ow + " x " + oh + " px, " + d.w + " x " + d.h + " mm at " + dpi + " dpi";
      if(mx){ if(mx < 5120) return fail("Enter a size of at least 5 KB."); const r = await IL.fitToSize(c, "image/jpeg", mx); if(!r) return fail("Could not reach that file size."); blob = r.blob; if(r.w !== ow) note += ". The picture was made smaller to fit " + PL.sz(mx) + " (" + r.w + " x " + r.h + " px)."; }
      photo = {canvas:c, blob, d, dpi}; IL.show(blob, name + "_" + d.w + "x" + d.h + "mm.jpg", "Your photo is ready (" + PL.sz(blob.size) + ")", note); $("sh").hidden = false;
    }catch(err){ fail("Could not make the photo."); }
  };
  $("gs").onclick = async () => {
    if(!photo) return; const [pw, ph] = $("pa").value === "a4" ? [8.27, 11.69] : $("pa").value === "5x7" ? [5, 7] : [4, 6], dpi = photo.dpi, w = photo.d.w / MM * dpi, h = photo.d.h / MM * dpi, m = .1 * dpi, gap = .06 * dpi;
    const fit = (SW, SH) => { const c = Math.max(0, Math.floor((SW - 2 * m + gap) / (w + gap))), r = Math.max(0, Math.floor((SH - 2 * m + gap) / (h + gap))); return {c, r}; };
    let SW = pw * dpi, SH = ph * dpi, a = fit(SW, SH), b = fit(SH, SW); if(b.c * b.r > a.c * a.r){ [SW, SH] = [SH, SW]; a = b; } if(!a.c || !a.r) return fail("The photo is too big for this paper.");
    const want = Math.floor(+$("nc").value) || a.c * a.r, n = Math.min(want, a.c * a.r), sheet = document.createElement("canvas"); sheet.width = Math.round(SW); sheet.height = Math.round(SH); const g = sheet.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, SW, SH);
    const gw = a.c * w + (a.c - 1) * gap, x0 = (SW - gw) / 2, y0 = m; for(let i = 0; i < n; i++){ const x = x0 + (i % a.c) * (w + gap), y = y0 + Math.floor(i / a.c) * (h + gap); g.drawImage(photo.canvas, x, y, w, h); if($("cl").checked){ g.strokeStyle = "#999"; g.lineWidth = 1; g.strokeRect(x, y, w, h); } }
    const blob = await IL.blob(sheet, "image/jpeg", .93); IL.show(blob, name + "_print-sheet.jpg", n + " photos on one sheet (" + PL.sz(blob.size) + ")", "Print it at 100% size, with no scaling, on " + $("pa").selectedOptions[0].text + " paper.");
  };
  return IL.cleanup;
}
mountPassportPhoto(document.getElementById("tool"));
